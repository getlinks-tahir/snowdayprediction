
"use client";

import { useEffect, useRef } from "react";

const BLOCKED_TAGS =
  "script,iframe,frame,frameset,object,embed,link,meta,base,applet,form,noscript,template";

const URL_ATTRS = [
  "href", "src", "action", "formaction", "xlink:href", "poster", "srcset"
];

function cleanCss(css: string): string {
  return css
    .replace(/@import[^;]*;?/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/behavior\s*:[^;}]*/gi, "")
    .replace(/-moz-binding\s*:[^;}]*/gi, "")
    .replace(/(^|[,{}\s])(html|body|:root)(?=\s*[,{])/gi, "$1:host");
}

function sanitizeForShadow(input: string): string {
  const doc = new DOMParser().parseFromString(input, "text/html");

  doc.querySelectorAll(BLOCKED_TAGS).forEach((n) => n.remove());

  doc.querySelectorAll("style").forEach((n) => {
    n.textContent = cleanCss(n.textContent ?? "");
  });

  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();

      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
      } else if (
        URL_ATTRS.includes(name) &&
        /^(javascript|vbscript|data):/i.test(value) &&
        !/^data:image\//i.test(value)
      ) {
        el.removeAttribute(attr.name);
      } else if (
        name === "style" &&
        /expression\s*\(|javascript\s*:|behavior\s*:/i.test(value)
      ) {
        el.removeAttribute(attr.name);
      }
    }
  });

  const styles = Array.from(
    doc.head.querySelectorAll("style")
  ).map((n) => n.outerHTML).join("");

  return styles + doc.body.innerHTML;
}

export default function HtmlBlockView({ html }: { html: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const root = el.shadowRoot ?? el.attachShadow({ mode: "open" });

    root.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          overflow-x: auto;
          color: inherit;
          font-family: inherit;
        }
        img, video {
          max-width: 100%;
          height: auto;
        }
      </style>
      ${sanitizeForShadow(html)}
    `;
  }, [html]);

  return (
    <div
      ref={host}
      style={{
        width: "100%",
        marginBottom: "1rem",
        minWidth: 0
      }}
    />
  );
}
