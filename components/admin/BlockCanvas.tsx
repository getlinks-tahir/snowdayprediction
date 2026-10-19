"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKey } from "react";
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

type IconName =
  | "plus" | "grip" | "up" | "down" | "trash" | "paragraph" | "h1" | "h2" | "h3"
  | "list" | "olist" | "quote" | "minus" | "image" | "gallery" | "video" | "audio"
  | "html" | "markdown" | "table" | "button" | "callout" | "code" | "imagePlus";

function Icon({ name }: { name: IconName }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "grip": return <svg {...common}><circle cx="9" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="17" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="17" r="1" fill="currentColor" stroke="none" /></svg>;
    case "up": return <svg {...common}><path d="M6 14l6-6 6 6" /></svg>;
    case "down": return <svg {...common}><path d="M6 10l6 6 6-6" /></svg>;
    case "trash": return <svg {...common}><path d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12" /></svg>;
    case "paragraph": return <svg {...common}><path d="M12 5v14M12 5h5a4 4 0 0 1 0 8h-5" /></svg>;
    case "h1": return <svg {...common}><path d="M5 6v12M5 12h8M13 6v12M19 10v8M19 10c0-1.5 2-1.5 2 0" /></svg>;
    case "h2": return <svg {...common}><path d="M4 6v12M4 12h7M11 6v12M17 10c1.5-2 4-1 4 1s-4 2-4 4h4" /></svg>;
    case "h3": return <svg {...common}><path d="M4 6v12M4 12h7M11 6v12M17 10h4M21 10c0 2-4 2-4 4h4" /></svg>;
    case "list": return <svg {...common}><path d="M9 7h11M9 12h11M9 17h11" /><circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" /></svg>;
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
    default: return null;
  }
}

const MENU: { label: string; items: { label: string; type: ContentBlock["type"]; level?: HeadingLevel; icon: IconName }[] }[] = [
  {
    label: "Basic",
    items: [
      { label: "Paragraph", type: "paragraph", icon: "paragraph" },
      { label: "Heading 1", type: "heading", level: 1, icon: "h1" },
      { label: "Heading 2", type: "heading", level: 2, icon: "h2" },
      { label: "Heading 3", type: "heading", level: 3, icon: "h3" },
      { label: "Bulleted list", type: "bulletList", icon: "list" },
      { label: "Numbered list", type: "numberedList", icon: "olist" },
      { label: "Blockquote", type: "quote", icon: "quote" },
      { label: "Divider", type: "divider", icon: "minus" },
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
      { label: "Code", type: "code", icon: "code" },
    ],
  },
];

const FLAT = MENU.flatMap((group) => group.items);

function readText(el: HTMLElement): string {
  return el.innerText.replace(/\u00a0/g, " ").replace(/\n$/, "");
}

function Editable({
  value, onChange, placeholder, className, focusId, blockId, onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  focusId: string | null;
  blockId: string;
  onKeyDown?: (e: ReactKey<HTMLDivElement>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (readText(el) !== value) el.innerText = value;
  }, [value]);
  useEffect(() => {
    if (focusId === blockId) ref.current?.focus();
  }, [focusId, blockId]);
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

export default function BlockCanvas({ blocks, onChange, theme: themeProp }: { blocks: EditorBlock[]; onChange: (blocks: EditorBlock[]) => void; theme?: "light" | "dark" }) {
  const detected = useTheme();
  const theme = themeProp ?? detected;
  const [menu, setMenu] = useState<{ index: number; top: number; left: number; active: number } | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
      if (!menu) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setMenu((m) => m ? { ...m, active: (m.active + (e.key === "ArrowDown" ? 1 : -1) + FLAT.length) % FLAT.length } : m);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = FLAT[menu.active];
        if (item) insert(menu.index, item.type, item.level);
      }
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu, blocks]);

  function insert(index: number, type: ContentBlock["type"], level?: HeadingLevel) {
    const block = createBlock(type, level);
    const next = blocks.slice();
    const current = next[index];
    if (current && current.type === "paragraph" && "text" in current && !current.text.trim()) next.splice(index, 1, block);
    else next.splice(Math.min(index + 1, next.length), 0, block);
    onChange(next.length ? next : [block]);
    setFocusId(block.id);
    setMenu(null);
  }

  function update(id: string, block: EditorBlock) {
    onChange(blocks.map((item) => (item.id === id ? block : item)));
  }

  function remove(index: number) {
    const next = blocks.filter((_, i) => i !== index);
    onChange(next.length ? next : [createBlock("paragraph")]);
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
    const width = 280;
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));
    const below = rect.bottom + 8;
    const top = below + 360 > window.innerHeight ? Math.max(10, rect.top - 360) : below;
    setMenu({ index, top, left, active: 0 });
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

  return (
    <div className="a-be">
      <div className="a-be-canvas">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className={`a-be-block ${over === index ? "is-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOver(index); }}
            onDrop={(e) => { e.preventDefault(); onDrop(index); }}
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
              <div className="a-be-tools">
                <button type="button" className="a-be-tool" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}><Icon name="up" /></button>
                <button type="button" className="a-be-tool" aria-label="Move down" disabled={index === blocks.length - 1} onClick={() => move(index, 1)}><Icon name="down" /></button>
                <button type="button" className="a-be-tool danger" aria-label="Delete block" onClick={() => remove(index)}><Icon name="trash" /></button>
              </div>
            </div>
            <div className="a-be-body">
              <BlockBody
                block={block}
                theme={theme}
                focusId={focusId}
                onChange={(next) => update(block.id, next)}
                onEnter={() => insert(index, "paragraph")}
                onBackspaceEmpty={() => remove(index)}
                onSlash={(el) => openMenu(index, el)}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="a-be-words" aria-live="polite">{countWords(blocks)} words</div>
      {menu && (
        <div ref={menuRef} className="a-be-menu" role="menu" style={{ top: menu.top, left: menu.left }}>
          {MENU.map((group) => (
            <div key={group.label}>
              <div className="a-be-menu-label">{group.label}</div>
              {group.items.map((item) => {
                const flat = FLAT.indexOf(item);
                return (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    className={`a-be-menu-item ${menu.active === flat ? "is-active" : ""}`}
                    onMouseEnter={() => setMenu({ ...menu, active: flat })}
                    onClick={() => insert(menu.index, item.type, item.level)}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockBody({
  block, theme, focusId, onChange, onEnter, onBackspaceEmpty, onSlash,
}: {
  block: EditorBlock;
  theme: "light" | "dark";
  focusId: string | null;
  onChange: (block: EditorBlock) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onSlash: (anchor: HTMLElement) => void;
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
        <Editable value={block.text} blockId={block.id} focusId={focusId} placeholder="Begin writing your post…"
          onChange={(text) => onChange({ ...block, text })}
          onKeyDown={(e) => textKeys(e, block.text.trim() === "")} />
      );
    case "heading":
      return (
        <Editable value={block.text} blockId={block.id} focusId={focusId} placeholder={`Heading ${block.level}`}
          className={block.level === 1 ? "a-be-h1" : block.level === 3 ? "a-be-h3" : "a-be-h2"}
          onChange={(text) => onChange({ ...block, text })}
          onKeyDown={(e) => textKeys(e, block.text.trim() === "")} />
      );
    case "quote":
      return (
        <Editable value={block.text} blockId={block.id} focusId={focusId} placeholder="Quote" className="a-be-quote"
          onChange={(text) => onChange({ ...block, text })}
          onKeyDown={(e) => textKeys(e, block.text.trim() === "")} />
      );
    case "callout":
      return (
        <div className="a-be-callout">
          <Editable value={block.text} blockId={block.id} focusId={focusId} placeholder="Highlighted note"
            onChange={(text) => onChange({ ...block, text })} />
        </div>
      );
    case "bulletList":
    case "numberedList":
      return <ListBlock block={block} focusId={focusId} onChange={onChange} />;
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
      return <HtmlBlock block={block} theme={theme} onChange={onChange} />;
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

function ListBlock({ block, focusId, onChange }: { block: Extract<EditorBlock, { type: "bulletList" | "numberedList" }>; focusId: string | null; onChange: (block: EditorBlock) => void }) {
  function setItem(i: number, text: string) {
    onChange({ ...block, items: block.items.map((item, n) => (n === i ? text : item)) });
  }
  function onKey(i: number, e: ReactKey<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const items = block.items.slice();
      items.splice(i + 1, 0, "");
      onChange({ ...block, items });
    } else if (e.key === "Backspace" && block.items[i] === "" && block.items.length > 1) {
      e.preventDefault();
      onChange({ ...block, items: block.items.filter((_, n) => n !== i) });
    }
  }
  return (
    <ul className="a-be-list">
      {block.items.map((item, i) => (
        <li key={`${block.id}-${i}`} className="a-be-li">
          <span className="a-be-mark" aria-hidden="true">{block.type === "numberedList" ? `${i + 1}.` : "•"}</span>
          <Editable value={item} blockId={`${block.id}-${i}`} focusId={focusId} placeholder="List item" onChange={(text) => setItem(i, text)} onKeyDown={(e) => onKey(i, e)} />
        </li>
      ))}
    </ul>
  );
}


function ImageBlock({
  block,
  onChange,
}: {
  block: Extract<EditorBlock, { type: "image" }>;
  onChange: (block: EditorBlock) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const ok = isSafeMediaUrl(block.url);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError("Choose a JPG, PNG, WebP, or GIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadBlogImage(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onChange({ ...block, url: result.url });
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="a-be-card">
      <span className="a-be-kicker">Image</span>

      <label className="a-be-note">Upload from your computer</label>
      <input
        className="a-be-field"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={uploading}
        onChange={handleUpload}
        aria-label="Upload blog image"
      />

      {uploading && <p className="a-be-note">Uploading image...</p>}
      {error && <p className="a-be-note" role="alert">{error}</p>}

      <input
        className="a-be-field"
        value={block.url}
        placeholder="/blog/photo.jpg or https://…"
        aria-label="Image URL"
        onChange={(e) => onChange({ ...block, url: e.target.value })}
      />
      <input
        className="a-be-field"
        value={block.alt}
        placeholder="Alt text"
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

      {ok ? (
        <img className="a-be-thumb" src={block.url.trim()} alt={block.alt || ""} />
      ) : block.url.trim() ? (
        <p className="a-be-note">
          Use a site path starting with / or an https link.
        </p>
      ) : null}
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
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  function setImage(i: number, patch: Partial<{ url: string; alt: string }>) {
    onChange({
      ...block,
      images: block.images.map((img, n) =>
        n === i ? { ...img, ...patch } : img
      ),
    });
  }

  async function handleUpload(
    i: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrors((prev) => ({ ...prev, [i]: "" }));

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setErrors((prev) => ({ ...prev, [i]: "Choose a JPG, PNG, WebP, or GIF image." }));
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, [i]: "Image must be 5 MB or smaller." }));
      event.target.value = "";
      return;
    }

    setUploadingIndex(i);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadBlogImage(formData);

      if (!result.ok) {
        setErrors((prev) => ({ ...prev, [i]: result.error }));
        return;
      }

      setImage(i, { url: result.url });
    } catch {
      setErrors((prev) => ({ ...prev, [i]: "Upload failed. Please try again." }));
    } finally {
      setUploadingIndex(null);
      event.target.value = "";
    }
  }

  return (
    <div className="a-be-card">
      <span className="a-be-kicker">Gallery</span>

      {block.images.map((img, i) => (
        <div key={i} className="a-be-card">
          <span className="a-be-note">Image {i + 1}</span>

          <input
            className="a-be-field"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={uploadingIndex !== null}
            onChange={(e) => handleUpload(i, e)}
            aria-label={`Upload gallery image ${i + 1}`}
          />

          {uploadingIndex === i && <p className="a-be-note">Uploading image...</p>}
          {errors[i] && <p className="a-be-note" role="alert">{errors[i]}</p>}

          <input
            className="a-be-field"
            value={img.url}
            placeholder="Image URL"
            aria-label={`Gallery image ${i + 1} URL`}
            onChange={(e) => setImage(i, { url: e.target.value })}
          />
          <input
            className="a-be-field"
            value={img.alt}
            placeholder="Alt text"
            aria-label={`Gallery image ${i + 1} alt`}
            onChange={(e) => setImage(i, { alt: e.target.value })}
          />

          {isSafeMediaUrl(img.url) && (
            <img
              className="a-be-thumb"
              src={img.url.trim()}
              alt={img.alt || ""}
            />
          )}

          {block.images.length > 1 && (
            <button
              type="button"
              className="a-be-linkish"
              onClick={() =>
                onChange({
                  ...block,
                  images: block.images.filter((_, n) => n !== i),
                })
              }
            >
              Remove
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        className="a-be-linkish"
        disabled={uploadingIndex !== null}
        onClick={() =>
          onChange({
            ...block,
            images: [...block.images, { url: "", alt: "" }],
          })
        }
      >
        Add image
      </button>

      <div className="a-be-gallery">
        {block.images
          .filter((img) => isSafeMediaUrl(img.url))
          .map((img, i) => (
            <img key={i} src={img.url.trim()} alt={img.alt || ""} />
          ))}
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
        <div style={{ position: "relative", paddingTop: "56.25%" }}>
          <iframe title="Video preview" src={video} sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, borderRadius: 10 }} />
        </div>
      )}
      {audio?.kind === "file" && <audio controls src={audio.src} style={{ width: "100%" }} />}
      {audio && audio.kind !== "file" && (
        <iframe title="Audio preview" src={audio.src} sandbox="allow-scripts allow-same-origin allow-presentation" style={{ width: "100%", height: audio.kind === "spotify" ? 152 : 166, border: 0, borderRadius: 10 }} />
      )}
    </div>
  );
}

function HtmlBlock({ block, theme, onChange }: { block: Extract<EditorBlock, { type: "html" }>; theme: "light" | "dark"; onChange: (block: EditorBlock) => void }) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  return (
    <div className="a-be-card">
      <div className="a-be-card-head">
        <span className="a-be-kicker">HTML</span>
        <div className="a-be-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "edit"} onClick={() => setMode("edit")}>Edit</button>
          <button type="button" role="tab" aria-selected={mode === "preview"} onClick={() => setMode("preview")}>Preview</button>
        </div>
      </div>
      {mode === "edit" ? (
        <textarea className="a-be-area" value={block.html} spellCheck={false} aria-label="HTML source" placeholder={"<table>\n  <tr><th>Town</th><th>Inches</th></tr>\n  <tr><td>Denver</td><td>8</td></tr>\n</table>"} onChange={(e) => onChange({ ...block, html: e.target.value })} />
      ) : (
        <iframe className="a-be-frame" title="HTML preview" sandbox="" referrerPolicy="no-referrer" srcDoc={htmlDocument(block.html, theme)} style={{ height: Math.min(560, Math.max(180, block.html.length / 2)) }} />
      )}
      <p className="a-be-note">Scripts, iframes, and javascript: links are removed. The preview is a sandboxed frame, so the HTML cannot run JavaScript or touch the rest of the page. Tables and ordinary layout HTML are shown as they will look on the post.</p>
    </div>
  );
}

function MarkdownBlock({ block, theme, onChange }: { block: Extract<EditorBlock, { type: "markdown" }>; theme: "light" | "dark"; onChange: (block: EditorBlock) => void }) {
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
        <textarea className="a-be-area" value={block.markdown} spellCheck aria-label="Markdown source" placeholder={"## A smaller heading\n\nA paragraph with **bold**.\n\n- One\n- Two"} onChange={(e) => onChange({ ...block, markdown: e.target.value })} />
      ) : (
        <iframe className="a-be-frame" title="Markdown preview" sandbox="" referrerPolicy="no-referrer" srcDoc={htmlDocument(markdownToHtml(block.markdown), theme)} style={{ height: Math.min(560, Math.max(140, block.markdown.length / 2)) }} />
      )}
    </div>
  );
}

function TableBlock({ block, onChange }: { block: Extract<EditorBlock, { type: "table" }>; onChange: (block: EditorBlock) => void }) {
  const cols = Math.max(1, ...block.rows.map((row) => row.length));
  function setCell(r: number, c: number, value: string) {
    onChange({ ...block, rows: block.rows.map((row, ri) => ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row) });
  }
  function addRow() {
    onChange({ ...block, rows: [...block.rows, Array(cols).fill("")] });
  }
  function addCol() {
    onChange({ ...block, rows: block.rows.map((row) => [...row, ""]) });
  }
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
        <button type="button" className="a-be-linkish" onClick={() => onChange({ ...block, hasHeader: !block.hasHeader })}>{block.hasHeader ? "Header on" : "Header off"}</button>
        <button type="button" className="a-be-linkish" onClick={addRow}>Add row</button>
        <button type="button" className="a-be-linkish" onClick={addCol}>Add column</button>
        <button type="button" className="a-be-linkish" onClick={removeRow}>Remove row</button>
        <button type="button" className="a-be-linkish" onClick={removeCol}>Remove column</button>
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
        <input className="a-be-field" style={{ maxWidth: 180 }} value={block.language} placeholder="Language" aria-label="Code language" onChange={(e) => onChange({ ...block, language: e.target.value })} />
      </div>
      <textarea className="a-be-area" value={block.code} spellCheck={false} aria-label="Code" placeholder="Paste code" onChange={(e) => onChange({ ...block, code: e.target.value })} />
    </div>
  );
}
