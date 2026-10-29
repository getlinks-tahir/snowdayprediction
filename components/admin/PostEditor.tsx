"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import PostSections from "@/components/PostSections";
import { checkSlugAvailable, savePost } from "@/lib/admin/actions";
import { blocksToSectionInputs, sectionsToBlocks, toPostSection, type EditorBlock } from "@/lib/admin/blocks";
import type { PostInput, PostSection, SaveMode } from "@/lib/admin/types";
import {
  SLUG_RE, estimateReadMinutes, formatPostDate, isValidDate, isValidImage, slugify, todayISO,
} from "@/lib/admin/validators";
import BlockCanvas, { IMAGE_SIZE_LABEL, ImagePicker } from "./BlockCanvas";
import ConfirmDialog from "./ConfirmDialog";
import "./block-editor.css";
import Icon from "./Icon";
import SnippetPreview from "./SnippetPreview";
import StatusBadge from "./StatusBadge";
import TagInput from "./TagInput";
import { useToast } from "./Toast";
import { UNSAVED_MESSAGE, setDirtyFlag } from "./dirty";

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

type SlugState = "idle" | "checking" | "free" | "taken" | "invalid";

export default function PostEditor({ initial, tagSuggestions }: { initial: EditorInitial | null; tagSuggestions: string[] }) {
  const router = useRouter();
  const toast = useToast();
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

  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => sectionsToBlocks(initial?.sections));

  const [view, setView] = useState<"edit" | "preview">("edit");
  const [issues, setIssues] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);

  // Editor-only look: its own light/dark switch and a distraction-free focus mode.
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [focusMode, setFocusMode] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("be-theme");
      if (saved === "dark" || saved === "light") { setTheme(saved); return; }
    } catch { /* storage unavailable */ }
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("be-theme", next); } catch { /* ignore */ }
  }

  const sectionInputs = useMemo(() => blocksToSectionInputs(blocks), [blocks]);
  const previewSections = useMemo(
    () => sectionInputs.map(toPostSection).filter((s) => Object.keys(s).length > 0),
    [sectionInputs],
  );
  const readMinutes = autoRead ? estimateReadMinutes(previewSections as PostSection[]) : Number.parseInt(readText, 10) || 0;

  const snapshot = useMemo(
    () => JSON.stringify({ title, slug, description, date, updated, readMinutes, image, imageAlt, tags, sections: sectionInputs }),
    [title, slug, description, date, updated, readMinutes, image, imageAlt, tags, sectionInputs],
  );
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const dirty = snapshot !== savedSnapshot;

  useEffect(() => {
    setDirtyFlag(dirty);
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = UNSAVED_MESSAGE; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
  useEffect(() => () => setDirtyFlag(false), []);

  useEffect(() => {
    if (!slug) { setSlugState("idle"); return; }
    if (!SLUG_RE.test(slug)) { setSlugState("invalid"); return; }
    if (initial && slug === initial.slug) { setSlugState("idle"); return; }
    setSlugState("checking");
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const res = await checkSlugAvailable(slug, id);
      if (!cancelled) setSlugState(res.ok ? (res.available ? "free" : "taken") : "idle");
    }, 450);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [slug, id, initial]);

  useEffect(() => { setImageBroken(false); }, [image]);

  // Keep the title box as tall as its text, including on first load.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title, view]);

  function run(mode: SaveMode) {
    if (pending) return;
    setIssues([]);
    setFieldErrors({});
    const payload: PostInput = { id, title, slug, description, date, updated, readMinutes, image, imageAlt, tags, sections: sectionInputs };
    const snapAtSave = snapshot;
    const wasNew = id === undefined;

    startTransition(async () => {
      const res = await savePost(payload, mode);
      if (!res.ok) {
        setIssues(res.issues ?? []);
        setFieldErrors(res.fieldErrors ?? {});
        toast.push(res.error, "error");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setSavedSnapshot(snapAtSave);
      setDirtyFlag(false);
      setPublishedState(res.published);
      setSlugUnlocked(!res.published);
      setConfirmUnpublish(false);
      toast.push(
        mode === "publish" ? "Published. The post is live." : mode === "unpublish" ? "Unpublished. The post is now a draft." : res.published ? "Changes saved. They are live." : "Draft saved.",
        "success",
      );
      if (wasNew) router.replace(`/admin/posts/${res.id}/edit`);
      else { setId(res.id); router.refresh(); }
    });
  }

  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); runRef.current("save"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const imageOk = image.trim() !== "" && isValidImage(image.trim());
  const checks = [
    { ok: title.trim() !== "" && SLUG_RE.test(slug), label: "Title and a valid slug" },
    { ok: description.trim() !== "", label: "Meta description" },
    { ok: isValidDate(date), label: "Publish date" },
    { ok: imageOk, label: "Image URL" },
    { ok: imageAlt.trim() !== "", label: "Image alt text" },
    { ok: previewSections.length > 0, label: "At least one section with content" },
  ];
  const ready = checks.every((c) => c.ok);
  const slugLocked = published && !slugUnlocked;
  const descLen = description.trim().length;

  return (
    <div className={`a-editor ${focusMode ? "is-focus" : ""}`} data-be-theme={theme}>
      <div className="a-editorbar">
        <div className="a-editorbar-left">
          <StatusBadge published={published} />
          <span className={`a-savestate ${dirty ? "is-dirty" : ""}`} aria-live="polite">
            {pending ? "Saving…" : dirty ? "Unsaved changes" : isNew ? "Not saved yet" : "All changes saved"}
          </span>
        </div>
        <div className="a-editorbar-right">
          <button type="button" className="btn btn-ghost btn-sm" onClick={toggleTheme} aria-pressed={theme === "dark"}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFocusMode((v) => !v)} aria-pressed={focusMode} disabled={view === "preview"}>
            {focusMode ? "Exit focus" : "Focus mode"}
          </button>
          {id !== undefined && (
            <Link className="btn btn-ghost btn-sm" href={`/admin/posts/${id}/preview`} target="_blank" title={dirty ? "Preview shows the last saved version" : "Open preview"}>
              <Icon name="eye" /> Preview
            </Link>
          )}
          {published && <a className="btn btn-ghost btn-sm" href={`/blog/${slug}`} target="_blank" rel="noopener noreferrer"><Icon name="external" /> View live</a>}
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run("save")}>
            {published ? "Save changes" : "Save draft"}
          </button>
          {published ? (
            <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setConfirmUnpublish(true)}><Icon name="download" /> Unpublish</button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run("publish")}><Icon name="upload" /> Publish</button>
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

      <div className="a-tabs" role="tablist" aria-label="Editor view">
        <button type="button" role="tab" aria-selected={view === "edit"} onClick={() => setView("edit")}>Write</button>
        <button type="button" role="tab" aria-selected={view === "preview"} onClick={() => setView("preview")}>Live preview</button>
      </div>

      {view === "preview" ? (
        <div className="glass a-card a-preview">
          <p className="a-hint">This is how the post body will look on the site. Unsaved changes are included.</p>
          <div className="prose">
            <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}>{title.trim() || "Untitled post"}</h1>
            <p className="post-meta">{formatPostDate(date)} · {readMinutes || "?"} min read</p>
            {imageOk && !imageBroken && (
              <div className="post-hero">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.trim()} alt={imageAlt} onError={() => setImageBroken(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            {previewSections.length ? <PostSections sections={previewSections as PostSection[]} /> : <p>No content yet. Add a block on the Write tab.</p>}
          </div>
        </div>
      ) : (
        <div className={`a-editor-grid ${focusMode ? "is-solo" : ""}`}>
          <div className="a-col-main">
            <div className="a-sheet">
              <ImagePicker
                variant="cover"
                hideUrl
                url={image}
                onUrl={setImage}
                onBroken={setImageBroken}
                onError={(message) => toast.push(message, "error")}
                onUploaded={() => toast.push("Image uploaded.", "success")}
              />
              <label className="a-field a-titlefield">
                <span className="sr-only">Title</span>
                <textarea
                  ref={titleRef}
                  className="a-be-title"
                  rows={1}
                  value={title}
                  maxLength={200}
                  placeholder="Post title"
                  aria-invalid={Boolean(fieldErrors.title)}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!slugTouched) setSlug(slugify(e.target.value));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.querySelector<HTMLElement>(".a-be .a-be-text")?.focus();
                    }
                  }}
                />
                {fieldErrors.title && <span className="a-error">{fieldErrors.title}</span>}
              </label>
              {fieldErrors.sections && <p className="a-error">{fieldErrors.sections}</p>}
              <BlockCanvas blocks={blocks} onChange={setBlocks} theme={theme} />
            </div>
          </div>

          {!focusMode && (
            <aside className="a-col-side">
              <div className="glass a-card">
                <h3>Search listing</h3>
                <label className="a-field">
                  <span className="a-label">URL slug</span>
                  <div className="a-slug">
                    <span className="a-slug-prefix">/blog/</span>
                    <input className="a-input" value={slug} maxLength={100} readOnly={slugLocked} aria-invalid={Boolean(fieldErrors.slug) || slugState === "invalid" || slugState === "taken"}
                      onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }}
                      onBlur={() => setSlug((s) => slugify(s))} placeholder="how-much-snow-closes-school" />
                    {slugLocked && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSlugUnlocked(true)}><Icon name="lock" /> Unlock</button>}
                  </div>
                  {slugLocked && <span className="a-hint">Locked because this post is live. Changing the slug breaks the old URL and any links to it.</span>}
                  {!slugLocked && published && slug !== initial?.slug && <span className="a-error">Warning: changing the slug of a live post breaks its old URL.</span>}
                  {slugState === "checking" && <span className="a-hint">Checking…</span>}
                  {slugState === "free" && <span className="a-ok">Available</span>}
                  {slugState === "taken" && <span className="a-error">That slug is already used by another post.</span>}
                  {slugState === "invalid" && <span className="a-error">Use lowercase letters, numbers and single hyphens only.</span>}
                  {fieldErrors.slug && slugState !== "taken" && <span className="a-error">{fieldErrors.slug}</span>}
                </label>
                <label className="a-field">
                  <span className="a-label">
                    Meta description
                    <span className={`a-counter ${descLen > 160 ? "is-warn" : descLen >= 120 ? "is-good" : ""}`}>{descLen}/500 · aim for 120–160</span>
                  </span>
                  <textarea className="a-input a-textarea" rows={3} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} aria-invalid={Boolean(fieldErrors.description)}
                    placeholder="One or two sentences that make someone want to click." />
                  {fieldErrors.description && <span className="a-error">{fieldErrors.description}</span>}
                </label>
                <SnippetPreview title={title} slug={slug} description={description} />
              </div>

              <div className="glass a-card">
                <h3>Featured image</h3>
                <p className="a-hint">Upload it in the cover area above the title. Every image is cropped to 16:9 ({IMAGE_SIZE_LABEL}) automatically, so all posts match.</p>
                <label className="a-field">
                  <span className="a-label">Image URL</span>
                  <input ref={imageRef} className="a-input" value={image} onChange={(e) => setImage(e.target.value)} placeholder="/blog/snow.svg or https://…" aria-invalid={Boolean(fieldErrors.image)} />
                  {fieldErrors.image && <span className="a-error">{fieldErrors.image}</span>}
                  <span className="a-hint">Filled in for you after an upload. You can also paste a site path or a full https:// link.</span>
                </label>
                {imageOk && imageBroken && <p className="a-error">The image couldn’t be loaded. Check the URL.</p>}
                <label className="a-field">
                  <span className="a-label">Alt text <span className="a-counter">{imageAlt.length}/300</span></span>
                  <textarea className="a-input a-textarea" rows={2} value={imageAlt} maxLength={300} onChange={(e) => setImageAlt(e.target.value)} aria-invalid={Boolean(fieldErrors.imageAlt)}
                    placeholder="Describe the image for people who can't see it" />
                  {fieldErrors.imageAlt && <span className="a-error">{fieldErrors.imageAlt}</span>}
                </label>
              </div>

              <div className="glass a-card">
                <h3>Details</h3>
                <label className="a-field">
                  <span className="a-label">Publish date</span>
                  <input className="a-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(fieldErrors.date)} />
                  {fieldErrors.date && <span className="a-error">{fieldErrors.date}</span>}
                </label>
                <label className="a-field">
                  <span className="a-label">Updated date <em>(optional)</em></span>
                  <div className="a-inline">
                    <input className="a-input" type="date" value={updated} onChange={(e) => setUpdated(e.target.value)} aria-invalid={Boolean(fieldErrors.updated)} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUpdated(todayISO())}>Today</button>
                  </div>
                  {fieldErrors.updated && <span className="a-error">{fieldErrors.updated}</span>}
                  <span className="a-hint">Used for “last modified” in search results and the sitemap.</span>
                </label>
                <div className="a-field">
                  <span className="a-label">Read time (minutes)</span>
                  <div className="a-inline">
                    <input className="a-input" type="number" min={1} max={180} value={autoRead ? String(readMinutes) : readText} disabled={autoRead}
                      onChange={(e) => setReadText(e.target.value)} aria-label="Read time in minutes" aria-invalid={Boolean(fieldErrors.readMinutes)} />
                    <label className="a-check"><input type="checkbox" checked={autoRead} onChange={(e) => { if (!e.target.checked) setReadText(String(readMinutes || 5)); setAutoRead(e.target.checked); }} /> Auto</label>
                  </div>
                  {fieldErrors.readMinutes && <span className="a-error">{fieldErrors.readMinutes}</span>}
                </div>
              </div>

              <div className="glass a-card">
                <h3>Tags</h3>
                <TagInput value={tags} onChange={setTags} suggestions={tagSuggestions} />
                {fieldErrors.tags && <span className="a-error">{fieldErrors.tags}</span>}
              </div>

              <div className="glass a-card">
                <h3>Ready to publish?</h3>
                <ul className="a-checklist">
                  {checks.map((c) => (
                    <li key={c.label} data-ok={c.ok}><span className="a-checkmark" aria-hidden="true">{c.ok ? <Icon name="check" className="a-icon a-icon-sm" /> : null}</span>{c.label}<span className="sr-only">{c.ok ? " (done)" : " (missing)"}</span></li>
                  ))}
                </ul>
                <p className="a-hint">{ready ? "Everything needed is in place." : "Drafts can be saved with missing items. Publishing needs all of them."}</p>
              </div>
            </aside>
          )}
        </div>
      )}

      <ConfirmDialog open={confirmUnpublish} title="Unpublish this post?" confirmLabel="Save and unpublish" busy={pending} onConfirm={() => run("unpublish")} onCancel={() => setConfirmUnpublish(false)}>
        <p>The post becomes a draft and disappears from the blog, home page and sitemap. Your unsaved edits are saved too.</p>
      </ConfirmDialog>
    </div>
  );
}
