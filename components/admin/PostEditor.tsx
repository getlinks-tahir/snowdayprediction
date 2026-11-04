"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ClipboardEvent as ReactPaste,
  type FormEvent,
  type KeyboardEvent as ReactKey,
  type ReactNode,
} from "react";
import PostSections from "@/components/PostSections";
import { checkSlugAvailable, savePost } from "@/lib/admin/actions";
import {
  audioEmbed,
  blocksToSectionInputs as convertBlocksToSectionInputs,
  countWords,
  createBlock,
  htmlDocument,
  isSafeMediaUrl,
  markdownToHtml,
  sectionsToBlocks,
  toPostSection,
  videoEmbedSrc,
  type ContentBlock,
  type EditorBlock,
  type HeadingLevel,
} from "@/lib/admin/blocks";
import type { PostSection } from "@/lib/admin/types";
import { uploadBlogImage } from "@/lib/admin/upload-actions";
import {
  estimateReadMinutes,
  formatPostDate,
  isValidDate,
  isValidImage,
  SLUG_RE,
  slugify,
  todayISO,
} from "@/lib/admin/validators";

export type SaveMode = "save" | "publish" | "unpublish";

export interface SectionInput {
  heading: string;
  paragraphs: string[];
  list: string[];
  callout: string;
}

export interface PostInput {
  id?: number;
  title: string;
  slug: string;
  description: string;
  date: string;
  updated: string;
  readMinutes: number;
  image: string;
  imageAlt: string;
  tags: string[];
  sections: SectionInput[];
}

/* ==========================================================================
   EMBEDDED STYLES (Blogger / WordPress / Google Docs Continuous Studio)
   ========================================================================== */
const EDITOR_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap");

:root {
  --a-danger: #dc2626;
  --a-danger-soft: rgba(220, 38, 38, 0.1);
  --a-ok: #16a34a;
  --a-warn: #b45309;
  --band-green: #16a34a;
  --band-yellow: #ca8a04;
}

.a-editor,
.a-be {
  --be-bg: #eef1f6;
  --be-sheet: #ffffff;
  --be-card: #ffffff;
  --be-sunk: #f5f7fa;
  --be-text: #141821;
  --be-muted: #5a6374;
  --be-faint: #949eae;
  --be-line: #e2e6ef;
  --be-line-strong: #cbd2e0;
  --be-primary: #2563eb;
  --be-primary-ink: #ffffff;
  --be-soft: rgba(37, 99, 235, 0.1);
  --be-selection: rgba(37, 99, 235, 0.16);
  --be-danger: #d12a38;
  --be-ok: #0f7a55;
  --be-warn: #a8680a;
  --be-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 12px 32px rgba(15, 23, 42, 0.06);
  --be-serif: "Source Serif 4", Charter, "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  --be-sans: Inter, "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
  --be-top: 0px;
}

.a-editor[data-be-theme="dark"],
.a-be[data-be-theme="dark"] {
  --be-bg: #0b0d12;
  --be-sheet: #12161f;
  --be-card: #171b25;
  --be-sunk: #1d222e;
  --be-text: #e9ecf2;
  --be-muted: #98a2b3;
  --be-faint: #646e80;
  --be-line: #252b38;
  --be-line-strong: #353d4e;
  --be-primary: #60a5fa;
  --be-primary-ink: #0a1224;
  --be-soft: rgba(96, 165, 250, 0.14);
  --be-selection: rgba(96, 165, 250, 0.22);
  --be-danger: #ff7a85;
  --be-ok: #4fd1a0;
  --be-warn: #e9b455;
  --be-shadow: 0 1px 3px rgba(0, 0, 0, 0.45), 0 14px 38px rgba(0, 0, 0, 0.38);
}

.a-editor {
  background: var(--be-bg);
  color: var(--be-text);
  font-family: var(--be-sans);
  border-radius: 20px;
  padding: 16px 20px 48px;
  display: grid;
  gap: 14px;
  border: 1px solid var(--be-line);
  min-height: 100vh;
}
.a-editor.is-focus {
  padding: 12px 24px 64px;
}
.a-editor *, .a-be * { box-sizing: border-box; }
.a-be { color: var(--be-text); }
.a-editor .sr-only {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

.a-icon { width: 18px; height: 18px; flex-shrink: 0; }
.a-icon-sm { width: 14px; height: 14px; }

/* ---------- Top Admin Bar ---------- */
.a-editor .a-editorbar {
  position: sticky;
  top: var(--be-top);
  z-index: 45;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 0;
  border-radius: 14px;
  border: 1px solid var(--be-line);
  background: color-mix(in srgb, var(--be-card) 92%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: var(--be-shadow);
}
.a-editor .a-editorbar-left,
.a-editor .a-editorbar-right { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.a-editor .a-savestate { font-size: 0.82rem; color: var(--be-muted); }
.a-editor .a-savestate.is-dirty { color: var(--be-warn); font-weight: 600; }

.a-badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
  border-radius: 999px; font-size: 0.76rem; font-weight: 800; letter-spacing: 0.02em; white-space: nowrap;
}
.a-badge::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.a-badge-live { background: rgba(22, 163, 74, 0.16); color: #22c55e; }
.a-badge-draft { background: rgba(202, 138, 4, 0.18); color: #eab308; }

.a-editor .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 13px;
  border-radius: 10px;
  border: 1px solid var(--be-line-strong);
  background: var(--be-card);
  color: var(--be-text);
  font: 600 0.84rem/1 var(--be-sans);
  text-decoration: none;
  box-shadow: none;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.a-editor .btn:hover:not(:disabled) { background: var(--be-sunk); }
.a-editor .btn[aria-pressed="true"] { background: var(--be-soft); border-color: var(--be-primary); color: var(--be-primary); }
.a-editor .btn:disabled { opacity: 0.5; cursor: not-allowed; }
.a-editor .btn svg { width: 16px; height: 16px; flex: none; }
.a-editor .btn-primary { background: var(--be-primary); border-color: var(--be-primary); color: var(--be-primary-ink); }
.a-editor .btn-primary:hover:not(:disabled) { background: var(--be-primary); filter: brightness(1.08); }
.a-editor .btn-danger { background: var(--be-danger); border-color: var(--be-danger); color: #fff; }
.a-editor .btn:focus-visible,
.a-editor button:focus-visible,
.a-editor input:focus-visible,
.a-editor textarea:focus-visible { outline: 2px solid var(--be-primary); outline-offset: 2px; }

.a-editor .error-box {
  display: flex; gap: 10px; padding: 12px 14px; border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--be-danger) 45%, transparent);
  background: color-mix(in srgb, var(--be-danger) 9%, var(--be-card));
  color: var(--be-text);
}
.a-editor .error-box ul { margin: 4px 0 0; padding-left: 18px; }

/* ---------- Subbar (Write / Preview tabs) ---------- */
.a-editor-subbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.a-editor .a-tabs {
  display: inline-flex;
  padding: 3px;
  margin: 0;
  border-radius: 11px;
  background: var(--be-card);
  border: 1px solid var(--be-line);
}
.a-editor .a-tabs button {
  border: 0; background: transparent; color: var(--be-muted);
  font: 600 0.84rem var(--be-sans); padding: 6px 15px; border-radius: 8px; cursor: pointer;
}
.a-editor .a-tabs button[aria-selected="true"] { background: var(--be-primary); color: var(--be-primary-ink); }

/* ---------- Layout Grid ---------- */
.a-editor .a-editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 20px;
  align-items: start;
}
.a-editor .a-editor-grid.is-solo {
  grid-template-columns: minmax(0, 1fr);
}
.a-editor .a-col-main { min-width: 0; }
.a-editor .a-col-side {
  display: grid;
  gap: 12px;
  position: sticky;
  top: calc(var(--be-top) + 68px);
  max-height: calc(100vh - var(--be-top) - 84px);
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
}

/* ---------- The Writing Sheet ---------- */
.a-editor .a-sheet {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  background: var(--be-sheet);
  border: 1px solid var(--be-line);
  border-radius: 16px;
  box-shadow: var(--be-shadow);
  padding: 0 0 36px;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
}
.a-editor .is-solo .a-sheet {
  max-width: 1060px;
}
.a-sheet-inner {
  padding: 24px 56px 8px;
}
.a-editor .is-solo .a-sheet-inner {
  padding: 32px 72px 12px;
}

.a-cover-wrap {
  padding: 20px 56px 0;
}
.a-editor .is-solo .a-cover-wrap {
  padding: 24px 72px 0;
}
.a-cover-toggle-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 56px 0;
}
.a-editor .is-solo .a-cover-toggle-bar {
  padding: 18px 72px 0;
}

/* ---------- Sticky Top Formatting Toolbar ---------- */
.a-be-toolbar {
  position: sticky;
  top: calc(var(--be-top) + 58px);
  z-index: 38;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  padding: 8px 14px;
  background: color-mix(in srgb, var(--be-card) 96%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--be-line);
  border-radius: 16px 16px 0 0;
}
.a-be-toolbar-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.a-be-toolbar-sep {
  width: 1px;
  height: 20px;
  background: var(--be-line-strong);
  margin: 0 5px;
  flex-shrink: 0;
}
.a-be-tbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 32px;
  min-width: 32px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--be-text);
  font: 600 0.81rem/1 var(--be-sans);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.a-be-tbtn svg { width: 16px; height: 16px; flex-shrink: 0; }
.a-be-tbtn:hover:not(:disabled) {
  background: var(--be-sunk);
  color: var(--be-primary);
}
.a-be-tbtn.is-active {
  background: var(--be-soft);
  color: var(--be-primary);
  border-color: color-mix(in srgb, var(--be-primary) 30%, transparent);
}
.a-be-tbtn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
.a-be-tbtn-insert {
  background: var(--be-soft);
  color: var(--be-primary);
  border-color: color-mix(in srgb, var(--be-primary) 28%, transparent);
  padding: 0 10px;
  font-weight: 650;
}
.a-be-tbtn-insert:hover:not(:disabled) {
  background: var(--be-primary);
  color: var(--be-primary-ink);
}
.a-be-block-select {
  height: 32px;
  padding: 0 24px 0 10px;
  border-radius: 7px;
  border: 1px solid var(--be-line-strong);
  background: var(--be-sunk);
  color: var(--be-text);
  font: 600 0.82rem var(--be-sans);
  cursor: pointer;
  outline: none;
}
.a-be-block-select:focus {
  border-color: var(--be-primary);
}

/* ---------- Continuous Document Writing Surface ---------- */
.a-be-doc {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px 56px 40px;
  cursor: text;
}
.a-editor .is-solo .a-be-doc {
  padding: 16px 72px 56px;
}

.a-be-flow {
  outline: none;
  min-height: 420px;
  font-family: var(--be-serif);
  font-size: 1.18rem;
  line-height: 1.8;
  color: var(--be-text);
  caret-color: var(--be-primary);
  overflow-wrap: anywhere;
  word-break: break-word;
}
.a-be-flow.is-compact {
  min-height: 64px;
}
.a-be-flow:empty::before,
.a-be-flow:has(> p:only-child:empty)::before,
.a-be-flow:has(> p:only-child > br:only-child)::before {
  content: attr(data-placeholder);
  color: var(--be-faint);
  pointer-events: none;
  display: block;
}

.a-be-flow p,
.a-be-flow div:not([data-callout]) {
  margin: 0 0 1.05em;
  min-height: 1.75em;
}
.a-be-flow h1,
.a-be-flow h2,
.a-be-flow h3 {
  font-family: var(--be-sans);
  font-weight: 700;
  color: var(--be-text);
  margin: 1.4em 0 0.45em;
}
.a-be-flow > :first-child:is(h1, h2, h3, p) {
  margin-top: 0.2em;
}
.a-be-flow h1 {
  font-size: clamp(1.75rem, 3vw, 2.15rem);
  line-height: 1.25;
  letter-spacing: -0.025em;
}
.a-be-flow h2 {
  font-size: clamp(1.42rem, 2.4vw, 1.7rem);
  line-height: 1.3;
  letter-spacing: -0.02em;
}
.a-be-flow h3 {
  font-size: clamp(1.18rem, 2vw, 1.35rem);
  line-height: 1.35;
  letter-spacing: -0.01em;
}
.a-be-flow ul,
.a-be-flow ol {
  margin: 0.4em 0 1.15em;
  padding-left: 1.65em;
}
.a-be-flow ul { list-style-type: disc; }
.a-be-flow ol { list-style-type: decimal; }
.a-be-flow li {
  margin: 0.3em 0;
  line-height: 1.75;
}
.a-be-flow li > ul,
.a-be-flow li > ol {
  margin: 0.25em 0 0.25em;
}
.a-be-flow blockquote {
  margin: 1.1em 0;
  border-left: 3.5px solid var(--be-primary);
  padding: 4px 0 4px 20px;
  font-style: italic;
  font-size: 1.2rem;
  line-height: 1.65;
  color: color-mix(in srgb, var(--be-text) 88%, var(--be-muted));
}
.a-be-flow div[data-callout="true"] {
  margin: 1.1em 0;
  background: var(--be-soft);
  border: 1px solid color-mix(in srgb, var(--be-primary) 28%, transparent);
  border-radius: 12px;
  padding: 14px 18px;
  font-family: var(--be-sans);
  font-size: 1.02rem;
  line-height: 1.65;
}
.a-be-flow hr {
  border: 0;
  height: 1px;
  background: var(--be-line-strong);
  margin: 26px 0;
}

.a-be-flow b, .a-be-flow strong { font-weight: 700; }
.a-be-flow i, .a-be-flow em { font-style: italic; }
.a-be-flow u { text-decoration: underline; text-underline-offset: 3px; }
.a-be-flow s, .a-be-flow strike { text-decoration: line-through; color: var(--be-muted); }
.a-be-flow code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: var(--be-sunk);
  padding: 2px 6px;
  border-radius: 5px;
  font-size: 0.88em;
  color: var(--be-danger);
  border: 1px solid var(--be-line);
}
.a-be-flow a {
  color: var(--be-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.a-be-flow a:hover {
  color: color-mix(in srgb, var(--be-primary) 80%, var(--be-text));
}

/* ---------- Embedded Media / HTML / Table Widgets ---------- */
.a-be-widget {
  position: relative;
  margin: 14px 0;
}
.a-be-widget-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.a-be-widget-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.a-be-tool {
  width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--be-line); background: var(--be-card);
  color: var(--be-muted); display: grid; place-items: center; padding: 0; cursor: pointer;
}
.a-be-tool svg { width: 15px; height: 15px; }
.a-be-tool:hover:not(:disabled) { color: var(--be-text); background: var(--be-sunk); }
.a-be-tool:disabled { opacity: 0.35; cursor: default; }
.a-be-tool.danger:hover { color: var(--be-danger); border-color: var(--be-danger); background: color-mix(in srgb, var(--be-danger) 10%, transparent); }

/* ---------- Sidebar Cards ---------- */
.a-editor .glass.a-card,
.a-editor .a-card {
  background: var(--be-card);
  border: 1px solid var(--be-line);
  border-radius: 16px;
  box-shadow: none;
  backdrop-filter: none;
  padding: 16px;
  display: grid;
  gap: 12px;
  color: var(--be-text);
}
.a-editor .a-card h3 { margin: 0; font: 700 0.95rem var(--be-sans); letter-spacing: 0; text-transform: none; color: var(--be-text); }
.a-editor .a-field { display: grid; gap: 6px; margin-bottom: 0; }
.a-editor .a-label { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font: 600 0.82rem var(--be-sans); color: var(--be-text); }
.a-editor .a-label em { font-style: normal; font-weight: 500; color: var(--be-muted); }
.a-editor .a-counter { font-weight: 500; font-size: 0.74rem; color: var(--be-muted); }
.a-editor .a-counter.is-good { color: var(--be-ok); }
.a-editor .a-counter.is-warn { color: var(--be-warn); }
.a-editor .a-hint { margin: 0; font-size: 0.78rem; line-height: 1.45; color: var(--be-muted); }
.a-editor .a-error { margin: 0; font-size: 0.8rem; color: var(--be-danger); font-weight: 600; }
.a-editor .a-ok { font-size: 0.8rem; color: var(--be-ok); font-weight: 600; }
.a-editor .a-input {
  width: 100%;
  border: 1px solid var(--be-line-strong);
  background: var(--be-sunk);
  color: var(--be-text);
  border-radius: 10px;
  padding: 9px 11px;
  font: 400 0.9rem/1.4 var(--be-sans);
  outline: none;
}
.a-editor .a-input:focus { border-color: var(--be-primary); background: var(--be-card); }
.a-editor .a-input[aria-invalid="true"] { border-color: var(--be-danger); }
.a-editor .a-input:disabled, .a-editor .a-input[readonly] { opacity: 0.7; }
.a-editor .a-textarea { resize: vertical; min-height: 64px; }
.a-editor .a-inline { display: flex; align-items: center; gap: 8px; }
.a-editor .a-slug { display: flex; align-items: center; gap: 6px; }
.a-editor .a-slug-prefix { color: var(--be-muted); font-size: 0.85rem; white-space: nowrap; }
.a-editor .a-check { display: inline-flex; align-items: center; gap: 6px; font-size: 0.84rem; white-space: nowrap; }
.a-editor .a-checklist { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.a-editor .a-checklist li { display: flex; align-items: center; gap: 10px; font-size: 0.86rem; color: var(--be-muted); }
.a-editor .a-checklist li[data-ok="true"] { color: var(--be-text); }
.a-editor .a-checkmark {
  width: 18px; height: 18px; border-radius: 999px; flex: none;
  border: 1.5px solid var(--be-line-strong); display: grid; place-items: center;
}
.a-editor .a-checklist li[data-ok="true"] .a-checkmark { background: var(--be-ok); border-color: var(--be-ok); color: #fff; }
.a-editor .a-checkmark svg { width: 12px; height: 12px; }
.a-editor .a-preview { max-width: 920px; margin: 0 auto; width: 100%; padding: 36px 48px; background: var(--be-sheet); color: var(--be-text); }
.a-editor .a-preview .prose { font-family: var(--be-serif); line-height: 1.78; font-size: 1.12rem; }
.a-editor .a-preview .prose h1, .a-editor .a-preview .prose h2, .a-editor .a-preview .prose h3 { font-family: var(--be-sans); }
.a-editor .a-preview .prose a { color: var(--be-primary); text-decoration: underline; }
.a-editor .a-preview .prose .callout { background: var(--be-soft); border: 1px solid color-mix(in srgb, var(--be-primary) 28%, transparent); padding: 14px 18px; border-radius: 12px; font-family: var(--be-sans); }

/* Tags & Snippet */
.a-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px; border: 1px solid var(--be-line-strong); border-radius: 10px; background: var(--be-sunk); }
.a-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px 3px 10px; border-radius: 999px; background: var(--be-soft); font-size: 0.82rem; font-weight: 600; color: var(--be-text); }
.a-tag button { display: grid; place-items: center; width: 18px; height: 18px; border: 0; border-radius: 50%; background: transparent; color: var(--be-muted); cursor: pointer; }
.a-tag-input { flex: 1; min-width: 110px; border: 0; outline: none; background: transparent; font: inherit; font-size: 0.88rem; color: var(--be-text); padding: 2px 4px; }

.a-snippet { padding: 12px 14px; border: 1px dashed var(--be-line-strong); border-radius: 10px; background: var(--be-sunk); display: grid; gap: 3px; }
.a-snippet-url { font-size: 0.76rem; color: var(--be-muted); }
.a-snippet-title { font-size: 1.05rem; color: var(--be-primary); font-weight: 600; line-height: 1.3; }
.a-snippet-desc { font-size: 0.84rem; color: var(--be-muted); line-height: 1.45; }

/* ---------- Post Title ---------- */
.a-editor .a-titlefield {
  margin: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--be-line);
}
.a-be-title {
  display: block;
  width: 100%;
  border: 0;
  resize: none;
  overflow: hidden;
  background: transparent;
  color: var(--be-text);
  font-family: var(--be-serif);
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.15;
  padding: 0;
  margin: 6px 0 4px;
  outline: none !important;
}
.a-be-title::placeholder { color: var(--be-faint); font-weight: 600; }

/* ---------- Image Picker ---------- */
.a-be-pick { display: grid; gap: 8px; }
.a-be-drop {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 14px;
  overflow: hidden;
  border: 1.5px dashed var(--be-line-strong);
  background: var(--be-sunk);
  transition: border-color 0.15s, background 0.15s;
}
.a-be-drop.has-img { border-style: solid; border-color: var(--be-line); }
.a-be-drop.is-drag { border-color: var(--be-primary); background: var(--be-soft); }
.a-be-drop img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.a-be-drop-empty {
  position: absolute; inset: 0; width: 100%; height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  padding: 16px; text-align: center; border: 0; background: transparent; color: var(--be-muted);
  font: 400 0.84rem/1.45 var(--be-sans); cursor: pointer;
}
.a-be-drop-empty strong { color: var(--be-text); font-weight: 650; font-size: 0.95rem; }
.a-be-drop-empty span { max-width: 340px; }
.a-be-drop-empty:hover { color: var(--be-text); }
.a-be-drop-empty:hover svg { color: var(--be-primary); }
.a-be-drop-actions {
  position: absolute; right: 10px; top: 10px; display: flex; gap: 6px;
  opacity: 0; transition: opacity 0.15s;
}
.a-be-drop:hover .a-be-drop-actions,
.a-be-drop:focus-within .a-be-drop-actions { opacity: 1; }
@media (hover: none) { .a-be-drop-actions { opacity: 1; } }
.a-be-drop-busy {
  position: absolute; inset: 0; display: grid; place-items: center;
  background: color-mix(in srgb, var(--be-sheet) 78%, transparent);
  font: 600 0.85rem var(--be-sans); color: var(--be-text);
}
.a-be-pick.is-cover .a-be-drop { max-height: 300px; }
.a-be-pick.is-compact .a-be-drop { border-radius: 10px; }
.a-be-pick.is-compact .a-be-drop-empty { gap: 4px; font-size: 0.78rem; }
.a-be-pick-link { display: grid; gap: 6px; }

.a-be-chip {
  display: inline-flex; align-items: center; gap: 5px;
  height: 28px; padding: 0 10px; border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--be-line-strong) 70%, transparent);
  background: color-mix(in srgb, var(--be-card) 92%, transparent);
  backdrop-filter: blur(6px);
  color: var(--be-text); font: 600 0.78rem var(--be-sans); cursor: pointer;
}
.a-be-chip svg { width: 14px; height: 14px; }
.a-be-chip:hover { background: var(--be-card); border-color: var(--be-primary); color: var(--be-primary); }
.a-be-chips { display: flex; flex-wrap: wrap; gap: 6px; }

.a-be-words {
  position: sticky; bottom: 12px; z-index: 4;
  display: flex; justify-content: flex-end; gap: 6px;
  padding: 0 24px;
  font: 500 0.78rem var(--be-sans); color: var(--be-muted);
  pointer-events: none;
}
.a-be-words > span:not([aria-hidden]) {
  background: color-mix(in srgb, var(--be-card) 92%, transparent);
  border: 1px solid var(--be-line); border-radius: 999px; padding: 4px 11px;
  backdrop-filter: blur(8px);
}
.a-be-words > span[aria-hidden] { display: none; }

/* ---------- Cards for Media / HTML / Table Widgets ---------- */
.a-be-card {
  border: 1px solid var(--be-line-strong);
  border-radius: 14px;
  padding: 14px 16px;
  background: var(--be-card);
  display: grid;
  gap: 10px;
}
.a-be-card-head, .a-be-inline { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.a-be-inline > .a-be-field { flex: 1 1 200px; width: auto; }
.a-be-kicker { font: 650 0.8rem var(--be-sans); color: var(--be-muted); }
.a-be-card-head .a-be-kicker { margin-right: auto; }
.a-be-field, .a-be-area {
  width: 100%;
  border: 1px solid var(--be-line-strong);
  background: var(--be-sunk);
  color: var(--be-text);
  border-radius: 10px;
  padding: 9px 11px;
  font: 400 0.9rem/1.4 var(--be-sans);
  outline: none;
}
.a-be-field:focus, .a-be-area:focus { border-color: var(--be-primary); background: var(--be-card); }
.a-be-lang { max-width: 180px; }
.a-be-area { min-height: 110px; max-height: 65vh; overflow: auto; resize: vertical; line-height: 1.55; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.86rem; }
.a-be-note { margin: 0; font-size: 0.78rem; color: var(--be-muted); line-height: 1.45; }
.a-be-note.is-error { color: var(--be-danger); font-weight: 600; }
.a-be-linkish {
  display: inline-flex; align-items: center; gap: 6px; justify-self: start;
  border: 0; background: none; color: var(--be-primary);
  font: 600 0.81rem var(--be-sans); padding: 2px 0; cursor: pointer;
}
.a-be-linkish svg { width: 14px; height: 14px; }
.a-be-linkish:hover { text-decoration: underline; }
.a-be-linkish.is-danger { color: var(--be-danger); }

.a-be-tabs { display: inline-flex; padding: 3px; border-radius: 10px; background: var(--be-sunk); border: 1px solid var(--be-line); }
.a-be-tabs button {
  border: 0; background: transparent; color: var(--be-muted);
  font: 600 0.78rem var(--be-sans); padding: 5px 11px; border-radius: 8px; cursor: pointer;
}
.a-be-tabs button[aria-selected="true"] { background: var(--be-card); color: var(--be-text); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }
.a-be-frame { display: block; width: 100%; min-height: 48px; border: 1px solid var(--be-line); border-radius: 12px; background: #fff; }
.a-be-ratio { position: relative; padding-top: 56.25%; }
.a-be-ratio iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; border-radius: 10px; }

.a-be-gal { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.a-be-gal-item { display: grid; gap: 8px; align-content: start; }
.a-be-gal-add {
  aspect-ratio: 16 / 9; align-self: start;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  border: 1.5px dashed var(--be-line-strong); border-radius: 10px; background: transparent;
  color: var(--be-muted); font: 600 0.82rem var(--be-sans); cursor: pointer;
}
.a-be-gal-add:hover { color: var(--be-primary); border-color: var(--be-primary); background: var(--be-soft); }

.a-be-table-wrap { overflow-x: auto; border: 1px solid var(--be-line); border-radius: 10px; }
.a-be-table { width: 100%; border-collapse: collapse; }
.a-be-table th, .a-be-table td { border: 1px solid var(--be-line); padding: 0; }
.a-be-table tr:first-child > * { border-top: 0; }
.a-be-table tr > :first-child { border-left: 0; }
.a-be-table tr > :last-child { border-right: 0; }
.a-be-table tr:last-child > * { border-bottom: 0; }
.a-be-table th { background: var(--be-sunk); }
.a-be-table input {
  width: 100%; min-width: 96px; border: 0; background: transparent; color: var(--be-text);
  font: 400 0.9rem var(--be-sans); padding: 9px 11px; outline: none;
}
.a-be-table input:focus { background: var(--be-soft); }
.a-be-table th input { font-weight: 700; }

.a-be-btn-preview {
  display: inline-flex; align-items: center; min-height: 42px; padding: 0 20px; border-radius: 999px;
  background: var(--be-primary); color: var(--be-primary-ink); font: 700 0.92rem var(--be-sans);
}

.a-be-convert {
  height: 28px; padding: 0 12px; border-radius: 8px; border: 0; cursor: pointer;
  background: var(--be-primary); color: var(--be-primary-ink); font: 650 0.78rem var(--be-sans);
}
.a-be-convert:hover:not(:disabled) { filter: brightness(1.08); }
.a-be-convert:disabled { opacity: 0.45; cursor: default; }
.a-be-html-out {
  margin: 4px 0 0;
  padding: 12px 14px;
  border: 1px solid var(--be-line);
  border-radius: 10px;
  background: var(--be-sheet);
  height: auto;
  min-height: 0;
}

/* ---------- Insert Dropdown Menu ---------- */
.a-be-menu {
  position: fixed;
  z-index: 90;
  width: min(280px, calc(100vw - 20px));
  max-height: min(420px, 72vh);
  overflow: auto;
  padding: 6px;
  border-radius: 14px;
  border: 1px solid var(--be-line-strong);
  background: var(--be-card);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
  font-family: var(--be-sans);
}
.a-be-menu-label { margin: 6px 10px 4px; font: 650 0.74rem var(--be-sans); color: var(--be-muted); }
.a-be-menu-item {
  width: 100%; display: flex; align-items: center; gap: 10px; text-align: left;
  border: 0; background: transparent; color: var(--be-text);
  font: 500 0.88rem var(--be-sans); padding: 8px 10px; border-radius: 9px; min-height: 36px; cursor: pointer;
}
.a-be-menu-item svg { flex: none; width: 18px; height: 18px; color: var(--be-muted); }
.a-be-menu-item:hover { background: var(--be-soft); }
.a-be-menu-item:hover svg { color: var(--be-primary); }

/* ---------- Hyperlink Popover ---------- */
.a-be-bubble-link {
  position: fixed;
  z-index: 105;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--be-card);
  border: 1px solid var(--be-line-strong);
  border-radius: 11px;
  box-shadow: 0 14px 36px rgba(16, 24, 40, 0.22);
  min-width: 320px;
  transform: translateX(-50%);
  font-family: var(--be-sans);
}
.a-be-bubble-link input {
  flex: 1; border: 1px solid var(--be-line-strong); background: var(--be-sunk); color: var(--be-text);
  border-radius: 8px; padding: 7px 10px; font: 400 0.88rem var(--be-sans); outline: none;
}
.a-be-bubble-link input:focus { border-color: var(--be-primary); background: var(--be-card); }
.a-be-bubble-link button {
  padding: 0 12px; height: 34px; border: 0; background: var(--be-primary); color: var(--be-primary-ink);
  border-radius: 8px; font: 600 0.82rem var(--be-sans); cursor: pointer;
}
.a-be-bubble-link button.is-danger {
  background: transparent; color: var(--be-danger); border: 1px solid var(--be-line-strong);
}

/* ---------- Dialog & Toasts ---------- */
.a-dialog { border: 1px solid var(--be-line-strong); border-radius: 20px; padding: 0; background: var(--be-card); color: var(--be-text); box-shadow: var(--be-shadow); width: min(92vw, 440px); }
.a-dialog::backdrop { background: rgba(2, 6, 23, 0.55); backdrop-filter: blur(3px); }
.a-dialog-body { padding: 24px; }
.a-dialog-body h2 { font-size: 1.25rem; margin: 0 0 10px; }
.a-dialog-text p { margin: 0; }
.a-dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

.a-toasts { position: fixed; right: 16px; bottom: 16px; z-index: 120; display: grid; gap: 8px; width: min(92vw, 380px); }
.a-toast { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 14px; background: var(--be-card); border: 1px solid var(--be-line-strong); box-shadow: var(--be-shadow); font-size: 0.9rem; color: var(--be-text); }
.a-toast span { flex: 1; }
.a-toast-success svg { color: var(--be-ok); }
.a-toast-error { border-color: var(--be-danger); }
.a-toast-error svg { color: var(--be-danger); }
.a-toast-x { border: 0; background: none; color: var(--be-muted); cursor: pointer; padding: 0; display: grid; }

@media (max-width: 1140px) {
  .a-editor .a-editor-grid { grid-template-columns: minmax(0, 1fr); }
  .a-editor .a-col-side { position: static; max-height: none; overflow: visible; }
}
@media (max-width: 760px) {
  .a-editor { padding: 10px 10px 32px; border-radius: 14px; }
  .a-sheet-inner, .a-editor .is-solo .a-sheet-inner { padding: 18px 18px 8px; }
  .a-cover-wrap, .a-editor .is-solo .a-cover-wrap, .a-cover-toggle-bar, .a-editor .is-solo .a-cover-toggle-bar { padding: 14px 18px 0; }
  .a-be-doc, .a-editor .is-solo .a-be-doc { padding: 12px 18px 28px; }
  .a-be-flow { font-size: 1.08rem; }
  .a-editor .a-editorbar { position: static; }
  .a-be-toolbar { top: 0; border-radius: 14px 14px 0 0; }
}
`;

export interface EditorInitial {
  id: number;
  title: string;
  slug: string;
  description: string;
  date: string;
  updated: string;
  readMinutes: number;
  image: string;
  imageAlt: string;
  tags: string[];
  sections: PostSection[];
  published: boolean;
}

const UNSAVED_MESSAGE = "You have unsaved changes. Are you sure you want to leave?";

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, " ")
    .trim();
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeHref(rawHref: string): string {
  let href = rawHref.trim();
  if (!href) return "";
  try {
    const parsed = new URL(href, "https://example.com");
    if ((parsed.hostname === "www.google.com" || parsed.hostname === "google.com") && parsed.pathname === "/url") {
      const q = parsed.searchParams.get("q") || parsed.searchParams.get("url");
      if (q) href = q.trim();
    }
  } catch { /* ignore */ }

  if (/^(javascript|vbscript|data):/i.test(href)) return "";
  if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href) && /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(href)) {
    href = `https://${href}`;
  }
  return href;
}

export function sanitizeInlineHtml(dirtyHtml: string): string {
  if (!dirtyHtml || !dirtyHtml.trim()) return "";
  if (typeof DOMParser === "undefined") return dirtyHtml;

  const doc = new DOMParser().parseFromString(`<div>${dirtyHtml}</div>`, "text/html");
  const root = doc.body.firstElementChild ?? doc.body;

  function serializeNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml((node.textContent ?? "").replace(/\u00a0/g, " "));
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "br") return "<br>";
    if (tag === "script" || tag === "style" || tag === "meta" || tag === "link") return "";

    const styleAttr = (el.getAttribute("style") ?? "").toLowerCase();
    const isNormalWeightB =
      (tag === "b" || tag === "strong") && /font-weight\s*:\s*(normal|400)\b/.test(styleAttr);

    const childrenHtml = Array.from(el.childNodes).map(serializeNode).join("");
    if (!childrenHtml) return "";

    if (tag === "span" || tag === "font" || isNormalWeightB) {
      let out = childrenHtml;
      if (!isNormalWeightB && /font-weight\s*:\s*(bold|[6-9]00)\b/.test(styleAttr)) {
        out = `<b>${out}</b>`;
      }
      if (/font-style\s*:\s*italic\b/.test(styleAttr)) {
        out = `<i>${out}</i>`;
      }
      if (/text-decoration(-line)?\s*:[^;]*underline\b/.test(styleAttr) && el.closest("a") === null) {
        out = `<u>${out}</u>`;
      }
      if (/text-decoration(-line)?\s*:[^;]*line-through\b/.test(styleAttr)) {
        out = `<s>${out}</s>`;
      }
      return out;
    }

    if (tag === "b" || tag === "strong") return `<b>${childrenHtml}</b>`;
    if (tag === "i" || tag === "em") return `<i>${childrenHtml}</i>`;
    if (tag === "u") return el.closest("a") ? childrenHtml : `<u>${childrenHtml}</u>`;
    if (tag === "s" || tag === "strike" || tag === "del") return `<s>${childrenHtml}</s>`;
    if (tag === "code") return `<code>${escapeHtml(el.textContent ?? "")}</code>`;

    if (tag === "a") {
      const href = normalizeHref(el.getAttribute("href") ?? "");
      const cleanLabel = childrenHtml.replace(/<\/?u>/gi, "").trim() || escapeHtml(el.textContent?.trim() ?? "");
      if (!href) return cleanLabel;
      return `<a href="${escapeHtml(href)}">${cleanLabel}</a>`;
    }

    return childrenHtml;
  }

  return Array.from(root.childNodes)
    .map(serializeNode)
    .join("")
    .replace(/^(<br\s*\/?>\s*)+|(\s*<br\s*\/?>)+$/gi, "")
    .trim();
}

function inlineMarkdownToHtml(text: string): string {
  let out = escapeHtml(text.trim());
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const href = normalizeHref(url);
    return href ? `<a href="${escapeHtml(href)}">${label}</a>` : label;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  out = out.replace(/(^|[\s(])\*([^*]+)\*(?=[\s).,!?:;]|$)/g, "$1<i>$2</i>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

/* ==========================================================================
   CONTINUOUS RICH-TEXT FLOW <-> BLOCKS CONVERTER
   ========================================================================== */
type FlowBlockType =
  | "paragraph"
  | "heading"
  | "bulletList"
  | "numberedList"
  | "quote"
  | "callout"
  | "divider";

const FLOW_TYPES = new Set<ContentBlock["type"]>([
  "paragraph",
  "heading",
  "bulletList",
  "numberedList",
  "quote",
  "callout",
  "divider",
]);

export function isFlowBlock(b: EditorBlock): boolean {
  return FLOW_TYPES.has(b.type);
}

function flowBlocksToHtml(blocks: EditorBlock[]): string {
  if (!blocks.length) return "<p><br></p>";
  const parts: string[] = [];

  for (const b of blocks) {
    switch (b.type) {
      case "paragraph": {
        const cleaned = sanitizeInlineHtml(b.text);
        parts.push(`<p data-bid="${b.id}">${cleaned || "<br>"}</p>`);
        break;
      }
      case "heading": {
        const cleaned = sanitizeInlineHtml(b.text);
        const tag = b.level === 1 ? "h1" : b.level === 3 ? "h3" : "h2";
        parts.push(`<${tag} data-bid="${b.id}">${cleaned || "<br>"}</${tag}>`);
        break;
      }
      case "quote": {
        const cleaned = sanitizeInlineHtml(b.text);
        parts.push(`<blockquote data-bid="${b.id}">${cleaned || "<br>"}</blockquote>`);
        break;
      }
      case "callout": {
        const cleaned = sanitizeInlineHtml(b.text);
        parts.push(`<div data-callout="true" data-bid="${b.id}">${cleaned || "<br>"}</div>`);
        break;
      }
      case "bulletList": {
        const items = b.items.length ? b.items : [""];
        const lis = items.map((it) => `<li>${sanitizeInlineHtml(it) || "<br>"}</li>`).join("");
        parts.push(`<ul data-bid="${b.id}">${lis}</ul>`);
        break;
      }
      case "numberedList": {
        const items = b.items.length ? b.items : [""];
        const lis = items.map((it) => `<li>${sanitizeInlineHtml(it) || "<br>"}</li>`).join("");
        parts.push(`<ol data-bid="${b.id}">${lis}</ol>`);
        break;
      }
      case "divider": {
        parts.push(`<hr data-bid="${b.id}">`);
        break;
      }
      default:
        break;
    }
  }

  return parts.join("") || "<p><br></p>";
}

function parseFlowDomToBlocks(root: HTMLElement): EditorBlock[] {
  const out: EditorBlock[] = [];
  const usedIds = new Set<string>();

  const claimId = (el: HTMLElement | null, type: FlowBlockType, level?: HeadingLevel): EditorBlock => {
    const attrId = el?.getAttribute("data-bid");
    const fresh = createBlock(type, level) as EditorBlock;
    if (attrId && !usedIds.has(attrId)) {
      usedIds.add(attrId);
      return { ...fresh, id: attrId };
    }
    usedIds.add(fresh.id);
    if (el) el.setAttribute("data-bid", fresh.id);
    return fresh;
  };

  const extractListItems = (listEl: HTMLElement): string[] => {
    const items: string[] = [];
    for (const child of Array.from(listEl.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === "li") {
        const clone = child.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("ul, ol").forEach((n) => n.remove());
        const itemHtml = sanitizeInlineHtml(clone.innerHTML);
        items.push(itemHtml);
        for (const nested of Array.from(child.children)) {
          const nt = nested.tagName.toLowerCase();
          if (nt === "ul" || nt === "ol") {
            items.push(...extractListItems(nested as HTMLElement));
          }
        }
      } else if (tag === "ul" || tag === "ol") {
        items.push(...extractListItems(child as HTMLElement));
      }
    }
    return items.length ? items : [""];
  };

  const walkChildren = (container: ParentNode) => {
    let inlineAcc = "";
    const flushInline = () => {
      const cleaned = sanitizeInlineHtml(inlineAcc);
      if (stripHtml(cleaned)) {
        const blk = claimId(null, "paragraph");
        out.push({ ...blk, type: "paragraph", text: cleaned } as EditorBlock);
      }
      inlineAcc = "";
    };

    for (const node of Array.from(container.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const txt = node.textContent ?? "";
        if (txt.trim()) inlineAcc += escapeHtml(txt);
        else if (inlineAcc) inlineAcc += " ";
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === "br") {
        flushInline();
        continue;
      }

      if (/^h[1-6]$/.test(tag)) {
        flushInline();
        const num = Number.parseInt(tag[1], 10);
        const level: HeadingLevel = num === 1 ? 1 : num === 2 ? 2 : 3;
        const blk = claimId(el, "heading", level);
        out.push({
          ...blk,
          type: "heading",
          level,
          text: sanitizeInlineHtml(el.innerHTML),
        } as EditorBlock);
        continue;
      }

      if (tag === "ul" || tag === "ol") {
        flushInline();
        const listType = tag === "ol" ? "numberedList" : "bulletList";
        const blk = claimId(el, listType);
        out.push({
          ...blk,
          type: listType,
          items: extractListItems(el),
        } as EditorBlock);
        continue;
      }

      if (tag === "blockquote") {
        flushInline();
        const blk = claimId(el, "quote");
        out.push({
          ...blk,
          type: "quote",
          text: sanitizeInlineHtml(el.innerHTML),
        } as EditorBlock);
        continue;
      }

      if (el.getAttribute("data-callout") === "true") {
        flushInline();
        const blk = claimId(el, "callout");
        out.push({
          ...blk,
          type: "callout",
          text: sanitizeInlineHtml(el.innerHTML),
        } as EditorBlock);
        continue;
      }

      if (tag === "hr") {
        flushInline();
        const blk = claimId(el, "divider");
        out.push({ ...blk, type: "divider" } as EditorBlock);
        continue;
      }

      if (tag === "p" || tag === "div" || tag === "section" || tag === "article") {
        flushInline();
        const hasBlockChildren = Array.from(el.children).some((c) =>
          /^(p|h[1-6]|ul|ol|blockquote|hr|div|section|article)$/i.test(c.tagName)
        );
        if (hasBlockChildren) {
          walkChildren(el);
        } else {
          const blk = claimId(el, "paragraph");
          out.push({
            ...blk,
            type: "paragraph",
            text: sanitizeInlineHtml(el.innerHTML),
          } as EditorBlock);
        }
        continue;
      }

      inlineAcc += el.outerHTML;
    }

    flushInline();
  };

  walkChildren(root);

  if (out.length === 0) {
    return [createBlock("paragraph")];
  }
  return out;
}

function cleanPastedContentToHtml(htmlData: string, plainData: string): string {
  if (htmlData && htmlData.trim() && typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(htmlData, "text/html");
    doc.querySelectorAll("script, style, meta, link, title, head").forEach((n) => n.remove());

    const outParts: string[] = [];

    const serializeList = (listEl: HTMLElement, ordered: boolean): string => {
      const items: string[] = [];
      for (const child of Array.from(listEl.children)) {
        const t = child.tagName.toLowerCase();
        if (t === "li") {
          const clone = child.cloneNode(true) as HTMLElement;
          clone.querySelectorAll("ul, ol").forEach((n) => n.remove());
          const mainText = sanitizeInlineHtml(clone.innerHTML);
          if (stripHtml(mainText)) items.push(`<li>${mainText}</li>`);
          for (const nested of Array.from(child.children)) {
            const nt = nested.tagName.toLowerCase();
            if (nt === "ul" || nt === "ol") {
              const nestedItems = Array.from(nested.querySelectorAll("li"))
                .map((li) => sanitizeInlineHtml(li.innerHTML))
                .filter((x) => stripHtml(x));
              nestedItems.forEach((ni) => items.push(`<li>${ni}</li>`));
            }
          }
        }
      }
      if (!items.length) return "";
      const tag = ordered ? "ol" : "ul";
      return `<${tag}>${items.join("")}</${tag}>`;
    };

    const walk = (container: ParentNode) => {
      let inlineBuf = "";
      const flush = () => {
        const cleaned = sanitizeInlineHtml(inlineBuf);
        if (stripHtml(cleaned)) outParts.push(`<p>${cleaned}</p>`);
        inlineBuf = "";
      };

      for (const node of Array.from(container.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          const txt = node.textContent ?? "";
          if (txt.trim()) inlineBuf += escapeHtml(txt);
          else if (inlineBuf) inlineBuf += " ";
          continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const styleAttr = (el.getAttribute("style") ?? "").toLowerCase();

        if (
          (tag === "b" || tag === "strong") &&
          (el.id.startsWith("docs-internal-guid") || /font-weight\s*:\s*(normal|400)\b/.test(styleAttr))
        ) {
          flush();
          walk(el);
          continue;
        }

        if (tag === "div" || tag === "section" || tag === "article" || tag === "main") {
          flush();
          const hasBlocks = Array.from(el.children).some((c) =>
            /^(p|h[1-6]|ul|ol|blockquote|hr|div|section|article|table|pre)$/i.test(c.tagName)
          );
          if (hasBlocks) walk(el);
          else {
            const cleaned = sanitizeInlineHtml(el.innerHTML);
            if (stripHtml(cleaned)) outParts.push(`<p>${cleaned}</p>`);
          }
          continue;
        }

        if (/^h[1-6]$/.test(tag)) {
          flush();
          const num = Number.parseInt(tag[1], 10);
          const hTag = num === 1 ? "h1" : num === 2 ? "h2" : "h3";
          const cleaned = sanitizeInlineHtml(el.innerHTML);
          if (stripHtml(cleaned)) outParts.push(`<${hTag}>${cleaned}</${hTag}>`);
          continue;
        }

        if (tag === "p") {
          flush();
          const cleaned = sanitizeInlineHtml(el.innerHTML);
          if (stripHtml(cleaned)) outParts.push(`<p>${cleaned}</p>`);
          continue;
        }

        if (tag === "ul" || tag === "ol") {
          flush();
          const listHtml = serializeList(el, tag === "ol");
          if (listHtml) outParts.push(listHtml);
          continue;
        }

        if (tag === "blockquote") {
          flush();
          const cleaned = sanitizeInlineHtml(el.innerHTML);
          if (stripHtml(cleaned)) outParts.push(`<blockquote>${cleaned}</blockquote>`);
          continue;
        }

        if (tag === "hr") {
          flush();
          outParts.push("<hr>");
          continue;
        }

        inlineBuf += el.outerHTML;
      }

      flush();
    };

    walk(doc.body);
    if (outParts.length > 0) return outParts.join("");
  }

  const normalized = (plainData ?? "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const lines = normalized.split("\n");
  const outParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) { i++; continue; }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      outParts.push("<hr>");
      i++;
      continue;
    }

    const hMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (hMatch) {
      const num = hMatch[1].length;
      const hTag = num === 1 ? "h1" : num === 2 ? "h2" : "h3";
      outParts.push(`<${hTag}>${inlineMarkdownToHtml(hMatch[2])}</${hTag}>`);
      i++;
      continue;
    }

    if (/^([-*•])\s+(.+)$/.test(trimmed)) {
      const lis: string[] = [];
      while (i < lines.length) {
        const m = /^([-*•])\s+(.+)$/.exec(lines[i].trim());
        if (!m) break;
        lis.push(`<li>${inlineMarkdownToHtml(m[2])}</li>`);
        i++;
      }
      outParts.push(`<ul>${lis.join("")}</ul>`);
      continue;
    }

    if (/^\d+[.)]\s+(.+)$/.test(trimmed)) {
      const lis: string[] = [];
      while (i < lines.length) {
        const m = /^\d+[.)]\s+(.+)$/.exec(lines[i].trim());
        if (!m) break;
        lis.push(`<li>${inlineMarkdownToHtml(m[1])}</li>`);
        i++;
      }
      outParts.push(`<ol>${lis.join("")}</ol>`);
      continue;
    }

    if (/^>\s?(.*)$/.test(trimmed)) {
      const qLines: string[] = [];
      while (i < lines.length) {
        const m = /^>\s?(.*)$/.exec(lines[i].trim());
        if (!m) break;
        qLines.push(inlineMarkdownToHtml(m[1]));
        i++;
      }
      outParts.push(`<blockquote>${qLines.join(" ")}</blockquote>`);
      continue;
    }

    const pLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(cur) ||
        /^(#{1,6})\s+/.test(cur) ||
        /^([-*•])\s+/.test(cur) ||
        /^\d+[.)]\s+/.test(cur) ||
        /^>\s?/.test(cur)
      ) {
        break;
      }
      pLines.push(inlineMarkdownToHtml(cur));
      i++;
    }
    if (pLines.length) {
      outParts.push(`<p>${pLines.join(" ")}</p>`);
    }
  }

  return outParts.join("");
}

function blocksToSectionInputs(blocks: EditorBlock[]): SectionInput[] {
  const sanitizedBlocks = blocks.map((b) => {
    if (b.type === "paragraph" || b.type === "heading" || b.type === "quote" || b.type === "callout") {
      return { ...b, text: sanitizeInlineHtml(b.text) } as EditorBlock;
    }
    if (b.type === "bulletList" || b.type === "numberedList") {
      return {
        ...b,
        items: b.items.map((item) => sanitizeInlineHtml(item)).filter((item) => stripHtml(item) !== ""),
      } as EditorBlock;
    }
    return b;
  });

  return convertBlocksToSectionInputs(sanitizedBlocks) as unknown as SectionInput[];
}

/* ==========================================================================
   ICONS & HELPER UI COMPONENTS
   ========================================================================== */
type IconName =
  | "plus" | "up" | "down" | "trash" | "paragraph" | "h1" | "h2" | "h3"
  | "list" | "olist" | "quote" | "minus" | "image" | "gallery" | "video" | "audio"
  | "html" | "markdown" | "table" | "button" | "callout" | "code" | "imagePlus"
  | "upload" | "replace" | "link" | "close" | "undo" | "redo" | "clearFormat"
  | "eye" | "external" | "lock" | "download" | "alert" | "check";

function Icon({ name, className = "a-icon" }: { name: IconName; className?: string }) {
  const common = {
    className,
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const dot = (cx: number, cy: number) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1" fill="currentColor" stroke="none" />;
  switch (name) {
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "up": return <svg {...common}><path d="M6 14l6-6 6 6" /></svg>;
    case "down": return <svg {...common}><path d="M6 10l6 6 6-6" /></svg>;
    case "trash": return <svg {...common}><path d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12" /></svg>;
    case "paragraph": return <svg {...common}><path d="M12 5v14M12 5h5a4 4 0 0 1 0 8h-5" /></svg>;
    case "h1": return <svg {...common}><path d="M5 6v12M5 12h8M13 6v12M19 10v8M19 10c0-1.5 2-1.5 2 0" /></svg>;
    case "h2": return <svg {...common}><path d="M4 6v12M4 12h7M11 6v12M17 10c1.5-2 4-1 4 1s-4 2-4 4h4" /></svg>;
    case "h3": return <svg {...common}><path d="M4 6v12M4 12h7M11 6v12M17 10h4M21 10c0 2-4 2-4 4h4" /></svg>;
    case "list": return <svg {...common}><path d="M9 7h11M9 12h11M9 17h11" />{[7, 12, 17].map((y) => dot(5, y))}</svg>;
    case "olist": return <svg {...common}><path d="M10 7h10M10 12h10M10 17h10M4 8h2M5 6v4M4 16h2l-2 2h2" /></svg>;
    case "quote": return <svg {...common}><path d="M8 17c-2 0-3-2-3-4V8h5v5H8c0 2 1 4 3 4M17 17c-2 0-3-2-3-4V8h5v5h-2c0 2 1 4 3 4" /></svg>;
    case "minus": return <svg {...common}><path d="M5 12h14" /></svg>;
    case "image": return <svg {...common}><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.4" /><path d="M8 16l3-3 2 2 2-2 3 3" /></svg>;
    case "gallery": return <svg {...common}><rect x="3" y="5" width="12" height="10" rx="2" /><path d="M8 19h11a2 2 0 0 0 2-2v-8" /></svg>;
    case "video": return <svg {...common}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M10 9l5 3-5 3z" /></svg>;
    case "audio": return <svg {...common}><path d="M9 18V6l10-2v12" /><circle cx="7" cy="18" r="2.2" /><circle cx="17" cy="16" r="2.2" /></svg>;
    case "html": return <svg {...common}><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12" /></svg>;
    case "markdown": return <svg {...common}><path d="M4 6h16v12H4zM7 15V9l3 3 3-3v6" /></svg>;
    case "table": return <svg {...common}><rect x="4" y="5" width="16" height="14" rx="1" /><path d="M4 10h16M4 15h16M10 5v14M16 5v14" /></svg>;
    case "button": return <svg {...common}><rect x="3" y="8" width="18" height="8" rx="4" /><path d="M8 12h8" /></svg>;
    case "callout": return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v5M12 16h.01" /></svg>;
    case "code": return <svg {...common}><path d="M9 8L5 12l4 4M15 8l4 4-4 4" /></svg>;
    case "imagePlus": return <svg {...common}><rect x="3" y="5" width="14" height="12" rx="2" /><path d="M18 16v5M15.5 18.5h5" /></svg>;
    case "upload": return <svg {...common}><path d="M12 16V5M7 9l5-5 5 5M5 19h14" /></svg>;
    case "replace": return <svg {...common}><path d="M4 8h13l-3-3M20 16H7l3 3" /></svg>;
    case "link": return <svg {...common}><path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1" /></svg>;
    case "close": return <svg {...common}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "undo": return <svg {...common}><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>;
    case "redo": return <svg {...common}><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></svg>;
    case "clearFormat": return <svg {...common}><path d="M6 4h12M12 4l-3 14M4 20l16-16" /></svg>;
    case "eye": return <svg {...common}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "external": return <svg {...common}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>;
    case "lock": return <svg {...common}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
    case "download": return <svg {...common}><path d="M12 4v12M6 10l6 6 6-6M4 20h16" /></svg>;
    case "alert": return <svg {...common}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></svg>;
    case "check": return <svg {...common}><path d="M5 12l5 5 9-10" /></svg>;
    default: return null;
  }
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span className={`a-badge ${published ? "a-badge-live" : "a-badge-draft"}`}>
      {published ? "Published" : "Draft"}
    </span>
  );
}

const SITE_NAME = "Snow Day Calculator";
const SITE_URL = "https://www.snowdayprediction.online";

function SnippetPreview({ title, slug, description }: { title: string; slug: string; description: string }) {
  const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
  const host = new URL(SITE_URL).host;
  const fullTitle = `${title.trim() || "Untitled post"} | ${SITE_NAME}`;
  return (
    <div className="a-snippet" aria-label="Search result preview">
      <div className="a-snippet-url">{host} › blog › {slug || "your-slug"}</div>
      <div className="a-snippet-title">{clip(fullTitle, 60)}</div>
      <div className="a-snippet-desc">
        {description.trim()
          ? clip(description.trim(), 160)
          : "Add a meta description to control what search engines show here."}
      </div>
    </div>
  );
}

function TagInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}) {
  const [text, setText] = useState("");
  const listId = useId();
  const MAX_TAGS = 10;
  const MAX_LEN = 40;

  function addMany(raw: string) {
    const next = [...value];
    for (const part of raw.split(",")) {
      const t = part.trim().slice(0, MAX_LEN);
      if (t && next.length < MAX_TAGS && !next.some((x) => x.toLowerCase() === t.toLowerCase())) next.push(t);
    }
    if (next.length !== value.length) onChange(next);
    setText("");
  }

  const unused = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <div className="a-tags">
        {value.map((t) => (
          <span key={t} className="a-tag">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove tag ${t}`}>
              <Icon name="close" className="a-icon a-icon-sm" />
            </button>
          </span>
        ))}
        <input
          className="a-tag-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addMany(text);
            } else if (e.key === "Backspace" && text === "" && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => addMany(text)}
          list={listId}
          placeholder={value.length >= MAX_TAGS ? "Tag limit reached" : "Type a tag and press Enter"}
          disabled={value.length >= MAX_TAGS}
          maxLength={MAX_LEN}
          aria-label="Add a tag"
        />
        <datalist id={listId}>
          {unused.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <p className="a-hint">{value.length}/{MAX_TAGS} tags. Press Enter or comma to add.</p>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="a-dialog"
      aria-labelledby="a-dialog-title"
      onClose={() => { if (open) onCancel(); }}
      onClick={(e) => { if (e.target === ref.current && !busy) onCancel(); }}
    >
      <div className="a-dialog-body">
        <h2 id="a-dialog-title">{title}</h2>
        <div className="a-dialog-text">{children}</div>
        <div className="a-dialog-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={`btn btn-sm ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

type ToastKind = "success" | "error" | "info";
interface ToastItem { id: number; message: string; kind: ToastKind }

/* ==========================================================================
   IMAGE STANDARDIZER & SUPABASE UPLOAD IMAGE PICKER
   ========================================================================== */
export const IMAGE_WIDTH = 1600;
export const IMAGE_HEIGHT = 900;
export const IMAGE_SIZE_LABEL = `${IMAGE_WIDTH} × ${IMAGE_HEIGHT}`;

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const ALLOWED_TYPES = ACCEPT.split(",");
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

export async function standardizeImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.max(IMAGE_WIDTH / bitmap.width, IMAGE_HEIGHT / bitmap.height);
    const sw = IMAGE_WIDTH / scale;
    const sh = IMAGE_HEIGHT / scale;
    const sx = (bitmap.width - sw) / 2;
    const sy = (bitmap.height - sh) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = IMAGE_WIDTH;
    canvas.height = IMAGE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
    if (!blob) return file;
    const ext = blob.type === "image/png" ? "png" : "webp";
    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "image";
    return new File([blob], `${base}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}

export function ImagePicker({
  url, onUrl, onError, onUploaded, onBroken, hideUrl, compact, variant,
}: {
  url: string;
  onUrl: (url: string) => void;
  onError?: (message: string) => void;
  onUploaded?: () => void;
  onBroken?: (broken: boolean) => void;
  hideUrl?: boolean;
  compact?: boolean;
  variant?: "cover";
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [broken, setBroken] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const onUrlRef = useRef(onUrl);
  onUrlRef.current = onUrl;
  const ok = isSafeMediaUrl(url);
  const showImage = ok && !broken;

  useEffect(() => { setBroken(false); }, [url]);

  function fail(message: string) {
    setError(message);
    onError?.(message);
  }

  async function handle(file?: File | null) {
    if (!file) return;
    setError("");
    if (!ALLOWED_TYPES.includes(file.type)) return fail("Choose a JPG, PNG, WebP, or GIF image.");
    if (file.size > MAX_SOURCE_BYTES) return fail("Image must be 20 MB or smaller.");
    setUploading(true);
    try {
      const prepared = await standardizeImage(file);
      const fd = new FormData();
      fd.set("file", prepared);
      const res = await uploadBlogImage(fd);
      if (!res.ok) {
        fail(res.message);
        return;
      }
      onUrlRef.current(res.url);
      onUploaded?.();
    } catch {
      fail("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className={`a-be-pick ${compact ? "is-compact" : ""} ${variant === "cover" ? "is-cover" : ""}`}>
      <input ref={input} type="file" accept={ACCEPT} hidden disabled={uploading} aria-label="Upload image" onChange={(e) => handle(e.target.files?.[0])} />
      <div
        className={`a-be-drop ${drag ? "is-drag" : ""} ${showImage ? "has-img" : ""}`}
        onDragOver={(e) => {
          if (Array.from(e.dataTransfer.types).includes("Files")) { e.preventDefault(); setDrag(true); }
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          if (e.dataTransfer.files.length) {
            e.preventDefault();
            e.stopPropagation();
            setDrag(false);
            handle(e.dataTransfer.files[0]);
          }
        }}
      >
        {showImage ? (
          <>
            <img src={url.trim()} alt="" onError={() => { setBroken(true); onBroken?.(true); }} />
            <div className="a-be-drop-actions">
              <button type="button" className="a-be-chip" onClick={() => input.current?.click()} disabled={uploading}>
                <Icon name="replace" /> Replace
              </button>
              <button type="button" className="a-be-chip" onClick={() => onUrl("")} disabled={uploading}>
                <Icon name="close" /> Remove
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="a-be-drop-empty" onClick={() => input.current?.click()} disabled={uploading}>
            <Icon name={variant === "cover" ? "imagePlus" : "upload"} />
            <strong>{variant === "cover" ? "Add a featured image" : "Upload an image"}</strong>
            {!compact && <span>Drop a file here or click to browse. Cropped to 16:9 ({IMAGE_SIZE_LABEL}) automatically.</span>}
          </button>
        )}
        {uploading && <div className="a-be-drop-busy" role="status">Resizing and uploading…</div>}
      </div>

      {error && <p className="a-be-note is-error" role="alert">{error}</p>}
      {broken && ok && <p className="a-be-note is-error">The image could not be loaded. Check the link.</p>}

      {!hideUrl && (
        <div className="a-be-pick-link">
          {linkOpen || (url.trim() && !ok) ? (
            <input
              className="a-be-field"
              value={url}
              placeholder="/blog/photo.jpg or https://…"
              aria-label="Image URL"
              onChange={(e) => onUrl(e.target.value)}
            />
          ) : (
            <button type="button" className="a-be-linkish" onClick={() => setLinkOpen(true)}>
              <Icon name="link" /> Use a link instead
            </button>
          )}
          {url.trim() && !ok && <p className="a-be-note is-error">Use a site path starting with / or an https link.</p>}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   CONTINUOUS RICH-FLOW SURFACE & BLOCK CANVAS
   ========================================================================== */
function RichFlowSurface({
  blocks,
  syncVersion,
  isFirst,
  isOnly,
  onChangeBlocks,
  onActiveFlowRef,
  onSelectionStateChange,
}: {
  blocks: EditorBlock[];
  syncVersion: number;
  isFirst: boolean;
  isOnly: boolean;
  onChangeBlocks: (next: EditorBlock[]) => void;
  onActiveFlowRef: (el: HTMLDivElement) => void;
  onSelectionStateChange: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = flowBlocksToHtml(blocks);
    if (!mounted.current || el.innerHTML !== html) {
      el.innerHTML = html;
      mounted.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncVersion]);

  function emitChange() {
    const el = ref.current;
    if (!el) return;
    const parsed = parseFlowDomToBlocks(el);
    onChangeBlocks(parsed);
    onSelectionStateChange();
  }

  function onPaste(e: ReactPaste<HTMLDivElement>) {
    e.preventDefault();
    const htmlData = e.clipboardData.getData("text/html");
    const plainData = e.clipboardData.getData("text/plain");

    const cleanedHtml = cleanPastedContentToHtml(htmlData, plainData);
    if (!cleanedHtml) return;

    const temp = new DOMParser().parseFromString(cleanedHtml, "text/html");
    if (temp.body.children.length === 1 && temp.body.firstElementChild?.tagName.toLowerCase() === "p") {
      document.execCommand("insertHTML", false, temp.body.firstElementChild.innerHTML);
    } else {
      document.execCommand("insertHTML", false, cleanedHtml);
    }
    emitChange();
  }

  function onKeyDown(e: ReactKey<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;

    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === "b" || k === "i" || k === "u") {
        e.preventDefault();
        document.execCommand(k === "b" ? "bold" : k === "i" ? "italic" : "underline");
        emitChange();
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const node = sel.anchorNode;
        const elem = node?.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement;
        const headingOrQuote = elem?.closest("h1, h2, h3, blockquote, div[data-callout='true']");
        if (headingOrQuote && el.contains(headingOrQuote)) {
          setTimeout(() => {
            const curSel = window.getSelection();
            const curNode = curSel?.anchorNode;
            const curEl = curNode?.nodeType === Node.ELEMENT_NODE ? (curNode as HTMLElement) : curNode?.parentElement;
            const curBlock = curEl?.closest("h1, h2, h3, blockquote, div[data-callout='true']");
            if (curBlock && curBlock !== headingOrQuote && !stripHtml(curBlock.innerHTML)) {
              document.execCommand("formatBlock", false, "P");
            }
            emitChange();
          }, 0);
        }
      }
    }
  }

  return (
    <div
      ref={ref}
      role="textbox"
      aria-multiline="true"
      aria-label="Post body"
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder={
        isFirst
          ? "Start writing your post here, or paste your full article from Google Docs…"
          : "Continue writing here…"
      }
      className={`a-be-flow ${!isOnly && !isFirst ? "is-compact" : ""}`}
      onFocus={(e) => {
        onActiveFlowRef(e.currentTarget);
        onSelectionStateChange();
      }}
      onMouseUp={onSelectionStateChange}
      onKeyUp={onSelectionStateChange}
      onInput={emitChange}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
    />
  );
}

function findClosestAnchor(node: Node | null): HTMLAnchorElement | null {
  let curr: Node | null = node;
  while (curr) {
    if (curr.nodeType === Node.ELEMENT_NODE && (curr as HTMLElement).tagName.toLowerCase() === "a") {
      return curr as HTMLAnchorElement;
    }
    curr = curr.parentNode;
  }
  return null;
}

type Segment =
  | { kind: "flow"; startIndex: number; blocks: EditorBlock[] }
  | { kind: "widget"; index: number; block: EditorBlock };

type ActiveFormatState = {
  blockTag: "paragraph" | "heading-1" | "heading-2" | "heading-3" | "quote" | "callout";
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  ul: boolean;
  ol: boolean;
  linkHref: string;
};

type LinkDialogState = {
  flowEl: HTMLDivElement;
  range: Range | null;
  top: number;
  left: number;
  url: string;
};

const EXTRA_WIDGET_ITEMS: { label: string; type: ContentBlock["type"]; icon: IconName }[] = [
  { label: "Image", type: "image", icon: "image" },
  { label: "Gallery", type: "gallery", icon: "gallery" },
  { label: "Table", type: "table", icon: "table" },
  { label: "Custom HTML & CSS", type: "html", icon: "html" },
  { label: "Video (YouTube / Vimeo)", type: "video", icon: "video" },
  { label: "Audio (Spotify / File)", type: "audio", icon: "audio" },
  { label: "Code Block", type: "code", icon: "code" },
  { label: "Markdown Block", type: "markdown", icon: "markdown" },
  { label: "Button Link", type: "button", icon: "button" },
  { label: "Horizontal Divider", type: "divider", icon: "minus" },
];

export function BlockCanvas({
  blocks,
  onChange,
  theme = "dark",
  headerSlot,
}: {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  theme?: "light" | "dark";
  headerSlot?: ReactNode;
}) {
  const [syncVersion, setSyncVersion] = useState(1);
  const [past, setPast] = useState<EditorBlock[][]>([]);
  const [future, setFuture] = useState<EditorBlock[][]>([]);
  const [insertMenuPos, setInsertMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [linkDialog, setLinkDialog] = useState<LinkDialogState | null>(null);
  const [fmt, setFmt] = useState<ActiveFormatState>({
    blockTag: "paragraph",
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    ul: false,
    ol: false,
    linkHref: "",
  });

  const activeFlowRef = useRef<HTMLDivElement | null>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const insertMenuRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const segments = useMemo<Segment[]>(() => {
    const list: Segment[] = [];
    let currentFlow: { startIndex: number; blocks: EditorBlock[] } | null = null;

    blocks.forEach((b, idx) => {
      if (isFlowBlock(b)) {
        if (!currentFlow) {
          currentFlow = { startIndex: idx, blocks: [b] };
        } else {
          currentFlow.blocks.push(b);
        }
      } else {
        if (currentFlow) {
          list.push({ kind: "flow", ...currentFlow });
          currentFlow = null;
        }
        list.push({ kind: "widget", index: idx, block: b });
      }
    });

    if (currentFlow) {
      list.push({ kind: "flow", ...(currentFlow as { startIndex: number; blocks: EditorBlock[] }) });
    }

    if (list.length === 0 || list[list.length - 1].kind === "widget") {
      list.push({
        kind: "flow",
        startIndex: blocks.length,
        blocks: [createBlock("paragraph")],
      });
    }

    return list;
  }, [blocks]);

  function pushHistory(prevBlocks: EditorBlock[]) {
    setPast((p) => [...p.slice(-39), prevBlocks]);
    setFuture([]);
  }

  function undo() {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [blocks, ...f.slice(0, 39)]);
    onChange(prev);
    setSyncVersion((v) => v + 1);
  }

  function redo() {
    if (!future.length) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p.slice(-39), blocks]);
    onChange(next);
    setSyncVersion((v) => v + 1);
  }

  function inspectSelectionState() {
    const sel = window.getSelection();
    const flowEl = activeFlowRef.current;
    if (!sel || !sel.rangeCount || !flowEl || !flowEl.contains(sel.anchorNode)) return;

    const node = sel.anchorNode;
    const el = node?.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement;
    if (!el) return;

    let blockTag: ActiveFormatState["blockTag"] = "paragraph";
    if (el.closest("h1")) blockTag = "heading-1";
    else if (el.closest("h2")) blockTag = "heading-2";
    else if (el.closest("h3")) blockTag = "heading-3";
    else if (el.closest("blockquote")) blockTag = "quote";
    else if (el.closest("div[data-callout='true']")) blockTag = "callout";

    const anchor = findClosestAnchor(node);

    setFmt({
      blockTag,
      bold: Boolean(el.closest("b, strong")) || document.queryCommandState("bold"),
      italic: Boolean(el.closest("i, em")) || document.queryCommandState("italic"),
      underline: Boolean(el.closest("u")) || document.queryCommandState("underline"),
      strike: Boolean(el.closest("s, strike, del")) || document.queryCommandState("strikeThrough"),
      ul: Boolean(el.closest("ul")) || document.queryCommandState("insertUnorderedList"),
      ol: Boolean(el.closest("ol")) || document.queryCommandState("insertOrderedList"),
      linkHref: anchor?.getAttribute("href") ?? "",
    });
  }

  function ensureFlowFocus(): HTMLDivElement | null {
    if (activeFlowRef.current && document.body.contains(activeFlowRef.current)) {
      activeFlowRef.current.focus();
      return activeFlowRef.current;
    }
    const firstFlow = docRef.current?.querySelector<HTMLDivElement>(".a-be-flow") ?? null;
    if (firstFlow) {
      activeFlowRef.current = firstFlow;
      firstFlow.focus();
    }
    return firstFlow;
  }

  function syncActiveFlowDom(flowEl: HTMLDivElement) {
    flowEl.dispatchEvent(new Event("input", { bubbles: true }));
    inspectSelectionState();
  }

  function applyBlockFormat(targetFormat: ActiveFormatState["blockTag"]) {
    const flowEl = ensureFlowFocus();
    if (!flowEl) return;

    pushHistory(blocks);
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    const el = node?.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement;

    const existingCallout = el?.closest("div[data-callout='true']") as HTMLElement | null;
    if (existingCallout && flowEl.contains(existingCallout) && targetFormat !== "callout") {
      existingCallout.removeAttribute("data-callout");
    }

    if (targetFormat === "callout") {
      if (existingCallout && flowEl.contains(existingCallout)) {
        existingCallout.removeAttribute("data-callout");
        document.execCommand("formatBlock", false, "P");
      } else {
        document.execCommand("formatBlock", false, "DIV");
        const curSel = window.getSelection();
        const curNode = curSel?.anchorNode;
        const curEl = curNode?.nodeType === Node.ELEMENT_NODE ? (curNode as HTMLElement) : curNode?.parentElement;
        const blockEl = curEl?.closest("div, p, h1, h2, h3, blockquote") as HTMLElement | null;
        if (blockEl && blockEl !== flowEl && flowEl.contains(blockEl)) {
          const calloutDiv = document.createElement("div");
          calloutDiv.setAttribute("data-callout", "true");
          calloutDiv.innerHTML = sanitizeInlineHtml(blockEl.innerHTML) || "<br>";
          blockEl.replaceWith(calloutDiv);
        }
      }
    } else if (targetFormat === "heading-1") {
      document.execCommand("formatBlock", false, fmt.blockTag === "heading-1" ? "P" : "H1");
    } else if (targetFormat === "heading-2") {
      document.execCommand("formatBlock", false, fmt.blockTag === "heading-2" ? "P" : "H2");
    } else if (targetFormat === "heading-3") {
      document.execCommand("formatBlock", false, fmt.blockTag === "heading-3" ? "P" : "H3");
    } else if (targetFormat === "quote") {
      document.execCommand("formatBlock", false, fmt.blockTag === "quote" ? "P" : "BLOCKQUOTE");
    } else {
      document.execCommand("formatBlock", false, "P");
    }

    syncActiveFlowDom(flowEl);
  }

  function toggleInlineCmd(
    cmd:
      | "bold"
      | "italic"
      | "underline"
      | "strikeThrough"
      | "insertUnorderedList"
      | "insertOrderedList"
      | "removeFormat"
      | "code"
  ) {
    const flowEl = ensureFlowFocus();
    if (!flowEl) return;

    if (cmd === "insertUnorderedList" || cmd === "insertOrderedList") {
      pushHistory(blocks);
    }

    if (cmd === "code") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const text = range.toString();
        if (text) {
          const code = document.createElement("code");
          code.textContent = text;
          range.deleteContents();
          range.insertNode(code);
          range.setStartAfter(code);
          range.setEndAfter(code);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    } else if (cmd === "removeFormat") {
      document.execCommand("removeFormat");
      document.execCommand("unlink");
    } else {
      document.execCommand(cmd, false);
    }

    syncActiveFlowDom(flowEl);
  }

  function openLinkPopover(triggerEl?: HTMLElement) {
    const flowEl = ensureFlowFocus();
    if (!flowEl) return;

    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 && flowEl.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
    const existing = sel && sel.rangeCount > 0 ? findClosestAnchor(sel.anchorNode)?.getAttribute("href") ?? "" : "";
    const rect =
      range && !range.collapsed
        ? range.getBoundingClientRect()
        : (triggerEl ?? flowEl).getBoundingClientRect();

    setLinkDialog({
      flowEl,
      range,
      top: rect.bottom + 8,
      left: Math.max(170, Math.min(window.innerWidth - 170, rect.left + rect.width / 2)),
      url: existing,
    });
  }

  function applyLinkFromDialog(rawUrl: string) {
    if (!linkDialog) return;
    const { flowEl, range } = linkDialog;
    flowEl.focus();

    if (range) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    const href = normalizeHref(rawUrl);
    const sel = window.getSelection();
    const existingAnchor = sel && sel.rangeCount > 0 ? findClosestAnchor(sel.anchorNode) : null;

    if (!href) {
      if (existingAnchor && flowEl.contains(existingAnchor)) {
        const textNode = document.createTextNode(existingAnchor.textContent ?? "");
        existingAnchor.replaceWith(textNode);
      } else {
        document.execCommand("unlink");
      }
    } else if (existingAnchor && flowEl.contains(existingAnchor) && (!sel || sel.isCollapsed)) {
      existingAnchor.setAttribute("href", href);
    } else if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      const selectedText = r.toString().trim();
      const a = document.createElement("a");
      a.setAttribute("href", href);
      a.textContent = selectedText || rawUrl.trim();
      r.deleteContents();
      r.insertNode(a);
      r.setStartAfter(a);
      r.setEndAfter(a);
      sel.removeAllRanges();
      sel.addRange(r);
    }

    setLinkDialog(null);
    syncActiveFlowDom(flowEl);
  }

  function insertBlockAtCursor(type: ContentBlock["type"]) {
    setInsertMenuPos(null);

    if (type === "divider") {
      const flowEl = ensureFlowFocus();
      if (flowEl) {
        pushHistory(blocks);
        document.execCommand("insertHTML", false, "<hr><p><br></p>");
        syncActiveFlowDom(flowEl);
        return;
      }
    }

    pushHistory(blocks);
    const widgetBlock = createBlock(type);

    const sel = window.getSelection();
    let targetBlockId: string | null = null;
    if (sel && sel.rangeCount > 0 && activeFlowRef.current?.contains(sel.anchorNode)) {
      const node = sel.anchorNode;
      const el = node?.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement;
      const bidEl = el?.closest("[data-bid]") as HTMLElement | null;
      if (bidEl) targetBlockId = bidEl.getAttribute("data-bid");
    }

    const next = blocks.slice();
    let insertIdx = next.length;
    if (targetBlockId) {
      const foundIdx = next.findIndex((b) => b.id === targetBlockId);
      if (foundIdx !== -1) {
        const cur = next[foundIdx];
        const isEmptyPara = cur.type === "paragraph" && !stripHtml(cur.text);
        if (isEmptyPara) {
          next.splice(foundIdx, 1, widgetBlock);
          insertIdx = foundIdx;
        } else {
          next.splice(foundIdx + 1, 0, widgetBlock);
          insertIdx = foundIdx + 1;
        }
      } else {
        next.push(widgetBlock);
        insertIdx = next.length - 1;
      }
    } else {
      const last = next[next.length - 1];
      if (last && last.type === "paragraph" && !stripHtml(last.text)) {
        next.splice(next.length - 1, 1, widgetBlock);
        insertIdx = next.length - 1;
      } else {
        next.push(widgetBlock);
        insertIdx = next.length - 1;
      }
    }

    if (!next[insertIdx + 1] || !isFlowBlock(next[insertIdx + 1])) {
      next.splice(insertIdx + 1, 0, createBlock("paragraph"));
    }

    onChange(next);
    setSyncVersion((v) => v + 1);
  }

  function updateFlowSegment(startIndex: number, oldCount: number, newFlowBlocks: EditorBlock[]) {
    const next = blocks.slice();
    next.splice(startIndex, oldCount, ...newFlowBlocks);
    onChange(next.length ? next : [createBlock("paragraph")]);
  }

  function updateWidget(index: number, updated: EditorBlock) {
    const next = blocks.slice();
    next[index] = updated;
    onChange(next);
  }

  function removeWidget(index: number) {
    pushHistory(blocks);
    const next = blocks.filter((_, i) => i !== index);
    onChange(next.length ? next : [createBlock("paragraph")]);
    setSyncVersion((v) => v + 1);
  }

  function moveWidget(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    pushHistory(blocks);
    const next = blocks.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
    setSyncVersion((v) => v + 1);
  }

  useEffect(() => {
    if (!insertMenuPos) return;
    const onDown = (e: MouseEvent) => {
      if (!insertMenuRef.current?.contains(e.target as Node)) setInsertMenuPos(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInsertMenuPos(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [insertMenuPos]);

  useEffect(() => {
    if (linkDialog && linkInputRef.current) {
      linkInputRef.current.focus();
      linkInputRef.current.select();
    }
  }, [linkDialog]);

  const words = countWords(blocks);
  const minutes = Math.max(1, Math.ceil(words / 200));

  return (
    <div className="a-be" data-be-theme={theme}>
      <div
        className="a-be-toolbar"
        role="toolbar"
        aria-label="Formatting and insert toolbar"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).tagName !== "SELECT") {
            e.preventDefault();
          }
        }}
      >
        <div className="a-be-toolbar-group">
          <button type="button" className="a-be-tbtn" onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)" aria-label="Undo">
            <Icon name="undo" />
          </button>
          <button type="button" className="a-be-tbtn" onClick={redo} disabled={!future.length} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
            <Icon name="redo" />
          </button>
        </div>

        <div className="a-be-toolbar-sep" aria-hidden="true" />

        <div className="a-be-toolbar-group">
          <select
            className="a-be-block-select"
            aria-label="Text style"
            value={fmt.blockTag}
            onChange={(e) => applyBlockFormat(e.target.value as ActiveFormatState["blockTag"])}
          >
            <option value="paragraph">Paragraph</option>
            <option value="heading-1">Heading 1</option>
            <option value="heading-2">Heading 2</option>
            <option value="heading-3">Heading 3</option>
            <option value="quote">Quote</option>
            <option value="callout">Callout Box</option>
          </select>

          <button type="button" className={`a-be-tbtn ${fmt.blockTag === "paragraph" ? "is-active" : ""}`} onClick={() => applyBlockFormat("paragraph")} title="Normal Paragraph">
            P
          </button>
          <button type="button" className={`a-be-tbtn ${fmt.blockTag === "heading-1" ? "is-active" : ""}`} onClick={() => applyBlockFormat("heading-1")} title="Heading 1">
            H1
          </button>
          <button type="button" className={`a-be-tbtn ${fmt.blockTag === "heading-2" ? "is-active" : ""}`} onClick={() => applyBlockFormat("heading-2")} title="Heading 2">
            H2
          </button>
          <button type="button" className={`a-be-tbtn ${fmt.blockTag === "heading-3" ? "is-active" : ""}`} onClick={() => applyBlockFormat("heading-3")} title="Heading 3">
            H3
          </button>
        </div>

        <div className="a-be-toolbar-sep" aria-hidden="true" />

        <div className="a-be-toolbar-group">
          <button type="button" className={`a-be-tbtn ${fmt.bold ? "is-active" : ""}`} onClick={() => toggleInlineCmd("bold")} title="Bold (Ctrl+B)" aria-label="Bold">
            <b>B</b>
          </button>
          <button type="button" className={`a-be-tbtn ${fmt.italic ? "is-active" : ""}`} onClick={() => toggleInlineCmd("italic")} title="Italic (Ctrl+I)" aria-label="Italic">
            <i>I</i>
          </button>
          <button type="button" className={`a-be-tbtn ${fmt.underline ? "is-active" : ""}`} onClick={() => toggleInlineCmd("underline")} title="Underline (Ctrl+U)" aria-label="Underline">
            <u>U</u>
          </button>
          <button type="button" className={`a-be-tbtn ${fmt.strike ? "is-active" : ""}`} onClick={() => toggleInlineCmd("strikeThrough")} title="Strikethrough" aria-label="Strikethrough">
            <s>S</s>
          </button>
          <button type="button" className="a-be-tbtn" onClick={() => toggleInlineCmd("code")} title="Inline Code" aria-label="Inline Code">
            &lt;/&gt;
          </button>
          <button type="button" className={`a-be-tbtn ${fmt.linkHref ? "is-active" : ""}`} onClick={(e) => openLinkPopover(e.currentTarget)} title="Insert or Edit Link (Ctrl+K)" aria-label="Insert Link">
            <Icon name="link" />
          </button>
          <button type="button" className="a-be-tbtn" onClick={() => toggleInlineCmd("removeFormat")} title="Clear Formatting" aria-label="Clear Formatting">
            <Icon name="clearFormat" />
          </button>
        </div>

        <div className="a-be-toolbar-sep" aria-hidden="true" />

        <div className="a-be-toolbar-group">
          <button type="button" className={`a-be-tbtn ${fmt.ul ? "is-active" : ""}`} onClick={() => toggleInlineCmd("insertUnorderedList")} title="Bulleted List" aria-label="Bulleted List">
            <Icon name="list" />
          </button>
          <button type="button" className={`a-be-tbtn ${fmt.ol ? "is-active" : ""}`} onClick={() => toggleInlineCmd("insertOrderedList")} title="Numbered List" aria-label="Numbered List">
            <Icon name="olist" />
          </button>
          <button type="button" className={`a-be-tbtn ${fmt.blockTag === "quote" ? "is-active" : ""}`} onClick={() => applyBlockFormat("quote")} title="Blockquote" aria-label="Blockquote">
            <Icon name="quote" />
          </button>
          <button type="button" className={`a-be-tbtn ${fmt.blockTag === "callout" ? "is-active" : ""}`} onClick={() => applyBlockFormat("callout")} title="Callout Box" aria-label="Callout Box">
            <Icon name="callout" />
          </button>
        </div>

        <div className="a-be-toolbar-sep" aria-hidden="true" />

        <div className="a-be-toolbar-group">
          <button type="button" className="a-be-tbtn" onClick={() => insertBlockAtCursor("image")} title="Insert Image">
            <Icon name="image" /> Image
          </button>
          <button type="button" className="a-be-tbtn" onClick={() => insertBlockAtCursor("table")} title="Insert Table">
            <Icon name="table" /> Table
          </button>
          <button type="button" className="a-be-tbtn" onClick={() => insertBlockAtCursor("html")} title="Insert Custom HTML & CSS">
            <Icon name="html" /> HTML
          </button>
          <button
            type="button"
            className="a-be-tbtn a-be-tbtn-insert"
            aria-expanded={Boolean(insertMenuPos)}
            onClick={(e) => {
              if (insertMenuPos) {
                setInsertMenuPos(null);
              } else {
                const rect = e.currentTarget.getBoundingClientRect();
                setInsertMenuPos({
                  top: rect.bottom + 6,
                  left: Math.max(12, Math.min(rect.left, window.innerWidth - 290)),
                });
              }
            }}
            title="Insert more elements"
          >
            <Icon name="plus" /> Insert
          </button>
        </div>
      </div>

      {headerSlot}

      <div
        ref={docRef}
        className="a-be-doc"
        onClick={(e) => {
          if (e.target === docRef.current) {
            const flows = docRef.current.querySelectorAll<HTMLDivElement>(".a-be-flow");
            const lastFlow = flows[flows.length - 1];
            lastFlow?.focus();
          }
        }}
      >
        {segments.map((seg, sIdx) => {
          if (seg.kind === "flow") {
            return (
              <RichFlowSurface
                key={`flow-${seg.startIndex}`}
                blocks={seg.blocks}
                syncVersion={syncVersion}
                isFirst={sIdx === 0}
                isOnly={segments.length === 1}
                onChangeBlocks={(nextFlowBlocks) =>
                  updateFlowSegment(seg.startIndex, seg.blocks.length, nextFlowBlocks)
                }
                onActiveFlowRef={(el) => {
                  activeFlowRef.current = el;
                }}
                onSelectionStateChange={inspectSelectionState}
              />
            );
          }

          return (
            <div key={seg.block.id} className="a-be-widget" contentEditable={false}>
              <div className="a-be-widget-bar">
                <div className="a-be-widget-actions">
                  <button type="button" className="a-be-tool" aria-label="Move up" title="Move up" disabled={seg.index === 0} onClick={() => moveWidget(seg.index, -1)}>
                    <Icon name="up" />
                  </button>
                  <button type="button" className="a-be-tool" aria-label="Move down" title="Move down" disabled={seg.index === blocks.length - 1} onClick={() => moveWidget(seg.index, 1)}>
                    <Icon name="down" />
                  </button>
                  <button type="button" className="a-be-tool danger" aria-label="Delete" title="Remove block" onClick={() => removeWidget(seg.index)}>
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
              <WidgetBody
                block={seg.block}
                theme={theme}
                onChange={(updated) => updateWidget(seg.index, updated)}
              />
            </div>
          );
        })}
      </div>

      <div className="a-be-words" aria-live="polite">
        <span>{words} {words === 1 ? "word" : "words"}</span>
        <span aria-hidden="true">·</span>
        <span>{minutes} min read</span>
      </div>

      {insertMenuPos && (
        <div
          ref={insertMenuRef}
          className="a-be-menu"
          role="menu"
          style={{ top: insertMenuPos.top, left: insertMenuPos.left }}
        >
          <div className="a-be-menu-label">Insert into post</div>
          {EXTRA_WIDGET_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="a-be-menu-item"
              onClick={() => insertBlockAtCursor(item.type)}
            >
              <Icon name={item.icon} />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {linkDialog && (
        <form
          className="a-be-bubble-link"
          style={{ top: linkDialog.top, left: linkDialog.left }}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            applyLinkFromDialog(linkDialog.url);
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            ref={linkInputRef}
            type="text"
            placeholder="https://example.com or /page"
            aria-label="Hyperlink URL"
            value={linkDialog.url}
            onChange={(e) => setLinkDialog({ ...linkDialog, url: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setLinkDialog(null);
                linkDialog.flowEl.focus();
              }
            }}
          />
          <button type="submit">Apply</button>
          <button type="button" className="is-danger" onClick={() => applyLinkFromDialog("")}>
            Unlink
          </button>
        </form>
      )}
    </div>
  );
}

/* ==========================================================================
   WIDGET BODIES (Image, Gallery, Video, Audio, HTML, Markdown, Table, etc.)
   ========================================================================== */
function WidgetBody({
  block,
  theme,
  onChange,
}: {
  block: EditorBlock;
  theme: "light" | "dark";
  onChange: (block: EditorBlock) => void;
}) {
  switch (block.type) {
    case "image":
      return (
        <div className="a-be-card">
          <span className="a-be-kicker">Image</span>
          <ImagePicker url={block.url} onUrl={(url) => onChange({ ...block, url })} />
          <div className="a-be-inline">
            <input className="a-be-field" value={block.alt} placeholder="Alt text (describe the image)" aria-label="Image alt text" onChange={(e) => onChange({ ...block, alt: e.target.value })} />
            <input className="a-be-field" value={block.caption} placeholder="Caption (optional)" aria-label="Image caption" onChange={(e) => onChange({ ...block, caption: e.target.value })} />
          </div>
        </div>
      );
    case "gallery":
      return (
        <div className="a-be-card">
          <span className="a-be-kicker">Gallery · {block.images.length} {block.images.length === 1 ? "image" : "images"}</span>
          <div className="a-be-gal">
            {block.images.map((img, i) => (
              <div key={i} className="a-be-gal-item">
                <ImagePicker compact url={img.url} onUrl={(url) => onChange({ ...block, images: block.images.map((it, n) => (n === i ? { ...it, url } : it)) })} />
                <input className="a-be-field" value={img.alt} placeholder="Alt text" aria-label={`Gallery image ${i + 1} alt`} onChange={(e) => onChange({ ...block, images: block.images.map((it, n) => (n === i ? { ...it, alt: e.target.value } : it)) })} />
              </div>
            ))}
            <button type="button" className="a-be-gal-add" onClick={() => onChange({ ...block, images: [...block.images, { url: "", alt: "" }] })}>
              <Icon name="imagePlus" /> Add image
            </button>
          </div>
        </div>
      );
    case "video":
    case "audio": {
      const video = block.type === "video" ? videoEmbedSrc(block.url) : null;
      const audio = block.type === "audio" ? audioEmbed(block.url) : null;
      return (
        <div className="a-be-card">
          <span className="a-be-kicker">{block.type === "video" ? "Video" : "Audio"}</span>
          <input
            className="a-be-field"
            value={block.url}
            placeholder={block.type === "video" ? "YouTube or Vimeo link" : "Spotify or direct https audio link"}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
          />
          {video && (
            <div className="a-be-ratio">
              <iframe title="Video preview" src={video} sandbox="allow-scripts allow-same-origin allow-presentation" />
            </div>
          )}
          {audio?.kind === "file" && <audio controls src={audio.src} style={{ width: "100%" }} />}
        </div>
      );
    }
    case "html":
      return <HtmlWidget block={block} onChange={onChange} />;
    case "markdown":
      return <MarkdownWidget block={block} theme={theme} onChange={onChange} />;
    case "table":
      return <TableWidget block={block} onChange={onChange} />;
    case "button":
      return (
        <div className="a-be-card">
          <span className="a-be-kicker">Button</span>
          <div className="a-be-inline">
            <input className="a-be-field" value={block.label} placeholder="Label" onChange={(e) => onChange({ ...block, label: e.target.value })} />
            <input className="a-be-field" value={block.href} placeholder="https:// or /page" onChange={(e) => onChange({ ...block, href: e.target.value })} />
          </div>
          <div><span className="a-be-btn-preview">{block.label.trim() || "Button"}</span></div>
        </div>
      );
    case "code":
      return (
        <div className="a-be-card">
          <div className="a-be-card-head">
            <span className="a-be-kicker">Code</span>
            <input className="a-be-field a-be-lang" value={block.language} placeholder="Language" onChange={(e) => onChange({ ...block, language: e.target.value })} />
          </div>
          <textarea className="a-be-area" value={block.code} spellCheck={false} placeholder="Paste code" onChange={(e) => onChange({ ...block, code: e.target.value })} />
        </div>
      );
    default:
      return null;
  }
}

const BLOCKED_TAGS = "script,iframe,frame,frameset,object,embed,link,meta,base,applet,form,noscript,template";
const URL_ATTRS = ["href", "src", "action", "formaction", "xlink:href", "poster", "srcset"];

function sanitizeForPreview(input: string): string {
  const doc = new DOMParser().parseFromString(input, "text/html");
  doc.querySelectorAll(BLOCKED_TAGS).forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      else if (URL_ATTRS.includes(name) && /^(javascript|vbscript|data):/i.test(value) && !/^data:image\//i.test(value)) el.removeAttribute(attr.name);
    }
  });
  const headStyles = Array.from(doc.head.querySelectorAll("style")).map((n) => n.outerHTML).join("");
  return headStyles + doc.body.innerHTML;
}

function HtmlWidget({
  block,
  onChange,
}: {
  block: Extract<EditorBlock, { type: "html" }>;
  onChange: (block: EditorBlock) => void;
}) {
  const [rendered, setRendered] = useState(block.html);
  const [showCode, setShowCode] = useState(true);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setRendered(block.html), 180);
    return () => window.clearTimeout(t);
  }, [block.html]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const root = el.shadowRoot ?? el.attachShadow({ mode: "open" });
    root.innerHTML = `<style>:host{display:block;overflow-x:auto;color:inherit;font-family:inherit}</style>${sanitizeForPreview(rendered)}`;
  }, [rendered, showCode]);

  return (
    <div className="a-be-card">
      <div className="a-be-card-head">
        <span className="a-be-kicker">Custom HTML &amp; CSS</span>
        <div className="a-be-chips">
          <button type="button" className="a-be-chip" onClick={() => setShowCode((v) => !v)}>
            {showCode ? "Hide code" : "Edit code"}
          </button>
          <button type="button" className="a-be-convert" onClick={() => setRendered(block.html)} disabled={!block.html.trim()}>
            Refresh preview
          </button>
        </div>
      </div>
      {showCode && (
        <textarea
          className="a-be-area"
          value={block.html}
          spellCheck={false}
          placeholder={"<style>\n  table { border-collapse: collapse; width: 100%; }\n  td, th { border: 1px solid #ccc; padding: 8px 12px; }\n</style>\n<table>\n  <tr><th>Town</th><th>Inches</th></tr>\n  <tr><td>Denver</td><td>8</td></tr>\n</table>"}
          onChange={(e) => onChange({ ...block, html: e.target.value })}
        />
      )}
      {rendered.trim() && <div ref={host} className="a-be-html-out" />}
    </div>
  );
}

function MarkdownWidget({
  block,
  theme,
  onChange,
}: {
  block: Extract<EditorBlock, { type: "markdown" }>;
  theme: "light" | "dark";
  onChange: (block: EditorBlock) => void;
}) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  return (
    <div className="a-be-card">
      <div className="a-be-card-head">
        <span className="a-be-kicker">Markdown</span>
        <div className="a-be-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "edit"} onClick={() => setMode("edit")}>Edit</button>
          <button type="button" role="tab" aria-selected={mode === "preview"} onClick={() => setMode("preview")}>Preview</button>
        </div>
      </div>
      {mode === "edit" ? (
        <textarea className="a-be-area" value={block.markdown} placeholder="## Heading\n\nParagraph with **bold**." onChange={(e) => onChange({ ...block, markdown: e.target.value })} />
      ) : (
        <iframe className="a-be-frame" title="Markdown preview" sandbox="allow-same-origin" srcDoc={htmlDocument(markdownToHtml(block.markdown), theme)} />
      )}
    </div>
  );
}

function TableWidget({
  block,
  onChange,
}: {
  block: Extract<EditorBlock, { type: "table" }>;
  onChange: (block: EditorBlock) => void;
}) {
  const cols = Math.max(1, ...block.rows.map((row) => row.length));
  function setCell(r: number, c: number, value: string) {
    onChange({ ...block, rows: block.rows.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row)) });
  }
  return (
    <div className="a-be-card">
      <div className="a-be-card-head">
        <span className="a-be-kicker">Table</span>
        <div className="a-be-chips">
          <button type="button" className="a-be-chip" onClick={() => onChange({ ...block, hasHeader: !block.hasHeader })}>{block.hasHeader ? "Header on" : "Header off"}</button>
          <button type="button" className="a-be-chip" onClick={() => onChange({ ...block, rows: [...block.rows, Array(cols).fill("")] })}>Add row</button>
          <button type="button" className="a-be-chip" onClick={() => onChange({ ...block, rows: block.rows.map((r) => [...r, ""]) })}>Add column</button>
          <button type="button" className="a-be-chip" onClick={() => block.rows.length > 1 && onChange({ ...block, rows: block.rows.slice(0, -1) })}>Remove row</button>
          <button type="button" className="a-be-chip" onClick={() => cols > 1 && onChange({ ...block, rows: block.rows.map((r) => r.slice(0, -1)) })}>Remove column</button>
        </div>
      </div>
      <div className="a-be-table-wrap">
        <table className="a-be-table">
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {Array.from({ length: cols }, (_, c) => {
                  const Cell = block.hasHeader && r === 0 ? "th" : "td";
                  return (
                    <Cell key={c}>
                      <input aria-label={`Row ${r + 1} column ${c + 1}`} value={row[c] ?? ""} onChange={(e) => setCell(r, c, e.target.value)} />
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ==========================================================================
   POST EDITOR (DEFAULT & NAMED EXPORT)
   ========================================================================== */
type SlugState = "idle" | "checking" | "free" | "taken" | "invalid";

export function PostEditor({
  initial = null,
  tagSuggestions = ["Snow Day", "Winter Weather", "School Closures", "Forecast", "Canada", "USA"],
}: {
  initial?: EditorInitial | null;
  tagSuggestions?: string[];
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextToastId = useRef(1);

  const dismissToast = useCallback((toastId: number) => {
    setToasts((list) => list.filter((t) => t.id !== toastId));
  }, []);

  const pushToast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const toastId = nextToastId.current++;
      setToasts((list) => [...list.slice(-3), { id: toastId, message, kind }]);
      window.setTimeout(() => dismissToast(toastId), kind === "error" ? 6000 : 3500);
    },
    [dismissToast]
  );

  const [pending, startTransition] = useTransition();
  const isNew = initial === null;
  const imageRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const [id, setId] = useState<number | undefined>(initial?.id);
  const [published, setPublishedState] = useState(initial?.published ?? false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [slugUnlocked, setSlugUnlocked] = useState(!initial?.published);
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial?.date ?? (isNew ? todayISO() : ""));
  const [updated, setUpdated] = useState(initial?.updated ?? "");
  const [autoRead, setAutoRead] = useState(isNew);
  const [readText, setReadText] = useState(String(initial?.readMinutes ?? 5));
  const [image, setImage] = useState(initial?.image ?? "");
  const [imageAlt, setImageAlt] = useState(initial?.imageAlt ?? "");
  const [imageBroken, setImageBroken] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(Boolean(initial?.image));

  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => sectionsToBlocks(initial?.sections ?? []));

  const [view, setView] = useState<"edit" | "preview">("edit");
  const [issues, setIssues] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [focusMode, setFocusMode] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("be-theme");
      if (saved === "dark" || saved === "light") { setTheme(saved); return; }
    } catch { /* ignore */ }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("be-theme", next); } catch { /* ignore */ }
  }

  useEffect(() => {
    if (image.trim()) setShowCoverPicker(true);
  }, [image]);

  const sectionInputs = useMemo(() => blocksToSectionInputs(blocks), [blocks]);
  
  // Use any to prevent TS complaints due to nested types mismatches from the local SectionInput
  const previewSections = useMemo(
    () => (sectionInputs as any[]).map((s) => toPostSection(s)).filter((s) => Object.keys(s).length > 0),
    [sectionInputs]
  );
  
  const readMinutes = autoRead ? estimateReadMinutes(previewSections as PostSection[]) : Number.parseInt(readText, 10) || 0;

  const snapshot = useMemo(
    () => JSON.stringify({ title, slug, description, date, updated, readMinutes, image, imageAlt, tags, sections: sectionInputs }),
    [title, slug, description, date, updated, readMinutes, image, imageAlt, tags, sectionInputs]
  );
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const dirty = snapshot !== savedSnapshot;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = UNSAVED_MESSAGE; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!slug) { setSlugState("idle"); return; }
    if (!SLUG_RE.test(slug)) { setSlugState("invalid"); return; }
    if (initial && slug === initial.slug && id === initial.id) { setSlugState("idle"); return; }
    let cancelled = false;
    setSlugState("checking");
    const timer = window.setTimeout(async () => {
      try {
        const res = await checkSlugAvailable(slug, id);
        if (cancelled) return;
        if (!res.ok) {
          setSlugState("invalid");
        } else {
          const isAvail = "available" in res ? Boolean(res.available) : false;
          setSlugState(isAvail ? "free" : "taken");
        }
      } catch {
        if (!cancelled) setSlugState("idle");
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [slug, id, initial]);

  useEffect(() => { setImageBroken(false); }, [image]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title, view, focusMode, showSettings]);

  function run(mode: SaveMode) {
    if (pending) return;
    setIssues([]);
    setFieldErrors({});
    const snapAtSave = snapshot;

    const payload: PostInput = {
      id,
      title,
      slug,
      description,
      date,
      updated,
      readMinutes,
      image,
      imageAlt,
      tags,
      sections: sectionInputs,
    };

    startTransition(async () => {
      try {
        const res = await savePost(payload, mode);
        if (!res.ok) {
          // Cast res safely since 'issues' and 'fieldErrors' are on Failure type from actions.ts
          const failure = res as { error?: string; issues?: string[]; fieldErrors?: Record<string, string> };
          const errorMsg = failure.error || "Could not save the post.";
          setIssues(failure.issues ?? [errorMsg]);
          setFieldErrors(failure.fieldErrors ?? {});
          pushToast(errorMsg, "error");
          return;
        }

        const wasNew = id === undefined;
        // Since res.ok is true, we assume it's a Success type with id, slug, published
        const success = res as any; 
        setId(success.id);
        setSlug(success.slug);
        setPublishedState(success.published);
        setSlugUnlocked(!success.published);
        setConfirmUnpublish(false);
        setSavedSnapshot(snapAtSave);

        if (wasNew && typeof window !== "undefined") {
          window.history.replaceState(null, "", `/admin/posts/${success.id}/edit`);
        }

        pushToast(
          mode === "publish"
            ? "Published. The post is live."
            : mode === "unpublish"
            ? "Unpublished. The post is now a draft."
            : success.published
            ? "Changes saved. They are live."
            : "Draft saved.",
          "success"
        );
      } catch {
        pushToast("Network or server error while saving. Please try again.", "error");
      }
    });
  }

  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        runRef.current("save");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const imageOk = image.trim() !== "" && isValidImage(image.trim());
  const checks = [
    { ok: title.trim() !== "" && SLUG_RE.test(slug) && slugState !== "taken", label: "Title and a valid slug" },
    { ok: description.trim() !== "", label: "Meta description" },
    { ok: isValidDate(date), label: "Publish date" },
    { ok: imageOk, label: "Image URL" },
    { ok: imageAlt.trim() !== "", label: "Image alt text" },
    { ok: previewSections.length > 0, label: "At least one section with content" },
  ];
  const ready = checks.every((c) => c.ok);
  const slugLocked = published && !slugUnlocked;
  const descLen = description.trim().length;
  const sidebarHidden = focusMode || !showSettings;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EDITOR_CSS }} />
      <div className={`a-editor ${focusMode ? "is-focus" : ""}`} data-be-theme={theme}>
        <div className="a-editorbar">
          <div className="a-editorbar-left">
            <StatusBadge published={published} />
            <span className={`a-savestate ${dirty ? "is-dirty" : ""}`} aria-live="polite">
              {pending ? "Saving…" : dirty ? "Unsaved changes" : isNew && id === undefined ? "Not saved yet" : "All changes saved"}
            </span>
          </div>
          <div className="a-editorbar-right">
            {published && slug && (
              <a
                className="btn btn-ghost btn-sm"
                href={`/blog/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="external" /> View live
              </a>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={toggleTheme} aria-pressed={theme === "dark"}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (focusMode) {
                  setFocusMode(false);
                  setShowSettings(true);
                } else {
                  setShowSettings((v) => !v);
                }
              }}
              aria-pressed={!sidebarHidden}
              disabled={view === "preview"}
            >
              {sidebarHidden ? "Show settings" : "Hide settings"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setFocusMode((v) => !v)}
              aria-pressed={focusMode}
              disabled={view === "preview"}
            >
              {focusMode ? "Exit focus" : "Focus mode"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run("save")}>
              {pending ? "Saving…" : published ? "Save changes" : "Save draft"}
            </button>
            {published ? (
              <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setConfirmUnpublish(true)}>
                <Icon name="download" /> Unpublish
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run("publish")}>
                <Icon name="upload" /> Publish
              </button>
            )}
          </div>
        </div>

        {issues.length > 0 && (
          <div className="error-box a-issues" role="alert">
            <Icon name="alert" />
            <div>
              <strong>Fix these before saving:</strong>
              <ul>{issues.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          </div>
        )}

        <div className="a-editor-subbar">
          <div className="a-tabs" role="tablist" aria-label="Editor view">
            <button type="button" role="tab" aria-selected={view === "edit"} onClick={() => setView("edit")}>Write</button>
            <button type="button" role="tab" aria-selected={view === "preview"} onClick={() => setView("preview")}>Live preview</button>
          </div>
        </div>

        {view === "preview" ? (
          <div className="glass a-card a-preview">
            <p className="a-hint">This is how the post body will look on the site. Unsaved changes are included.</p>
            <div className="prose">
              <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}>{title.trim() || "Untitled post"}</h1>
              <p className="post-meta">{formatPostDate(date)} · {readMinutes || "?"} min read</p>
              {imageOk && !imageBroken && (
                <div className="post-hero" style={{ position: "relative", aspectRatio: "16/9", borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
                  <img src={image.trim()} alt={imageAlt} onError={() => setImageBroken(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              {previewSections.length ? <PostSections sections={previewSections as PostSection[]} /> : <p>No content yet. Start writing on the Write tab.</p>}
            </div>
          </div>
        ) : (
          <div className={`a-editor-grid ${sidebarHidden ? "is-solo" : ""}`}>
            <div className="a-col-main">
              <div className="a-sheet">
                <BlockCanvas
                  blocks={blocks}
                  onChange={setBlocks}
                  theme={theme}
                  headerSlot={
                    <>
                      {showCoverPicker ? (
                        <div className="a-cover-wrap">
                          <ImagePicker
                            variant="cover"
                            hideUrl
                            url={image}
                            onUrl={(nextUrl) => {
                              setImage(nextUrl);
                              if (!nextUrl) setShowCoverPicker(false);
                            }}
                            onBroken={setImageBroken}
                            onError={(message) => pushToast(message, "error")}
                            onUploaded={() => pushToast("Featured image uploaded.", "success")}
                          />
                          {!image.trim() && (
                            <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
                              <button type="button" className="a-be-linkish" onClick={() => setShowCoverPicker(false)}>
                                Hide cover uploader
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="a-cover-toggle-bar">
                          <button type="button" className="a-be-linkish" onClick={() => setShowCoverPicker(true)}>
                            + Add featured cover image
                          </button>
                        </div>
                      )}
                      <div className="a-sheet-inner">
                        <label className="a-field a-titlefield">
                          <span className="sr-only">Title</span>
                          <textarea
                            ref={titleRef}
                            className="a-be-title"
                            rows={1}
                            value={title}
                            maxLength={200}
                            placeholder="Post title…"
                            aria-invalid={Boolean(fieldErrors.title)}
                            onChange={(e) => {
                              setTitle(e.target.value);
                              if (!slugTouched) setSlug(slugify(e.target.value));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                document.querySelector<HTMLElement>(".a-be .a-be-flow")?.focus();
                              }
                            }}
                          />
                          {fieldErrors.title && <span className="a-error">{fieldErrors.title}</span>}
                        </label>
                        {fieldErrors.sections && <p className="a-error" style={{ marginTop: 10 }}>{fieldErrors.sections}</p>}
                      </div>
                    </>
                  }
                />
              </div>
            </div>

            {!sidebarHidden && (
              <aside className="a-col-side">
                <div className="glass a-card">
                  <h3>Search listing</h3>
                  <label className="a-field">
                    <span className="a-label">URL slug</span>
                    <div className="a-slug">
                      <span className="a-slug-prefix">/blog/</span>
                      <input
                        className="a-input"
                        value={slug}
                        maxLength={100}
                        readOnly={slugLocked}
                        aria-invalid={Boolean(fieldErrors.slug) || slugState === "invalid" || slugState === "taken"}
                        onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }}
                        onBlur={() => setSlug((s) => slugify(s))}
                        placeholder="how-much-snow-closes-school"
                      />
                      {slugLocked && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSlugUnlocked(true)}>
                          <Icon name="lock" /> Unlock
                        </button>
                      )}
                    </div>
                    {slugState === "checking" && <span className="a-hint">Checking availability…</span>}
                    {slugState === "free" && <span className="a-ok">Available</span>}
                    {slugState === "taken" && <span className="a-error">Another post already uses this slug.</span>}
                    {slugState === "invalid" && <span className="a-error">Use lowercase letters, numbers and single hyphens only.</span>}
                    {fieldErrors.slug && <span className="a-error">{fieldErrors.slug}</span>}
                  </label>
                  <label className="a-field">
                    <span className="a-label">
                      Meta description
                      <span className={`a-counter ${descLen > 160 ? "is-warn" : descLen >= 120 ? "is-good" : ""}`}>{descLen}/500 · aim for 120–160</span>
                    </span>
                    <textarea
                      className="a-input a-textarea"
                      rows={3}
                      value={description}
                      maxLength={500}
                      aria-invalid={Boolean(fieldErrors.description)}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="One or two sentences that make someone want to click."
                    />
                    {fieldErrors.description && <span className="a-error">{fieldErrors.description}</span>}
                  </label>
                  <SnippetPreview title={title} slug={slug} description={description} />
                </div>

                <div className="glass a-card">
                  <h3>Featured image</h3>
                  <p className="a-hint">Upload it in the cover area above the title. Every image is cropped to 16:9 ({IMAGE_SIZE_LABEL}) automatically.</p>
                  <label className="a-field">
                    <span className="a-label">Image URL</span>
                    <input
                      ref={imageRef}
                      className="a-input"
                      value={image}
                      aria-invalid={Boolean(fieldErrors.image)}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="/blog/snow.svg or https://…"
                    />
                    {fieldErrors.image && <span className="a-error">{fieldErrors.image}</span>}
                  </label>
                  <label className="a-field">
                    <span className="a-label">Alt text <span className="a-counter">{imageAlt.length}/300</span></span>
                    <textarea
                      className="a-input a-textarea"
                      rows={2}
                      value={imageAlt}
                      maxLength={300}
                      aria-invalid={Boolean(fieldErrors.imageAlt)}
                      onChange={(e) => setImageAlt(e.target.value)}
                      placeholder="Describe the image for people who can't see it"
                    />
                    {fieldErrors.imageAlt && <span className="a-error">{fieldErrors.imageAlt}</span>}
                  </label>
                </div>

                <div className="glass a-card">
                  <h3>Details</h3>
                  <label className="a-field">
                    <span className="a-label">Publish date</span>
                    <input
                      className="a-input"
                      type="date"
                      value={date}
                      aria-invalid={Boolean(fieldErrors.date)}
                      onChange={(e) => setDate(e.target.value)}
                    />
                    {fieldErrors.date && <span className="a-error">{fieldErrors.date}</span>}
                  </label>
                  <label className="a-field">
                    <span className="a-label">Updated date <em>(optional)</em></span>
                    <div className="a-inline">
                      <input
                        className="a-input"
                        type="date"
                        value={updated}
                        aria-invalid={Boolean(fieldErrors.updated)}
                        onChange={(e) => setUpdated(e.target.value)}
                      />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUpdated(todayISO())}>Today</button>
                    </div>
                    {fieldErrors.updated && <span className="a-error">{fieldErrors.updated}</span>}
                  </label>
                  <div className="a-field">
                    <span className="a-label">Read time (minutes)</span>
                    <div className="a-inline">
                      <input
                        className="a-input"
                        type="number"
                        min={1}
                        max={180}
                        value={autoRead ? String(readMinutes) : readText}
                        disabled={autoRead}
                        onChange={(e) => setReadText(e.target.value)}
                        aria-label="Read time in minutes"
                      />
                      <label className="a-check">
                        <input
                          type="checkbox"
                          checked={autoRead}
                          onChange={(e) => {
                            if (!e.target.checked) setReadText(String(readMinutes || 5));
                            setAutoRead(e.target.checked);
                          }}
                        />{" "}
                        Auto
                      </label>
                    </div>
                  </div>
                </div>

                <div className="glass a-card">
                  <h3>Tags</h3>
                  <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
                </div>

                <div className="glass a-card">
                  <h3>Ready to publish?</h3>
                  <ul className="a-checklist">
                    {checks.map((c) => (
                      <li key={c.label} data-ok={c.ok}>
                        <span className="a-checkmark" aria-hidden="true">
                          {c.ok ? <Icon name="check" className="a-icon a-icon-sm" /> : null}
                        </span>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                  <p className="a-hint">{ready ? "Everything needed is in place." : "Drafts can be saved with missing items. Publishing needs all of them."}</p>
                </div>
              </aside>
            )}
          </div>
        )}

        <ConfirmDialog
          open={confirmUnpublish}
          title="Unpublish this post?"
          confirmLabel="Save and unpublish"
          busy={pending}
          onConfirm={() => run("unpublish")}
          onCancel={() => setConfirmUnpublish(false)}
        >
          <p>The post becomes a draft and disappears from the blog, home page and sitemap.</p>
        </ConfirmDialog>
      </div>

      <div className="a-toasts" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`a-toast a-toast-${t.kind}`} role={t.kind === "error" ? "alert" : "status"}>
            <Icon name={t.kind === "error" ? "alert" : "check"} />
            <span>{t.message}</span>
            <button type="button" className="a-toast-x" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
              <Icon name="close" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export default PostEditor;
