"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent as ReactPaste,
  type KeyboardEvent as ReactKey,
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
/*  Standard image size                                                */
/*  Every uploaded image (featured, inline, gallery) is cropped to     */
/*  16:9 and resized to 1600 x 900 before it reaches the server.       */
/*  Animated GIFs are uploaded untouched so they keep their animation. */
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
/*  Icons                                                              */
/* ------------------------------------------------------------------ */
type IconName =
  | "plus" | "grip" | "up" | "down" | "trash" | "paragraph" | "h1" | "h2" | "h3"
  | "list" | "olist" | "quote" | "minus" | "image" | "gallery" | "video" | "audio"
  | "html" | "markdown" | "table" | "button" | "callout" | "code" | "imagePlus"
  | "upload" | "replace" | "link" | "close" | "search";

function Icon({ name }: { name: IconName }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const dot = (cx: number, cy: number) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1" fill="currentColor" stroke="none" />;
  switch (name) {
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "grip": return <svg {...common}>{[7, 12, 17].flatMap((y) => [dot(9, y), dot(15, y)])}</svg>;
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
    case "search": return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></svg>;
    default: return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Block menu                                                         */
/* ------------------------------------------------------------------ */
type MenuItem = { label: string; type: ContentBlock["type"]; level?: HeadingLevel; icon: IconName; hint?: string };

const MENU: { label: string; items: MenuItem[] }[] = [
  {
    label: "Text",
    items: [
      { label: "Paragraph", type: "paragraph", icon: "paragraph" },
      { label: "Heading 1", type: "heading", level: 1, icon: "h1", hint: "#" },
      { label: "Heading 2", type: "heading", level: 2, icon: "h2", hint: "##" },
      { label: "Heading 3", type: "heading", level: 3, icon: "h3", hint: "###" },
      { label: "Bulleted list", type: "bulletList", icon: "list", hint: "-" },
      { label: "Numbered list", type: "numberedList", icon: "olist", hint: "1." },
      { label: "Blockquote", type: "quote", icon: "quote", hint: ">" },
      { label: "Divider", type: "divider", icon: "minus", hint: "---" },
    ],
  },
  {
    label: "Media",
    items: [
      { label: "Image", type: "image", icon: "image" },
      { label: "Gallery", type: "gallery", icon: "gallery" },
      { label: "Video", type: "video", icon: "video" },
      { label: "Audio", type: "audio", icon: "audio" },
    ],
  },
  {
    label: "Advanced",
    items: [
      { label: "HTML", type: "html", icon: "html" },
      { label: "Markdown", type: "markdown", icon: "markdown" },
      { label: "Table", type: "table", icon: "table" },
      { label: "Button", type: "button", icon: "button" },
      { label: "Callout", type: "callout", icon: "callout" },
      { label: "Code", type: "code", icon: "code", hint: "```" },
    ],
  },
];

const FLAT = MENU.flatMap((group) => group.items);

type MenuState = { index: number; blockId: string; top: number; left: number; active: number; query: string };
type Focus = { id: string | null; n: number };

function focusKey(block: EditorBlock): string {
  return block.type === "bulletList" || block.type === "numberedList" ? `${block.id}-0` : block.id;
}

/** "# " -> heading, "- " -> list, etc. Only fires when the prefix is all that was typed. */
function shortcut(text: string): { type: ContentBlock["type"]; level?: HeadingLevel } | null {
  const h = /^(#{1,3})\s$/.exec(text);
  if (h) return { type: "heading", level: h[1].length as HeadingLevel };
  if (/^[-*•]\s$/.test(text)) return { type: "bulletList" };
  if (/^1[.)]\s$/.test(text)) return { type: "numberedList" };
  if (/^>\s$/.test(text)) return { type: "quote" };
  if (text === "---") return { type: "divider" };
  if (text === "```") return { type: "code" };
  return null;
}

/* ------------------------------------------------------------------ */
/*  Editable text                                                      */
/* ------------------------------------------------------------------ */
function readText(el: HTMLElement): string {
  return el.innerText.replace(/\u00a0/g, " ").replace(/\n$/, "");
}

function Editable({
  value, onChange, placeholder, className, focus, blockId, onKeyDown, onPasteBlocks,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  focus: Focus;
  blockId: string;
  onKeyDown?: (e: ReactKey<HTMLDivElement>) => void;
  onPasteBlocks?: (chunks: string[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (readText(el) !== value) el.innerText = value;
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el || focus.id !== blockId) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [focus, blockId]);

  function onPaste(e: ReactPaste<HTMLDivElement>) {
    // Always paste as plain text so Word / Google Docs formatting never leaks in.
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/\r\n/g, "\n");
    const chunks = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    if (onPasteBlocks && chunks.length > 1 && readText(e.currentTarget).trim() === "") {
      onPasteBlocks(chunks);
      return;
    }
    document.execCommand("insertText", false, text);
  }

  return (
    <div
      ref={ref}
      role="textbox"
      aria-multiline="true"
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      className={`a-be-text ${className ?? ""}`}
      onInput={(e) => onChange(readText(e.currentTarget))}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
    />
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

/* ------------------------------------------------------------------ */
/*  Image picker (shared by featured image, image block, gallery)      */
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
            {!compact && <span>Drop a file here or click to browse. It is cropped to 16:9 ({IMAGE_SIZE_LABEL}) automatically.</span>}
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

/* ------------------------------------------------------------------ */
/*  Canvas                                                             */
/* ------------------------------------------------------------------ */
export default function BlockCanvas({ blocks, onChange, theme: themeProp }: { blocks: EditorBlock[]; onChange: (blocks: EditorBlock[]) => void; theme?: "light" | "dark" }) {
  const detected = useTheme();
  const theme = themeProp ?? detected;
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [focus, setFocus] = useState<Focus>({ id: null, n: 0 });
  const [over, setOver] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const nonce = useRef(0);
  const addRef = useRef<HTMLButtonElement>(null);

  const focusOn = (id: string | null) => setFocus({ id, n: ++nonce.current });

  const query = menu?.query.trim().toLowerCase() ?? "";
  const filtered = menu ? FLAT.filter((item) => item.label.toLowerCase().includes(query)) : [];
  const activeIndex = menu ? Math.min(menu.active, Math.max(0, filtered.length - 1)) : 0;

  function closeMenu(refocus: boolean) {
    const blockId = menu?.blockId ?? null;
    setMenu(null);
    if (refocus && blockId) {
      const block = blocks.find((b) => b.id === blockId);
      if (block) focusOn(focusKey(block));
    }
  }

  useEffect(() => {
    if (!menu) return;
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeMenu(true); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!filtered.length) return;
        const step = e.key === "ArrowDown" ? 1 : -1;
        setMenu((m) => (m ? { ...m, active: (activeIndex + step + filtered.length) % filtered.length } : m));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item) insert(menu.index, item.type, item.level);
      }
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, blocks]);

  function insert(index: number, type: ContentBlock["type"], level?: HeadingLevel) {
    const block = createBlock(type, level);
    const next = blocks.slice();
    const current = next[index];
    if (current && current.type === "paragraph" && "text" in current && !current.text.trim()) next.splice(index, 1, block);
    else next.splice(Math.min(index + 1, next.length), 0, block);
    onChange(next.length ? next : [block]);
    focusOn(focusKey(block));
    setMenu(null);
  }

  /** Turns the block at `index` into another type (markdown shortcuts). */
  function convert(index: number, type: ContentBlock["type"], level?: HeadingLevel) {
    const old = blocks[index];
    if (!old) return;
    const replaced = { ...createBlock(type, level), id: old.id } as EditorBlock;
    const next = blocks.slice();
    if (type === "divider") {
      const para = createBlock("paragraph");
      next.splice(index, 1, replaced, para);
      onChange(next);
      focusOn(para.id);
      return;
    }
    next.splice(index, 1, replaced);
    onChange(next);
    focusOn(focusKey(replaced));
  }

  function update(id: string, block: EditorBlock) {
    onChange(blocks.map((item) => (item.id === id ? block : item)));
  }

  function remove(index: number) {
    const next = blocks.filter((_, i) => i !== index);
    onChange(next.length ? next : [createBlock("paragraph")]);
  }

  function backspaceRemove(index: number) {
    const prev = blocks[index - 1];
    remove(index);
    if (prev) focusOn(focusKey(prev));
  }

  function exitList(index: number) {
    const block = blocks[index];
    if (!block || (block.type !== "bulletList" && block.type !== "numberedList")) return;
    const para = createBlock("paragraph");
    const next = blocks.slice();
    if (block.items.length <= 1) next.splice(index, 1, para);
    else next.splice(index, 1, { ...block, items: block.items.slice(0, -1) }, para);
    onChange(next);
    focusOn(para.id);
  }

  function pasteBlocks(index: number, chunks: string[]) {
    const created = chunks.map((text) => ({ ...createBlock("paragraph"), text }) as EditorBlock);
    const next = blocks.slice();
    next.splice(index, 1, ...created);
    onChange(next);
    focusOn(created[created.length - 1].id);
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = blocks.slice();
    const [item] = next.splice(index, 1);
    next.splice(j, 0, item);
    onChange(next);
  }

  function openMenu(index: number, anchor: HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    const width = 300;
    const height = 400;
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));
    const below = rect.bottom + 8;
    const top = below + height > window.innerHeight ? Math.max(10, rect.top - height) : below;
    setMenu({ index, blockId: blocks[index]?.id ?? "", top, left, active: 0, query: "" });
  }

  function onDrop(index: number) {
    const from = dragFrom.current;
    dragFrom.current = null;
    setOver(null);
    if (from == null || from === index) return;
    const next = blocks.slice();
    const [item] = next.splice(from, 1);
    next.splice(index, 0, item);
    onChange(next);
  }

  const words = countWords(blocks);
  const minutes = Math.max(1, Math.ceil(words / 200));

  return (
    <div className="a-be" data-be-theme={theme}>
      <div className="a-be-canvas">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            data-type={block.type}
            className={`a-be-block ${over === index ? "is-over" : ""}`}
            onDragOver={(e) => { if (dragFrom.current !== null) { e.preventDefault(); setOver(index); } }}
            onDrop={(e) => { if (dragFrom.current !== null) { e.preventDefault(); onDrop(index); } }}
          >
            <div className="a-be-gutter">
              <button type="button" className="a-be-plus" aria-label="Insert a block" aria-expanded={menu?.index === index} onClick={(e) => openMenu(index, e.currentTarget)}>
                <Icon name="plus" />
              </button>
              <button
                type="button"
                className="a-be-grip"
                aria-label="Drag to reorder"
                draggable
                onDragStart={() => { dragFrom.current = index; }}
                onDragEnd={() => { dragFrom.current = null; setOver(null); }}
              >
                <Icon name="grip" />
              </button>
            </div>
            <div className="a-be-body">
              <div className="a-be-tools">
                <button type="button" className="a-be-tool" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}><Icon name="up" /></button>
                <button type="button" className="a-be-tool" aria-label="Move down" disabled={index === blocks.length - 1} onClick={() => move(index, 1)}><Icon name="down" /></button>
                <button type="button" className="a-be-tool danger" aria-label="Delete block" onClick={() => remove(index)}><Icon name="trash" /></button>
              </div>
              <BlockBody
                block={block}
                theme={theme}
                focus={focus}
                placeholder={blocks.length === 1 ? "Start writing, or type / to add a block" : "Type / for blocks"}
                onChange={(next) => update(block.id, next)}
                onEnter={() => insert(index, "paragraph")}
                onBackspaceEmpty={() => backspaceRemove(index)}
                onSlash={(el) => openMenu(index, el)}
                onConvert={(type, level) => convert(index, type, level)}
                onPasteBlocks={(chunks) => pasteBlocks(index, chunks)}
                onExitList={() => exitList(index)}
                focusOn={focusOn}
              />
            </div>
          </div>
        ))}
        <button ref={addRef} type="button" className="a-be-add" onClick={(e) => openMenu(blocks.length - 1, e.currentTarget)}>
          <Icon name="plus" /> Add a block
        </button>
      </div>

      <div className="a-be-words" aria-live="polite">
        <span>{words} {words === 1 ? "word" : "words"}</span>
        <span aria-hidden="true">·</span>
        <span>{minutes} min read</span>
      </div>

      {menu && (
        <div ref={menuRef} className="a-be-menu" role="menu" style={{ top: menu.top, left: menu.left }}>
          <label className="a-be-menu-search">
            <Icon name="search" />
            <input
              autoFocus
              value={menu.query}
              placeholder="Search blocks…"
              aria-label="Search blocks"
              onChange={(e) => setMenu({ ...menu, query: e.target.value, active: 0 })}
            />
          </label>
          {filtered.length === 0 && <p className="a-be-menu-empty">No block matches “{menu.query}”.</p>}
          {MENU.map((group) => {
            const items = group.items.filter((item) => filtered.includes(item));
            if (!items.length) return null;
            return (
              <div key={group.label}>
                <div className="a-be-menu-label">{group.label}</div>
                {items.map((item) => {
                  const flat = filtered.indexOf(item);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      className={`a-be-menu-item ${activeIndex === flat ? "is-active" : ""}`}
                      onMouseEnter={() => setMenu({ ...menu, active: flat })}
                      onClick={() => insert(menu.index, item.type, item.level)}
                    >
                      <Icon name={item.icon} />
                      {item.label}
                      {item.hint && <small>{item.hint}</small>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Block bodies                                                       */
/* ------------------------------------------------------------------ */
function BlockBody({
  block, theme, focus, placeholder, onChange, onEnter, onBackspaceEmpty, onSlash, onConvert, onPasteBlocks, onExitList, focusOn,
}: {
  block: EditorBlock;
  theme: "light" | "dark";
  focus: Focus;
  placeholder: string;
  onChange: (block: EditorBlock) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onSlash: (anchor: HTMLElement) => void;
  onConvert: (type: ContentBlock["type"], level?: HeadingLevel) => void;
  onPasteBlocks: (chunks: string[]) => void;
  onExitList: () => void;
  focusOn: (id: string | null) => void;
}) {
  function textKeys(e: ReactKey<HTMLDivElement>, empty: boolean) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnter();
    } else if (e.key === "Backspace" && empty) {
      e.preventDefault();
      onBackspaceEmpty();
    } else if (e.key === "/" && empty) {
      e.preventDefault();
      onSlash(e.currentTarget);
    }
  }

  switch (block.type) {
    case "paragraph":
      return (
        <Editable key="paragraph" value={block.text} blockId={block.id} focus={focus} placeholder={placeholder}
          onChange={(text) => {
            const sc = shortcut(text);
            if (sc) onConvert(sc.type, sc.level);
            else onChange({ ...block, text });
          }}
          onPasteBlocks={onPasteBlocks}
          onKeyDown={(e) => textKeys(e, block.text.trim() === "")} />
      );
    case "heading":
      return (
        <Editable key="heading" value={block.text} blockId={block.id} focus={focus} placeholder={`Heading ${block.level}`}
          className={block.level === 1 ? "a-be-h1" : block.level === 3 ? "a-be-h3" : "a-be-h2"}
          onChange={(text) => onChange({ ...block, text })}
          onKeyDown={(e) => textKeys(e, block.text.trim() === "")} />
      );
    case "quote":
      return (
        <Editable key="quote" value={block.text} blockId={block.id} focus={focus} placeholder="Quote" className="a-be-quote"
          onChange={(text) => onChange({ ...block, text })}
          onKeyDown={(e) => textKeys(e, block.text.trim() === "")} />
      );
    case "callout":
      return (
        <div className="a-be-callout">
          <Editable key="callout" value={block.text} blockId={block.id} focus={focus} placeholder="Highlighted note"
            onChange={(text) => onChange({ ...block, text })} />
        </div>
      );
    case "bulletList":
    case "numberedList":
      return <ListBlock block={block} focus={focus} focusOn={focusOn} onChange={onChange} onExitList={onExitList} onBackspaceEmpty={onBackspaceEmpty} />;
    case "divider":
      return <hr className="a-be-hr" />;
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

function ListBlock({
  block, focus, focusOn, onChange, onExitList, onBackspaceEmpty,
}: {
  block: Extract<EditorBlock, { type: "bulletList" | "numberedList" }>;
  focus: Focus;
  focusOn: (id: string | null) => void;
  onChange: (block: EditorBlock) => void;
  onExitList: () => void;
  onBackspaceEmpty: () => void;
}) {
  function setItem(i: number, text: string) {
    onChange({ ...block, items: block.items.map((item, n) => (n === i ? text : item)) });
  }
  function onKey(i: number, e: ReactKey<HTMLDivElement>) {
    const last = i === block.items.length - 1;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (block.items[i] === "" && last) {
        onExitList(); // Enter on an empty last item leaves the list
        return;
      }
      const items = block.items.slice();
      items.splice(i + 1, 0, "");
      onChange({ ...block, items });
      focusOn(`${block.id}-${i + 1}`);
    } else if (e.key === "Backspace" && block.items[i] === "") {
      e.preventDefault();
      if (block.items.length > 1) {
        onChange({ ...block, items: block.items.filter((_, n) => n !== i) });
        focusOn(`${block.id}-${Math.max(0, i - 1)}`);
      } else {
        onBackspaceEmpty();
      }
    }
  }
  return (
    <ul className="a-be-list">
      {block.items.map((item, i) => (
        <li key={`${block.id}-${i}`} className="a-be-li">
          <span className="a-be-mark" aria-hidden="true">{block.type === "numberedList" ? `${i + 1}.` : "•"}</span>
          <Editable value={item} blockId={`${block.id}-${i}`} focus={focus} placeholder="List item" onChange={(text) => setItem(i, text)} onKeyDown={(e) => onKey(i, e)} />
        </li>
      ))}
    </ul>
  );
}

function ImageBlock({ block, onChange }: { block: Extract<EditorBlock, { type: "image" }>; onChange: (block: EditorBlock) => void }) {
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
}

function GalleryBlock({ block, onChange }: { block: Extract<EditorBlock, { type: "gallery" }>; onChange: (block: EditorBlock) => void }) {
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

function EmbedBlock({ kind, block, onChange }: { kind: "video" | "audio"; block: Extract<EditorBlock, { type: "video" | "audio" }>; onChange: (block: EditorBlock) => void }) {
  const video = kind === "video" ? videoEmbedSrc(block.url) : null;
  const audio = kind === "audio" ? audioEmbed(block.url) : null;
  return (
    <div className="a-be-card">
      <span className="a-be-kicker">{kind === "video" ? "Video" : "Audio"}</span>
      <input className="a-be-field" value={block.url} aria-label={kind === "video" ? "Video URL" : "Audio URL"}
        placeholder={kind === "video" ? "YouTube or Vimeo link" : "Spotify, SoundCloud, or an https audio file"}
        onChange={(e) => onChange({ ...block, url: e.target.value })} />
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

/** Iframe that grows or shrinks to exactly fit its content. */
function AutoFrame({ title, srcDoc }: { title: string; srcDoc: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const observer = useRef<ResizeObserver | null>(null);

  function measure() {
    const frame = ref.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc?.documentElement) return;
    frame.style.height = "0px"; // collapse first so the real content height is measured
    const h = Math.ceil(doc.documentElement.scrollHeight) + 2;
    frame.style.height = `${Math.min(1600, Math.max(48, h))}px`;
  }

  function onLoad() {
    const doc = ref.current?.contentDocument;
    if (!doc?.body) return;
    measure();
    observer.current?.disconnect();
    observer.current = new ResizeObserver(measure); // catches images / fonts loading later
    observer.current.observe(doc.body);
  }

  useEffect(() => () => observer.current?.disconnect(), []);

  return (
    <iframe
      ref={ref}
      className="a-be-frame"
      title={title}
      // allow-same-origin lets the editor read the height; without allow-scripts nothing inside can run.
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      onLoad={onLoad}
    />
  );
}

/** Textarea that grows with its text. */
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

/* ------------------------------------------------------------------ */
/*  HTML block: code box + Convert. No iframe.                         */
/*  The preview is drawn straight into the page inside a Shadow DOM,   */
/*  so pasted CSS cannot leak into the editor and the height simply    */
/*  follows the content.                                               */
/* ------------------------------------------------------------------ */
const BLOCKED_TAGS = "script,iframe,frame,frameset,object,embed,link,meta,base,applet,form,noscript,template";
const URL_ATTRS = ["href", "src", "action", "formaction", "xlink:href", "poster", "srcset"];

function cleanCss(css: string): string {
  return css
    .replace(/@import[^;]*;?/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/behavior\s*:[^;}]*/gi, "")
    .replace(/-moz-binding\s*:[^;}]*/gi, "")
    // html/body/:root selectors have no meaning inside the preview, so point them at the preview itself
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

function HtmlBlock({ block, onChange }: { block: Extract<EditorBlock, { type: "html" }>; onChange: (block: EditorBlock) => void }) {
  const [rendered, setRendered] = useState(block.html);
  const host = useRef<HTMLDivElement>(null);
  const stale = block.html !== rendered;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const root = el.shadowRoot ?? el.attachShadow({ mode: "open" });
    root.innerHTML = `<style>:host{display:block;overflow-x:auto;color:inherit;font-family:inherit}</style>${sanitizeForPreview(rendered)}`;
  }, [rendered]);

  return (
    <div className="a-be-card">
      <div className="a-be-card-head">
        <span className="a-be-kicker">HTML &amp; CSS</span>
        <button type="button" className="a-be-convert" onClick={() => setRendered(block.html)} disabled={!block.html.trim()}>
          Convert
        </button>
      </div>
      <AutoArea
        className="a-be-area"
        value={block.html}
        spellCheck={false}
        aria-label="HTML and CSS code"
        placeholder={"<style>\n  table { border-collapse: collapse; }\n  td, th { border: 1px solid #ccc; padding: 6px 10px; }\n</style>\n<table>\n  <tr><th>Town</th><th>Inches</th></tr>\n  <tr><td>Denver</td><td>8</td></tr>\n</table>"}
        onChange={(html) => onChange({ ...block, html })}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); setRendered(block.html); }
        }}
      />
      {stale && block.html.trim() && <p className="a-be-note">Code changed. Press Convert (or Ctrl/Cmd + Enter) to update the preview.</p>}
      {rendered.trim() && <div ref={host} className="a-be-html-out" />}
    </div>
  );
}

function MarkdownBlock({ block, theme, onChange }: { block: Extract<EditorBlock, { type: "markdown" }>; theme: "light" | "dark"; onChange: (block: EditorBlock) => void }) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  return (
    <div className="a-be-card">
      <div className="a-be-card-head">
        <span className="a-be-kicker">Markdown</span>
        <ModeTabs mode={mode} setMode={setMode} />
      </div>
      {mode === "edit" ? (
        <AutoArea className="a-be-area" value={block.markdown} spellCheck aria-label="Markdown source" placeholder={"## A smaller heading\n\nA paragraph with **bold**.\n\n- One\n- Two"} onChange={(markdown) => onChange({ ...block, markdown })} />
      ) : (
        <AutoFrame title="Markdown preview" srcDoc={htmlDocument(markdownToHtml(block.markdown), theme)} />
      )}
    </div>
  );
}

function TableBlock({ block, onChange }: { block: Extract<EditorBlock, { type: "table" }>; onChange: (block: EditorBlock) => void }) {
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

function ButtonBlock({ block, onChange }: { block: Extract<EditorBlock, { type: "button" }>; onChange: (block: EditorBlock) => void }) {
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

function CodeBlock({ block, onChange }: { block: Extract<EditorBlock, { type: "code" }>; onChange: (block: EditorBlock) => void }) {
  return (
    <div className="a-be-card">
      <div className="a-be-card-head">
        <span className="a-be-kicker">Code</span>
        <input className="a-be-field a-be-lang" value={block.language} placeholder="Language" aria-label="Code language" onChange={(e) => onChange({ ...block, language: e.target.value })} />
      </div>
      <AutoArea className="a-be-area" value={block.code} spellCheck={false} aria-label="Code" placeholder="Paste code" onChange={(code) => onChange({ ...block, code })} />
    </div>
  );
}
