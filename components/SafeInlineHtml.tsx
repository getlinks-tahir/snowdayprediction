import React, { type ReactNode } from "react";
import { isSafeHref } from "@/lib/admin/blocks";

const ALLOWED_INLINE_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "del",
  "code",
  "a",
  "br",
  "span",
]);

const DROPPED_SUBTREE_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "applet",
  "meta",
  "link",
  "head",
  "title",
  "noscript",
  "template",
]);

interface AstElement {
  kind: "element";
  tag: string;
  attrs: Record<string, string>;
  children: AstNode[];
}

interface AstText {
  kind: "text";
  value: string;
}

type AstNode = AstElement | AstText;

function decodeHtmlEntities(input: string): string {
  if (!input || !input.includes("&")) return input;
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
    });
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z0-9_:-]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1].toLowerCase();
    if (name.startsWith("on")) continue; // Never allow inline event handlers
    const rawVal = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[name] = decodeHtmlEntities(rawVal.trim());
  }
  return attrs;
}

function sanitizeHref(rawHref: string): string | null {
  const trimmed = rawHref.trim();
  if (!trimmed) return null;
  if (/^(javascript|vbscript|data|file):/i.test(trimmed)) return null;
  if (isSafeHref(trimmed)) return trimmed;
  if (/^(mailto:|tel:|#)/i.test(trimmed)) return trimmed;
  return null;
}

function parseInlineHtmlToAst(html: string): AstNode[] {
  const root: AstElement = { kind: "element", tag: "root", attrs: {}, children: [] };
  const stack: AstElement[] = [root];
  const tagTokenRegex = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^<>]*?)(\/?)>/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagTokenRegex.exec(html)) !== null) {
    const currentParent = stack[stack.length - 1];

    if (match.index > lastIndex) {
      const rawText = html.slice(lastIndex, match.index);
      if (!DROPPED_SUBTREE_TAGS.has(currentParent.tag)) {
        currentParent.children.push({
          kind: "text",
          value: decodeHtmlEntities(rawText),
        });
      }
    }

    lastIndex = tagTokenRegex.lastIndex;

    if (match[0].startsWith("<!--")) {
      continue;
    }

    const isClosing = match[1] === "/";
    const tagName = match[2].toLowerCase();
    const attrPart = match[3] ?? "";
    const isSelfClosing = match[4] === "/" || tagName === "br" || tagName === "hr" || tagName === "img";

    if (isClosing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tagName) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const elem: AstElement = {
      kind: "element",
      tag: tagName,
      attrs: parseAttributes(attrPart),
      children: [],
    };

    if (!DROPPED_SUBTREE_TAGS.has(currentParent.tag)) {
      currentParent.children.push(elem);
    }

    if (!isSelfClosing) {
      stack.push(elem);
    }
  }

  const finalParent = stack[stack.length - 1];
  if (lastIndex < html.length && !DROPPED_SUBTREE_TAGS.has(finalParent.tag)) {
    finalParent.children.push({
      kind: "text",
      value: decodeHtmlEntities(html.slice(lastIndex)),
    });
  }

  return root.children;
}

function applySpanStyleWrappers(styleValue: string, content: ReactNode, key: string): ReactNode {
  const s = styleValue.toLowerCase();
  let node = content;
  if (/font-weight\s*:\s*(bold|[6-9]00)\b/.test(s)) {
    node = <strong key={`${key}-b`}>{node}</strong>;
  }
  if (/font-style\s*:\s*italic\b/.test(s)) {
    node = <em key={`${key}-i`}>{node}</em>;
  }
  if (/text-decoration(-line)?\s*:[^;]*underline\b/.test(s)) {
    node = <u key={`${key}-u`}>{node}</u>;
  }
  if (/text-decoration(-line)?\s*:[^;]*line-through\b/.test(s)) {
    node = <s key={`${key}-s`}>{node}</s>;
  }
  return node;
}

function astToReactNodes(nodes: AstNode[], keyPrefix = "inl"): ReactNode[] {
  const out: ReactNode[] = [];

  nodes.forEach((node, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (node.kind === "text") {
      if (node.value) out.push(node.value);
      return;
    }

    if (DROPPED_SUBTREE_TAGS.has(node.tag)) {
      return;
    }

    if (node.tag === "br") {
      out.push(<br key={key} />);
      return;
    }

    const children = astToReactNodes(node.children, key);

    if (!ALLOWED_INLINE_TAGS.has(node.tag)) {
      out.push(<React.Fragment key={key}>{children}</React.Fragment>);
      return;
    }

    switch (node.tag) {
      case "b":
      case "strong":
        out.push(<strong key={key}>{children}</strong>);
        break;
      case "i":
      case "em":
        out.push(<em key={key}>{children}</em>);
        break;
      case "u":
        out.push(<u key={key}>{children}</u>);
        break;
      case "s":
      case "strike":
      case "del":
        out.push(<s key={key}>{children}</s>);
        break;
      case "code":
        out.push(
          <code
            key={key}
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              padding: "0.12em 0.38em",
              borderRadius: 5,
              fontSize: "0.9em",
              background: "color-mix(in srgb, currentColor 10%, transparent)",
            }}
          >
            {children}
          </code>
        );
        break;
      case "a": {
        const safeHref = sanitizeHref(node.attrs.href ?? "");
        if (!safeHref) {
          out.push(<React.Fragment key={key}>{children}</React.Fragment>);
        } else {
          const isExternal = /^https?:\/\//i.test(safeHref);
          out.push(
            <a
              key={key}
              href={safeHref}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}
            >
              {children}
            </a>
          );
        }
        break;
      }
      case "span": {
        const styleAttr = node.attrs.style ?? "";
        if (styleAttr) {
          out.push(applySpanStyleWrappers(styleAttr, children, key));
        } else {
          out.push(<React.Fragment key={key}>{children}</React.Fragment>);
        }
        break;
      }
      default:
        out.push(<React.Fragment key={key}>{children}</React.Fragment>);
        break;
    }
  });

  return out;
}

export default function SafeInlineHtml({ html }: { html: string }) {
  if (!html) return null;
  if (!html.includes("<") && !html.includes("&")) {
    return <>{html}</>;
  }
  const ast = parseInlineHtmlToAst(html);
  return <>{astToReactNodes(ast)}</>;
}