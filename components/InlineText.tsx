import type { CSSProperties, ReactNode } from "react";

/**
 * Safe inline renderer for paragraph text.
 *
 * Paragraph text is stored as plain text, but authors (and older content) often
 * include <a href>, <p>, <br>, [text](url) or bare URLs in it. React prints strings
 * literally, so that markup used to show up as raw text. This turns it into real
 * React elements instead.
 *
 * Safety: output is built only from React elements. There is no
 * dangerouslySetInnerHTML. Only <a>, <strong>, <em>, <code> and <br> are produced.
 * Every other tag is removed (its text is kept), and links are limited to
 * https:, http:, mailto:, site paths (/...) and #anchors.
 */

const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi;
const STRAY_TAG = /<\/?[a-z][^>]*>/gi;

// 1 attrs, 2 <a> inner, 3 strong tag, 4 strong inner, 5 em tag, 6 em inner,
// 7 code inner, (br has no group), 8 md text, 9 md url, 10 bare url
const TOKEN_SOURCE =
  String.raw`<a\b([^>]*)>([\s\S]*?)<\/a\s*>` +
  String.raw`|<(strong|b)\b[^>]*>([\s\S]*?)<\/\3\s*>` +
  String.raw`|<(em|i)\b[^>]*>([\s\S]*?)<\/\5\s*>` +
  String.raw`|<code\b[^>]*>([\s\S]*?)<\/code\s*>` +
  String.raw`|<br\s*\/?>` +
  String.raw`|\[([^\]\n]+)\]\(([^)\s]+)\)` +
  String.raw`|(?<![\w"'=@/])(https?:\/\/[^\s<>"]+)`;

function decode(s: string): string {
  return s
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function plain(s: string): string {
  return decode(s.replace(STRAY_TAG, ""));
}

export function safeHref(raw: string): string | null {
  const v = decode(raw).trim();
  // eslint-disable-next-line no-control-regex
  if (!v || /[\s\u0000-\u001f]/.test(v)) return null;
  if (v.startsWith("/")) return v.startsWith("//") || v.startsWith("/\\") ? null : v;
  if (v.startsWith("#")) return v;
  if (/^mailto:[^\s]+$/i.test(v)) return v;
  try {
    const u = new URL(v);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname ? v : null;
  } catch {
    return null;
  }
}

function hrefFromAttrs(attrs: string): string | null {
  const m = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
  if (!m) return null;
  return safeHref(m[1] ?? m[2] ?? m[3] ?? "");
}

function link(href: string, children: ReactNode, key: number) {
  return (
    <a key={key} href={href} rel="noopener noreferrer">
      {children}
    </a>
  );
}

function renderInline(src: string, inLink: boolean, depth: number): ReactNode[] {
  if (depth > 4) return [plain(src)];
  const out: ReactNode[] = [];
  const re = new RegExp(TOKEN_SOURCE, "gi");
  let last = 0;
  let n = 0;

  for (const m of src.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(plain(src.slice(last, idx)));
    last = idx + m[0].length;
    const key = n++;

    if (m[1] !== undefined) {
      const href = hrefFromAttrs(m[1]);
      const inner = renderInline(m[2] ?? "", true, depth + 1);
      out.push(href && !inLink ? link(href, inner, key) : <span key={key}>{inner}</span>);
    } else if (m[3] !== undefined) {
      out.push(<strong key={key}>{renderInline(m[4] ?? "", inLink, depth + 1)}</strong>);
    } else if (m[5] !== undefined) {
      out.push(<em key={key}>{renderInline(m[6] ?? "", inLink, depth + 1)}</em>);
    } else if (m[7] !== undefined) {
      out.push(<code key={key}>{plain(m[7])}</code>);
    } else if (m[8] !== undefined) {
      const href = safeHref(m[9] ?? "");
      out.push(href && !inLink ? link(href, plain(m[8]), key) : plain(m[8]));
    } else if (m[10] !== undefined) {
      let url = m[10];
      const trail = /[.,;:!?)\]'"]+$/.exec(url)?.[0] ?? "";
      url = url.slice(0, url.length - trail.length);
      const href = safeHref(url);
      if (href && !inLink) out.push(link(href, plain(url), key));
      else out.push(plain(url));
      if (trail) out.push(trail);
    } else {
      out.push(<br key={key} />);
    }
  }
  if (last < src.length) out.push(plain(src.slice(last)));
  return out;
}

/**
 * Splits stored text into paragraphs. Existing <p>…</p> markup becomes a paragraph
 * break (so <p> is never nested inside our own <p>). With `blankLines`, empty
 * lines also start a new paragraph (used by the editor's paragraph block).
 */
export function paragraphsFrom(text: string, blankLines = true): string[] {
  let t = text
    .replace(/\r\n?/g, "\n")
    .replace(DROP_WITH_CONTENT, "")
    .replace(/<\/p\s*>(?:\s*<p\b[^>]*>)?|<p\b[^>]*>|<\/?div\b[^>]*>/gi, "\n\n");
  t = t.trim();
  const hadBlockTags = /<\/?(p|div)\b/i.test(text);
  const parts = blankLines || hadBlockTags ? t.split(/\n[ \t]*\n+/) : [t];
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function InlineText({ text }: { text: string }) {
  return <>{renderInline(text.replace(DROP_WITH_CONTENT, ""), false, 0)}</>;
}

/** Renders a stored paragraph string as one or more <p> elements. */
export function RichParagraphs({ text, blankLines = false, style }: { text: string; blankLines?: boolean; style?: CSSProperties }) {
  return (
    <>
      {paragraphsFrom(text, blankLines).map((p, i) => (
        <p key={i} style={style}>
          <InlineText text={p} />
        </p>
      ))}
    </>
  );
}