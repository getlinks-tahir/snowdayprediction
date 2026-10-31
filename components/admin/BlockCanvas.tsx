"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactPaste,
  type KeyboardEvent as ReactKey,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  audioEmbed,
  countWords,
  createBlock,
  htmlDocument,
  isSafeMediaUrl,
  markdownToHtml,
  videoEmbedSrc,
  type ContentBlock,
  type EditorBlock,
  type HeadingLevel,
} from "@/lib/admin/blocks";
import { uploadBlogImage } from "@/lib/admin/upload-actions";
import "./block-editor.css";

/* ------------------------------------------------------------------ */
/*  Standard image size                                               */
/* ------------------------------------------------------------------ */
export const IMAGE_WIDTH = 1600;
export const IMAGE_HEIGHT = 900;
export const IMAGE_SIZE_LABEL = `${IMAGE_WIDTH} × ${IMAGE_HEIGHT}`;

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const ALLOWED_TYPES = ACCEPT.split(",");
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_FINAL_BYTES = 5 * 1024 * 1024;

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

/* ------------------------------------------------------------------ */
/*  Icons                                                             */
/* ------------------------------------------------------------------ */
type IconName =
  | "plus" | "up" | "down" | "trash" | "paragraph" | "h1" | "h2" | "h3"
  | "list" | "olist" | "quote" | "minus" | "image" | "gallery" | "video" | "audio"
  | "html" | "markdown" | "table" | "button" | "callout" | "code" | "imagePlus"
  | "upload" | "replace" | "link" | "close" | "undo" | "redo" | "clearFormat";

function Icon({ name }: { name: IconName }) {
  const common = {
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
    default: return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Clean Inline HTML Sanitizer & Smart Clipboard Parser              */
/* ------------------------------------------------------------------ */

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

/**
 * Sanitizes inline rich text so block-level tags (<p>, <div>, <h1>-<h6>, <span>)
 * never leak into block.text as visible literal HTML tags, while keeping
 * clean <b>, <i>, <u>, <s>, <code>, and <a href="..."> anchor tags.
 */
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

    if (tag === "br") return "";
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
    .trim();
}

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

/* ------------------------------------------------------------------ */
/*  Continuous Rich-Text Flow <-> EditorBlock[] Conversion            */
/* ------------------------------------------------------------------ */

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

/**
 * Converts an array of flow EditorBlocks into clean HTML for the single continuous
 * Blogger / WordPress / Google Docs writing surface.
 */
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

/**
 * Parses the live DOM inside a continuous RichFlowSurface back into structured EditorBlock[]
 * so PostEditor and blocksToSectionInputs work seamlessly.
 */
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

  // Drop trailing empty paragraphs if there are other blocks, but always keep at least 1 paragraph
  if (out.length === 0) {
    return [createBlock("paragraph")];
  }
  return out;
}

/**
 * Smart Paste sanitizer for pasting 1,500+ word Google Docs / Word / Web articles
 * directly into the continuous document surface.
 */
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

        // Unwrap Google Docs <b style="font-weight:normal" id="docs-internal-guid-...">
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

  // Fallback: Convert plain text / Markdown into clean semantic HTML paragraphs, headings, and lists
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

/* ------------------------------------------------------------------ */
/*  Continuous RichFlowSurface Component                              */
/* ------------------------------------------------------------------ */
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

  // Sync external state changes (initial load, Undo/Redo, or widget split) into DOM
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

    // Single-line plain paste inside an existing line -> insert inline
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

    // Inline formatting shortcuts (Ctrl+B, Ctrl+I, Ctrl+U)
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === "b" || k === "i" || k === "u") {
        e.preventDefault();
        document.execCommand(k === "b" ? "bold" : k === "i" ? "italic" : "underline");
        emitChange();
        return;
      }
    }

    // When pressing Enter at the end of a Heading (H1/H2/H3) or Blockquote, ensure the new line is a normal Paragraph
    if (e.key === "Enter" && !e.shiftKey) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const node = sel.anchorNode;
        const elem = node?.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement;
        const headingOrQuote = elem?.closest("h1, h2, h3, blockquote, div[data-callout='true']");
        if (headingOrQuote && el.contains(headingOrQuote)) {
          // Let browser split or create line, then ensure the new empty block is <p>
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

/* ------------------------------------------------------------------ */
/*  Image Picker                                                      */
/* ------------------------------------------------------------------ */
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
      if (prepared.size > MAX_FINAL_BYTES) return fail("Image is still over 5 MB after resizing. Try a smaller file.");
      const formData = new FormData();
      formData.append("file", prepared);
      const result = await uploadBlogImage(formData);
      if (!result.ok) return fail(result.error);
      onUrlRef.current(result.url);
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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

function useTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return theme;
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

/* ------------------------------------------------------------------ */
/*  BlockCanvas (Blogger / WordPress / Google Docs Continuous Mode)   */
/* ------------------------------------------------------------------ */

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

export default function BlockCanvas({
  blocks,
  onChange,
  theme: themeProp,
  headerSlot,
}: {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  theme?: "light" | "dark";
  headerSlot?: ReactNode;
}) {
  const detected = useTheme();
  const theme = themeProp ?? detected;

  // syncVersion only increments on external changes (Undo/Redo, widget insert/delete) so typing never resets the DOM cursor
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

  // Group consecutive text/list/heading blocks into a single continuous RichFlowSurface,
  // and keep embedded media/HTML/table blocks as inline widgets between flow segments.
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

    // Ensure there is always a continuous writing area at the end of the document
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

    // If inside a Callout and switching to something else, unwrap callout attribute
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

  function toggleInlineCmd(cmd: "bold" | "italic" | "underline" | "strikeThrough" | "insertUnorderedList" | "insertOrderedList" | "removeFormat" | "code") {
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

  /**
   * Inserts a widget block (Image, Custom HTML, Table, Video, Audio, Gallery, Code, Markdown, Button)
   * right at the cursor position inside the document, automatically ensuring a continuous writing
   * paragraph exists below it so the user can keep typing without any extra clicks.
   */
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

    // Find which block ID the cursor is currently inside
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
      // If the last block is an empty paragraph, replace it and add a new trailing paragraph
      const last = next[next.length - 1];
      if (last && last.type === "paragraph" && !stripHtml(last.text)) {
        next.splice(next.length - 1, 1, widgetBlock);
        insertIdx = next.length - 1;
      } else {
        next.push(widgetBlock);
        insertIdx = next.length - 1;
      }
    }

    // Always ensure a paragraph exists after the inserted widget so writing continues seamlessly
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

  // Close Insert Menu on outside click or Escape
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

  // Focus link input when opened
  useEffect(() => {
    if (linkDialog && linkInputRef.current) {
      linkInputRef.current.focus();
      linkInputRef.current.select();
    }
  }, [linkDialog]);

  // Global keyboard shortcuts inside the document (Ctrl+K for link, Ctrl+Z / Ctrl+Y for undo/redo)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inDoc = docRef.current?.contains(target ?? null) ?? false;
      if (!inDoc) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (target?.closest(".a-be-flow")) {
          e.preventDefault();
          openLinkPopover();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  const words = countWords(blocks);
  const minutes = Math.max(1, Math.ceil(words / 200));

  return (
    <div className="a-be" data-be-theme={theme}>
      {/* Sticky Blogger / WordPress / Google Docs Formatting & Insert Toolbar */}
      <div className="a-be-toolbar" role="toolbar" aria-label="Formatting and insert toolbar" onMouseDown={(e) => {
        // Prevent toolbar button clicks from stealing selection from the writing area
        if ((e.target as HTMLElement).tagName !== "SELECT") {
          e.preventDefault();
        }
      }}>
        <div className="a-be-toolbar-group">
          <button
            type="button"
            className="a-be-tbtn"
            onClick={undo}
            disabled={!past.length}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Icon name="undo" />
          </button>
          <button
            type="button"
            className="a-be-tbtn"
            onClick={redo}
            disabled={!future.length}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
          >
            <Icon name="redo" />
          </button>
        </div>

        <div className="a-be-toolbar-sep" aria-hidden="true" />

        {/* Text Style Dropdown + Quick Heading Buttons */}
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

          <button
            type="button"
            className={`a-be-tbtn ${fmt.blockTag === "paragraph" ? "is-active" : ""}`}
            onClick={() => applyBlockFormat("paragraph")}
            title="Normal Paragraph"
          >
            P
          </button>
          <button
            type="button"
            className={`a-be-tbtn ${fmt.blockTag === "heading-1" ? "is-active" : ""}`}
            onClick={() => applyBlockFormat("heading-1")}
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            className={`a-be-tbtn ${fmt.blockTag === "heading-2" ? "is-active" : ""}`}
            onClick={() => applyBlockFormat("heading-2")}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            className={`a-be-tbtn ${fmt.blockTag === "heading-3" ? "is-active" : ""}`}
            onClick={() => applyBlockFormat("heading-3")}
            title="Heading 3"
          >
            H3
          </button>
        </div>

        <div className="a-be-toolbar-sep" aria-hidden="true" />

        {/* Inline Rich Text Formatting */}
        <div className="a-be-toolbar-group">
          <button
            type="button"
            className={`a-be-tbtn ${fmt.bold ? "is-active" : ""}`}
            onClick={() => toggleInlineCmd("bold")}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <b>B</b>
          </button>
          <button
            type="button"
            className={`a-be-tbtn ${fmt.italic ? "is-active" : ""}`}
            onClick={() => toggleInlineCmd("italic")}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <i>I</i>
          </button>
          <button
            type="button"
            className={`a-be-tbtn ${fmt.underline ? "is-active" : ""}`}
            onClick={() => toggleInlineCmd("underline")}
            title="Underline (Ctrl+U)"
            aria-label="Underline"
          >
            <u>U</u>
          </button>
          <button
            type="button"
            className={`a-be-tbtn ${fmt.strike ? "is-active" : ""}`}
            onClick={() => toggleInlineCmd("strikeThrough")}
            title="Strikethrough"
            aria-label="Strikethrough"
          >
            <s>S</s>
          </button>
          <button
            type="button"
            className="a-be-tbtn"
            onClick={() => toggleInlineCmd("code")}
            title="Inline Code"
            aria-label="Inline Code"
          >
            &lt;/&gt;
          </button>
          <button
            type="button"
            className={`a-be-tbtn ${fmt.linkHref ? "is-active" : ""}`}
            onClick={(e) => openLinkPopover(e.currentTarget)}
            title="Insert or Edit Link (Ctrl+K)"
            aria-label="Insert Link"
          >
            <Icon name="link" />
          </button>
          <button
            type="button"
            className="a-be-tbtn"
            onClick={() => toggleInlineCmd("removeFormat")}
            title="Clear Formatting"
            aria-label="Clear Formatting"
          >
            <Icon name="clearFormat" />
          </button>
        </div>

        <div className="a-be-toolbar-sep" aria-hidden="true" />

        {/* Lists, Quote & Callout */}
        <div className="a-be-toolbar-group">
          <button
            type="button"
            className={`a-be-tbtn ${fmt.ul ? "is-active" : ""}`}
            onClick={() => toggleInlineCmd("insertUnorderedList")}
            title="Bulleted List"
            aria-label="Bulleted List"
          >
            <Icon name="list" />
          </button>
          <button
            type="button"
            className={`a-be-tbtn ${fmt.ol ? "is-active" : ""}`}
            onClick={() => toggleInlineCmd("insertOrderedList")}
            title="Numbered List"
            aria-label="Numbered List"
          >
            <Icon name="olist" />
          </button>
          <button
            type="button"
            className={`a-be-tbtn ${fmt.blockTag === "quote" ? "is-active" : ""}`}
            onClick={() => applyBlockFormat("quote")}
            title="Blockquote"
            aria-label="Blockquote"
          >
            <Icon name="quote" />
          </button>
          <button
            type="button"
            className={`a-be-tbtn ${fmt.blockTag === "callout" ? "is-active" : ""}`}
            onClick={() => applyBlockFormat("callout")}
            title="Callout Box"
            aria-label="Callout Box"
          >
            <Icon name="callout" />
          </button>
        </div>

        <div className="a-be-toolbar-sep" aria-hidden="true" />

        {/* Insert Media / HTML / Table Controls */}
        <div className="a-be-toolbar-group">
          <button
            type="button"
            className="a-be-tbtn"
            onClick={() => insertBlockAtCursor("image")}
            title="Insert Image"
          >
            <Icon name="image" /> Image
          </button>
          <button
            type="button"
            className="a-be-tbtn"
            onClick={() => insertBlockAtCursor("table")}
            title="Insert Table"
          >
            <Icon name="table" /> Table
          </button>
          <button
            type="button"
            className="a-be-tbtn"
            onClick={() => insertBlockAtCursor("html")}
            title="Insert Custom HTML & CSS"
          >
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
            title="Insert more elements (Gallery, Video, Audio, Code, Markdown, Button, Divider)"
          >
            <Icon name="plus" /> Insert
          </button>
        </div>
      </div>

      {/* Header Slot (Cover Image & Post Title) */}
      {headerSlot}

      {/* Continuous Writing Document Surface */}
      <div
        ref={docRef}
        className="a-be-doc"
        onClick={(e) => {
          // Clicking empty space at the bottom of the sheet focuses the last continuous writing area
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
                  <button
                    type="button"
                    className="a-be-tool"
                    aria-label="Move up"
                    title="Move up"
                    disabled={seg.index === 0}
                    onClick={() => moveWidget(seg.index, -1)}
                  >
                    <Icon name="up" />
                  </button>
                  <button
                    type="button"
                    className="a-be-tool"
                    aria-label="Move down"
                    title="Move down"
                    disabled={seg.index === blocks.length - 1}
                    onClick={() => moveWidget(seg.index, 1)}
                  >
                    <Icon name="down" />
                  </button>
                  <button
                    type="button"
                    className="a-be-tool danger"
                    aria-label="Delete"
                    title="Remove block"
                    onClick={() => removeWidget(seg.index)}
                  >
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

      {/* Top Toolbar "+ Insert" Dropdown */}
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

      {/* Hyperlink Popover */}
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
          <button
            type="button"
            className="is-danger"
            onClick={() => applyLinkFromDialog("")}
          >
            Unlink
          </button>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Embedded Non-Text Widget Bodies (Image, HTML, Table, Video, etc.) */
/* ------------------------------------------------------------------ */
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
      return <ImageBlock block={block} onChange={onChange} />;
    case "gallery":
      return <GalleryBlock block={block} onChange={onChange} />;
    case "video":
      return <EmbedBlock kind="video" block={block} onChange={onChange} />;
    case "audio":
      return <EmbedBlock kind="audio" block={block} onChange={onChange} />;
    case "html":
      return <HtmlBlock block={block} onChange={onChange} />;
    case "markdown":
      return <MarkdownBlock block={block} theme={theme} onChange={onChange} />;
    case "table":
      return <TableBlock block={block} onChange={onChange} />;
    case "button":
      return <ButtonBlock block={block} onChange={onChange} />;
    case "code":
      return <CodeBlock block={block} onChange={onChange} />;
    default:
      return null;
  }
}

function ImageBlock({
  block,
  onChange,
}: {
  block: Extract<EditorBlock, { type: "image" }>;
  onChange: (block: EditorBlock) => void;
}) {
  return (
    <div className="a-be-card">
      <span className="a-be-kicker">Image</span>
      <ImagePicker url={block.url} onUrl={(url) => onChange({ ...block, url })} />
      <div className="a-be-inline">
        <input
          className="a-be-field"
          value={block.alt}
          placeholder="Alt text (describe the image)"
          aria-label="Image alt text"
          onChange={(e) => onChange({ ...block, alt: e.target.value })}
        />
        <input
          className="a-be-field"
          value={block.caption}
          placeholder="Caption (optional)"
          aria-label="Image caption"
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
        />
      </div>
    </div>
  );
}

function GalleryBlock({
  block,
  onChange,
}: {
  block: Extract<EditorBlock, { type: "gallery" }>;
  onChange: (block: EditorBlock) => void;
}) {
  function setImage(i: number, patch: Partial<{ url: string; alt: string }>) {
    onChange({ ...block, images: block.images.map((img, n) => (n === i ? { ...img, ...patch } : img)) });
  }
  return (
    <div className="a-be-card">
      <span className="a-be-kicker">Gallery · {block.images.length} {block.images.length === 1 ? "image" : "images"}</span>
      <div className="a-be-gal">
        {block.images.map((img, i) => (
          <div key={i} className="a-be-gal-item">
            <ImagePicker compact url={img.url} onUrl={(url) => setImage(i, { url })} />
            <input className="a-be-field" value={img.alt} placeholder="Alt text" aria-label={`Gallery image ${i + 1} alt`} onChange={(e) => setImage(i, { alt: e.target.value })} />
            {block.images.length > 1 && (
              <button type="button" className="a-be-linkish is-danger" onClick={() => onChange({ ...block, images: block.images.filter((_, n) => n !== i) })}>
                Remove image {i + 1}
              </button>
            )}
          </div>
        ))}
        <button type="button" className="a-be-gal-add" onClick={() => onChange({ ...block, images: [...block.images, { url: "", alt: "" }] })}>
          <Icon name="imagePlus" /> Add image
        </button>
      </div>
    </div>
  );
}

function EmbedBlock({
  kind,
  block,
  onChange,
}: {
  kind: "video" | "audio";
  block: Extract<EditorBlock, { type: "video" | "audio" }>;
  onChange: (block: EditorBlock) => void;
}) {
  const video = kind === "video" ? videoEmbedSrc(block.url) : null;
  const audio = kind === "audio" ? audioEmbed(block.url) : null;
  return (
    <div className="a-be-card">
      <span className="a-be-kicker">{kind === "video" ? "Video" : "Audio"}</span>
      <input
        className="a-be-field"
        value={block.url}
        aria-label={kind === "video" ? "Video URL" : "Audio URL"}
        placeholder={kind === "video" ? "YouTube or Vimeo link" : "Spotify, SoundCloud, or an https audio file"}
        onChange={(e) => onChange({ ...block, url: e.target.value })}
      />
      <p className="a-be-note">
        {kind === "video"
          ? "Only YouTube and Vimeo links are embedded. Other addresses are ignored."
          : "Spotify, SoundCloud, or a direct https audio file. Other sites are not embedded."}
      </p>
      {video && (
        <div className="a-be-ratio">
          <iframe title="Video preview" src={video} sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      )}
      {audio?.kind === "file" && <audio controls src={audio.src} style={{ width: "100%" }} />}
      {audio && audio.kind !== "file" && (
        <iframe title="Audio preview" src={audio.src} sandbox="allow-scripts allow-same-origin allow-presentation" style={{ width: "100%", height: audio.kind === "spotify" ? 152 : 166, border: 0, borderRadius: 10 }} />
      )}
    </div>
  );
}

function AutoFrame({ title, srcDoc }: { title: string; srcDoc: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const observer = useRef<ResizeObserver | null>(null);

  function measure() {
    const frame = ref.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc?.documentElement) return;
    frame.style.height = "0px";
    const h = Math.ceil(doc.documentElement.scrollHeight) + 2;
    frame.style.height = `${Math.min(1600, Math.max(48, h))}px`;
  }

  function onLoad() {
    const doc = ref.current?.contentDocument;
    if (!doc?.body) return;
    measure();
    observer.current?.disconnect();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(doc.body);
  }

  useEffect(() => () => observer.current?.disconnect(), []);

  return (
    <iframe
      ref={ref}
      className="a-be-frame"
      title={title}
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      onLoad={onLoad}
    />
  );
}

function AutoArea({ value, onChange, ...rest }: { value: string; onChange: (value: string) => void } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

function ModeTabs({ mode, setMode }: { mode: "edit" | "preview"; setMode: (m: "edit" | "preview") => void }) {
  return (
    <div className="a-be-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={mode === "edit"} onClick={() => setMode("edit")}>Edit</button>
      <button type="button" role="tab" aria-selected={mode === "preview"} onClick={() => setMode("preview")}>Preview</button>
    </div>
  );
}

const BLOCKED_TAGS = "script,iframe,frame,frameset,object,embed,link,meta,base,applet,form,noscript,template";
const URL_ATTRS = ["href", "src", "action", "formaction", "xlink:href", "poster", "srcset"];

function cleanCss(css: string): string {
  return css
    .replace(/@import[^;]*;?/gi, "")
    .replace(/expression\s*[)]*/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/behavior\s*:[^;}]*/gi, "")
    .replace(/-moz-binding\s*:[^;}]*/gi, "")
    .replace(/(^|[,{}\s])(html|body|:root)(?=\s*[,{])/gi, "$1:host");
}

function sanitizeForPreview(input: string): string {
  const doc = new DOMParser().parseFromString(input, "text/html");
  doc.querySelectorAll(BLOCKED_TAGS).forEach((n) => n.remove());
  doc.querySelectorAll("style").forEach((n) => { n.textContent = cleanCss(n.textContent ?? ""); });
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      else if (URL_ATTRS.includes(name) && /^(javascript|vbscript|data):/i.test(value) && !/^data:image\//i.test(value)) el.removeAttribute(attr.name);
      else if (name === "style" && /expression\s*\(|javascript\s*:|behavior\s*:/i.test(value)) el.removeAttribute(attr.name);
    }
  });
  const headStyles = Array.from(doc.head.querySelectorAll("style")).map((n) => n.outerHTML).join("");
  return headStyles + doc.body.innerHTML;
}

function HtmlBlock({
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
          <button
            type="button"
            className="a-be-chip"
            onClick={() => setShowCode((v) => !v)}
          >
            {showCode ? "Hide code" : "Edit code"}
          </button>
          <button
            type="button"
            className="a-be-convert"
            onClick={() => setRendered(block.html)}
            disabled={!block.html.trim()}
          >
            Refresh preview
          </button>
        </div>
      </div>
      {showCode && (
        <AutoArea
          className="a-be-area"
          value={block.html}
          spellCheck={false}
          aria-label="HTML and CSS code"
          placeholder={"<style>\n  table { border-collapse: collapse; width: 100%; }\n  td, th { border: 1px solid #ccc; padding: 8px 12px; }\n</style>\n<table>\n  <tr><th>Town</th><th>Inches</th></tr>\n  <tr><td>Denver</td><td>8</td></tr>\n</table>"}
          onChange={(html) => onChange({ ...block, html })}
        />
      )}
      {rendered.trim() && <div ref={host} className="a-be-html-out" />}
    </div>
  );
}

function MarkdownBlock({
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
        <ModeTabs mode={mode} setMode={setMode} />
      </div>
      {mode === "edit" ? (
        <AutoArea
          className="a-be-area"
          value={block.markdown}
          spellCheck
          aria-label="Markdown source"
          placeholder={"## A smaller heading\n\nA paragraph with **bold**.\n\n- One\n- Two"}
          onChange={(markdown) => onChange({ ...block, markdown })}
        />
      ) : (
        <AutoFrame title="Markdown preview" srcDoc={htmlDocument(markdownToHtml(block.markdown), theme)} />
      )}
    </div>
  );
}

function TableBlock({
  block,
  onChange,
}: {
  block: Extract<EditorBlock, { type: "table" }>;
  onChange: (block: EditorBlock) => void;
}) {
  const cols = Math.max(1, ...block.rows.map((row) => row.length));
  function setCell(r: number, c: number, value: string) {
    onChange({ ...block, rows: block.rows.map((row, ri) => ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row) });
  }
  function addRow() { onChange({ ...block, rows: [...block.rows, Array(cols).fill("")] }); }
  function addCol() { onChange({ ...block, rows: block.rows.map((row) => [...row, ""]) }); }
  function removeRow() {
    if (block.rows.length <= 1) return;
    onChange({ ...block, rows: block.rows.slice(0, -1) });
  }
  function removeCol() {
    if (cols <= 1) return;
    onChange({ ...block, rows: block.rows.map((row) => row.slice(0, -1)) });
  }
  return (
    <div className="a-be-card">
      <div className="a-be-card-head">
        <span className="a-be-kicker">Table</span>
        <div className="a-be-chips">
          <button type="button" className="a-be-chip" onClick={() => onChange({ ...block, hasHeader: !block.hasHeader })}>{block.hasHeader ? "Header on" : "Header off"}</button>
          <button type="button" className="a-be-chip" onClick={addRow}>Add row</button>
          <button type="button" className="a-be-chip" onClick={addCol}>Add column</button>
          <button type="button" className="a-be-chip" onClick={removeRow}>Remove row</button>
          <button type="button" className="a-be-chip" onClick={removeCol}>Remove column</button>
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

function ButtonBlock({
  block,
  onChange,
}: {
  block: Extract<EditorBlock, { type: "button" }>;
  onChange: (block: EditorBlock) => void;
}) {
  return (
    <div className="a-be-card">
      <span className="a-be-kicker">Button</span>
      <div className="a-be-inline">
        <input className="a-be-field" value={block.label} placeholder="Label" aria-label="Button label" onChange={(e) => onChange({ ...block, label: e.target.value })} />
        <input className="a-be-field" value={block.href} placeholder="https:// or /page" aria-label="Button link" onChange={(e) => onChange({ ...block, href: e.target.value })} />
      </div>
      <div><span className="a-be-btn-preview">{block.label.trim() || "Button"}</span></div>
    </div>
  );
}

function CodeBlock({
  block,
  onChange,
}: {
  block: Extract<EditorBlock, { type: "code" }>;
  onChange: (block: EditorBlock) => void;
}) {
  return (
    <div className="a-be-card">
      <div className="a-be-card-head">
        <span className="a-be-kicker">Code</span>
        <input className="a-be-field a-be-lang" value={block.language} placeholder="Language" aria-label="Code language" onChange={(e) => onChange({ ...block, language: e.target.value })} />
      </div>
      <AutoArea
        className="a-be-area"
        value={block.code}
        spellCheck={false}
        aria-label="Code"
        placeholder="Paste code"
        onChange={(code) => onChange({ ...block, code })}
      />
    </div>
  );
}
