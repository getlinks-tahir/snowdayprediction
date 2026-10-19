/**
 * Block content for the post editor.
 *
 * Stored on each section as an optional `block` object, next to the original
 * heading / paragraphs / list / callout fields. Old posts have no `block` and
 * keep rendering exactly as before.
 *
 * If the Zod schema strips unknown keys, rich blocks are also written into
 * `paragraphs` behind an invisible sentinel so they still round-trip. Add this
 * on the section object in lib/admin/schema.ts so the real field is kept:
 *
 *   block: z.any().optional()
 */

export const BLOCK_SENTINEL = "\u2063block:";

export type HeadingLevel = 1 | 2 | 3;

export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: HeadingLevel; text: string }
  | { type: "bulletList"; items: string[] }
  | { type: "numberedList"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "divider" }
  | { type: "image"; url: string; alt: string; caption: string }
  | { type: "gallery"; images: { url: string; alt: string }[] }
  | { type: "video"; url: string }
  | { type: "audio"; url: string }
  | { type: "html"; html: string }
  | { type: "markdown"; markdown: string }
  | { type: "table"; hasHeader: boolean; rows: string[][] }
  | { type: "button"; label: string; href: string }
  | { type: "callout"; text: string }
  | { type: "code"; language: string; code: string };

export type EditorBlock = ContentBlock & { id: string };

export interface LooseSection {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  callout?: string;
  block?: ContentBlock | null;
}

export interface StoredSection {
  heading: string;
  paragraphs: string[];
  list: string[];
  callout: string;
  block?: ContentBlock;
}

const TYPES = new Set<ContentBlock["type"]>([
  "paragraph", "heading", "bulletList", "numberedList", "quote", "divider",
  "image", "gallery", "video", "audio", "html", "markdown", "table", "button",
  "callout", "code",
]);

let seq = 0;
export function newBlockId(): string {
  seq += 1;
  return `b${Date.now().toString(36)}${seq.toString(36)}`;
}

export function isContentBlock(value: unknown): value is ContentBlock {
  if (!value || typeof value !== "object") return false;
  const t = (value as { type?: unknown }).type;
  return typeof t === "string" && TYPES.has(t as ContentBlock["type"]);
}

export function createBlock(type: ContentBlock["type"], level?: HeadingLevel): EditorBlock {
  const id = newBlockId();
  switch (type) {
    case "paragraph": return { id, type, text: "" };
    case "heading": return { id, type, level: level ?? 2, text: "" };
    case "bulletList":
    case "numberedList": return { id, type, items: [""] };
    case "quote":
    case "callout": return { id, type, text: "" };
    case "divider": return { id, type };
    case "image": return { id, type, url: "", alt: "", caption: "" };
    case "gallery": return { id, type, images: [{ url: "", alt: "" }] };
    case "video":
    case "audio": return { id, type, url: "" };
    case "html": return { id, type, html: "" };
    case "markdown": return { id, type, markdown: "" };
    case "table": return { id, type, hasHeader: true, rows: [["", "", ""], ["", "", ""], ["", "", ""]] };
    case "button": return { id, type, label: "", href: "" };
    case "code": return { id, type, language: "", code: "" };
    default: return { id, type: "paragraph", text: "" };
  }
}

export function isSafeMediaUrl(value: string): boolean {
  const v = value.trim();
  if (!v || /\s/.test(v)) return false;
  if (v.startsWith("/")) return !v.startsWith("//") && !v.startsWith("/\\");
  try {
    const u = new URL(v);
    return u.protocol === "https:" && u.hostname.length > 0;
  } catch {
    return false;
  }
}

export function isSafeHref(value: string): boolean {
  const v = value.trim();
  if (/^mailto:[^\s]+$/i.test(v)) return true;
  return isSafeMediaUrl(v);
}

/** Removes script, embeds, event handlers and javascript: URLs. Layout HTML, including tables, is kept. */
export function sanitizeHtml(input: string): string {
  let html = input.replace(/<!--[\s\S]*?-->/g, "");
  const paired = ["script", "iframe", "object", "embed", "form", "frame", "frameset", "applet", "noscript", "template"];
  for (const tag of paired) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    html = html.replace(re, "");
  }
  html = html.replace(/<\/?(?:script|iframe|object|embed|form|frame|frameset|applet|link|meta|base|noscript|template)\b[^>]*>/gi, "");
  html = html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/\s+(?:href|src|xlink:href|action|formaction|poster)\s*=\s*(?:"\s*(?:javascript|data|vbscript):[^"]*"|'\s*(?:javascript|data|vbscript):[^']*'|(?:javascript|data|vbscript):[^\s>]+)/gi, "");
  html = html.replace(/\s+style\s*=\s*"([^"]*)"/gi, (_m, css: string) => ` style="${String(css).replace(/expression\s*\(|javascript:|@import/gi, "")}"`);
  html = html.replace(/\s+style\s*=\s*'([^']*)'/gi, (_m, css: string) => ` style="${String(css).replace(/expression\s*\(|javascript:|@import/gi, "")}"`);
  return html;
}

export function htmlDocument(body: string, theme: "light" | "dark" | "auto" = "auto"): string {
  const dark = theme === "dark";
  const auto = theme === "auto";
  const color = dark ? "#e8eaed" : "#1c1c1c";
  const border = dark ? "#4b5563" : "#d0d5dd";
  const headBg = dark ? "#2a2f36" : "#f4f5f7";
  const link = dark ? "#8ab4f8" : "#1d4ed8";
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: blob:; media-src https:; style-src 'unsafe-inline'; font-src https: data:; form-action 'none'; script-src 'none'">
<style>
  html,body{margin:0;background:transparent;color:${color};font:16px/1.65 Georgia,"Iowan Old Style",Palatino,serif;}
  body{padding:12px 14px 18px;}
  img,video{max-width:100%;height:auto;}
  table{border-collapse:collapse;width:100%;margin:8px 0;}
  th,td{border:1px solid ${border};padding:8px 10px;text-align:left;vertical-align:top;}
  th{background:${headBg};}
  a{color:${link};}
  pre{overflow:auto;padding:12px;background:${headBg};border-radius:8px;}
  code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.92em;}
  h1,h2,h3{line-height:1.25;font-family:Georgia,serif;}
  ${auto ? `@media (prefers-color-scheme: dark) {
    html,body{color:#e8eaed;}
    th,td{border-color:#4b5563;}
    th,pre{background:#2a2f36;}
    a{color:#8ab4f8;}
  }` : ""}
</style></head><body>${sanitizeHtml(body)}</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function inlineMd(src: string): string {
  let t = escapeHtml(src);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');
  return t;
}

/** Small markdown subset. Output is escaped first, then wrapped in known tags, and shown inside the sandboxed preview. */
export function markdownToHtml(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const para: string[] = [];
  const flush = () => {
    if (!para.length) return;
    out.push(`<p>${inlineMd(para.join(" "))}</p>`);
    para.length = 0;
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.startsWith("```")) {
      flush();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        code.push(lines[i] ?? "");
        i += 1;
      }
      out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      i += 1;
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flush();
      out.push("<hr>");
      i += 1;
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length;
      out.push(`<h${level}>${inlineMd(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      flush();
      const bits: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i] ?? "")) {
        bits.push((lines[i] ?? "").replace(/^\s*>\s?/, ""));
        i += 1;
      }
      out.push(`<blockquote><p>${inlineMd(bits.join(" "))}</p></blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*[-*]\s+/, ""));
        i += 1;
      }
      out.push(`<ul>${items.map((item) => `<li>${inlineMd(item)}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*\d+[.)]\s+/, ""));
        i += 1;
      }
      out.push(`<ol>${items.map((item) => `<li>${inlineMd(item)}</li>`).join("")}</ol>`);
      continue;
    }
    if (/^\s*\|/.test(line)) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i] ?? "")) {
        const cells = (lines[i] ?? "").trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i += 1;
      }
      if (rows.length) {
        const [head, ...body] = rows;
        out.push(`<table><thead><tr>${head.map((c) => `<th>${inlineMd(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inlineMd(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      }
      continue;
    }
    if (!line.trim()) {
      flush();
      i += 1;
      continue;
    }
    para.push(line.trim());
    i += 1;
  }
  flush();
  return out.join("\n");
}

export function videoEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:") return null;
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const id = u.searchParams.get("v") || (u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : "");
      if (id && /^[\w-]{6,}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] ?? "";
      if (/^[\w-]{6,}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0] ?? "";
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    if (host === "player.vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean).pop() ?? "";
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function audioEmbed(url: string): { kind: "file" | "spotify" | "soundcloud"; src: string } | null {
  const raw = url.trim();
  if (!isSafeMediaUrl(raw)) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "open.spotify.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      const kind = parts[0];
      const id = parts[1];
      if (id && kind && ["track", "album", "playlist", "episode", "show"].includes(kind) && /^[\w]+$/.test(id)) {
        return { kind: "spotify", src: `https://open.spotify.com/embed/${kind}/${id}` };
      }
    }
    if (host === "soundcloud.com") {
      return { kind: "soundcloud", src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(raw)}&auto_play=false&hide_related=true&show_comments=false&show_teaser=false` };
    }
  } catch {
    return null;
  }
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(raw) || raw.startsWith("/")) return { kind: "file", src: raw };
  return null;
}

export function blockPlainText(block: ContentBlock): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
    case "callout":
      return block.text;
    case "bulletList":
    case "numberedList":
      return block.items.join(" ");
    case "image":
      return [block.alt, block.caption].filter(Boolean).join(" ");
    case "gallery":
      return block.images.map((img) => img.alt).filter(Boolean).join(" ");
    case "button":
      return block.label;
    case "code":
      return block.code;
    case "markdown":
      return block.markdown;
    case "html":
      return block.html.replace(/<[^>]+>/g, " ");
    case "table":
      return block.rows.flat().join(" ");
    case "video":
    case "audio":
      return "";
    case "divider":
      return "";
    default:
      return "";
  }
}

export function blockHasContent(block: ContentBlock): boolean {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
    case "callout":
    case "markdown":
    case "html":
      return block.type === "html" ? block.html.trim() !== "" : block.type === "markdown" ? block.markdown.trim() !== "" : block.text.trim() !== "";
    case "bulletList":
    case "numberedList":
      return block.items.some((item) => item.trim() !== "");
    case "divider":
      return true;
    case "image":
    case "video":
    case "audio":
      return block.url.trim() !== "";
    case "gallery":
      return block.images.some((img) => img.url.trim() !== "");
    case "button":
      return block.label.trim() !== "" || block.href.trim() !== "";
    case "table":
      return block.rows.some((row) => row.some((cell) => cell.trim() !== ""));
    case "code":
      return block.code.trim() !== "";
    default:
      return false;
  }
}

export function countWords(blocks: Pick<ContentBlock, never>[] | ContentBlock[]): number {
  const text = (blocks as ContentBlock[]).map(blockPlainText).join(" ").trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function encodeFallback(block: ContentBlock): string {
  return BLOCK_SENTINEL + JSON.stringify(block);
}

export function decodeFallback(paragraphs?: string[]): ContentBlock | null {
  const raw = paragraphs?.find((p) => typeof p === "string" && p.startsWith(BLOCK_SENTINEL));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw.slice(BLOCK_SENTINEL.length));
    return isContentBlock(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function cleanBlock(block: ContentBlock): ContentBlock {
  switch (block.type) {
    case "paragraph":
    case "quote":
    case "callout":
      return { ...block, text: block.text.replace(/\s+$/g, "") };
    case "heading":
      return { ...block, text: block.text.replace(/\s+$/g, "") };
    case "bulletList":
    case "numberedList":
      return { ...block, items: block.items.map((item) => item.trim()).filter(Boolean) };
    case "image":
      return { ...block, url: block.url.trim(), alt: block.alt.trim(), caption: block.caption.trim() };
    case "gallery":
      return { ...block, images: block.images.map((img) => ({ url: img.url.trim(), alt: img.alt.trim() })).filter((img) => img.url) };
    case "video":
    case "audio":
      return { ...block, url: block.url.trim() };
    case "html":
      return { ...block, html: sanitizeHtml(block.html) };
    case "markdown":
      return { ...block, markdown: block.markdown.replace(/\s+$/g, "") };
    case "table":
      return { ...block, rows: block.rows.map((row) => row.map((cell) => cell)) };
    case "button":
      return { ...block, label: block.label.trim(), href: block.href.trim() };
    case "code":
      return { ...block, language: block.language.trim(), code: block.code.replace(/\s+$/g, "") };
    case "divider":
      return { type: "divider" };
    default:
      return block;
  }
}

function toStored(block: ContentBlock): StoredSection {
  const clean = cleanBlock(block);
  const base: StoredSection = { heading: "", paragraphs: [], list: [], callout: "", block: clean };
  switch (clean.type) {
    case "heading":
      base.heading = clean.text.trim();
      if (clean.level !== 2) base.paragraphs = [encodeFallback(clean)];
      break;
    case "paragraph":
      if (clean.text.trim()) base.paragraphs = [clean.text.trim()];
      break;
    case "bulletList":
      base.list = clean.type === "bulletList" ? clean.items : [];
      break;
    case "callout":
      base.callout = clean.text.trim();
      break;
    case "numberedList":
      base.list = clean.items;
      base.paragraphs = [encodeFallback(clean)];
      break;
    case "quote":
      base.callout = clean.text.trim();
      base.paragraphs = [encodeFallback(clean)];
      break;
    default:
      if (blockHasContent(clean)) base.paragraphs = [encodeFallback(clean)];
      break;
  }
  return base;
}

export function sectionsToBlocks(sections: LooseSection[] | null | undefined): EditorBlock[] {
  const out: EditorBlock[] = [];
  for (const section of sections ?? []) {
    if (isContentBlock(section.block)) {
      out.push({ ...section.block, id: newBlockId() });
      continue;
    }
    const recovered = decodeFallback(section.paragraphs);
    if (recovered) {
      out.push({ ...recovered, id: newBlockId() });
      continue;
    }
    if (section.heading?.trim()) out.push({ id: newBlockId(), type: "heading", level: 2, text: section.heading });
    for (const paragraph of section.paragraphs ?? []) {
      if (!paragraph || paragraph.startsWith(BLOCK_SENTINEL)) continue;
      if (paragraph.trim()) out.push({ id: newBlockId(), type: "paragraph", text: paragraph });
    }
    if (section.list?.length) out.push({ id: newBlockId(), type: "bulletList", items: [...section.list] });
    if (section.callout?.trim()) out.push({ id: newBlockId(), type: "callout", text: section.callout });
  }
  return out.length ? out : [createBlock("paragraph")];
}

export function blocksToSectionInputs(blocks: EditorBlock[]): StoredSection[] {
  const filled = blocks
    .map((block) => {
      const { id: _id, ...rest } = block;
      return rest as ContentBlock;
    })
    .filter(blockHasContent);
  if (!filled.length) return [{ heading: "", paragraphs: [], list: [], callout: "" }];
  return filled.map(toStored);
}

/** Same shape the public page already understands, plus `block` when present. */
export function toPostSection(section: StoredSection): LooseSection {
  const out: LooseSection = {};
  if (section.heading.trim()) out.heading = section.heading.trim();
  const paragraphs = section.paragraphs.map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length) out.paragraphs = paragraphs;
  const list = section.list.map((p) => p.trim()).filter(Boolean);
  if (list.length) out.list = list;
  if (section.callout.trim()) out.callout = section.callout.trim();
  if (section.block && blockHasContent(section.block)) out.block = section.block;
  return out;
}

export function sectionToViewBlock(section: LooseSection): ContentBlock | null {
  if (isContentBlock(section.block)) return section.block;
  return decodeFallback(section.paragraphs);
}
