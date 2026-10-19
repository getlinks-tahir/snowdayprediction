import {
  audioEmbed,
  htmlDocument,
  isSafeHref,
  isSafeMediaUrl,
  markdownToHtml,
  videoEmbedSrc,
  type ContentBlock,
} from "@/lib/admin/blocks";

/**
 * Public rendering for one content block.
 * Legacy posts never reach this component. HTML is sandboxed and cannot run JavaScript.
 */
export default function BlockView({ block, theme = "auto" }: { block: ContentBlock; theme?: "auto" | "light" | "dark" }) {
  switch (block.type) {
    case "paragraph":
      return <p style={{ margin: "0 0 1rem" }}>{block.text}</p>;
    case "heading": {
      const Tag = block.level === 1 ? "h1" : block.level === 3 ? "h3" : "h2";
      const size = block.level === 1 ? "2rem" : block.level === 3 ? "1.25rem" : "1.6rem";
      return <Tag style={{ fontSize: size, lineHeight: 1.25, margin: "1.4rem 0 0.7rem" }}>{block.text}</Tag>;
    }
    case "bulletList":
      return (
        <ul style={{ margin: "0 0 1rem", paddingLeft: "1.25rem" }}>
          {block.items.filter(Boolean).map((item, i) => <li key={i} style={{ margin: "0.25rem 0" }}>{item}</li>)}
        </ul>
      );
    case "numberedList":
      return (
        <ol style={{ margin: "0 0 1rem", paddingLeft: "1.25rem" }}>
          {block.items.filter(Boolean).map((item, i) => <li key={i} style={{ margin: "0.25rem 0" }}>{item}</li>)}
        </ol>
      );
    case "quote":
      return (
        <blockquote style={{ margin: "0 0 1rem", padding: "0.2rem 0 0.2rem 1rem", borderLeft: "3px solid currentColor", opacity: 0.9 }}>
          <p style={{ margin: 0 }}>{block.text}</p>
        </blockquote>
      );
    case "divider":
      return <hr style={{ border: 0, borderTop: "1px solid currentColor", opacity: 0.25, margin: "1.5rem 0" }} />;
    case "image":
      if (!isSafeMediaUrl(block.url)) return null;
      return (
        <figure style={{ margin: "0 0 1.2rem" }}>
          <img src={block.url} alt={block.alt} style={{ width: "100%", height: "auto", borderRadius: 12, display: "block" }} />
          {block.caption ? <figcaption style={{ fontSize: "0.9rem", opacity: 0.7, marginTop: 8 }}>{block.caption}</figcaption> : null}
        </figure>
      );
    case "gallery": {
      const images = block.images.filter((img) => isSafeMediaUrl(img.url));
      if (!images.length) return null;
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, margin: "0 0 1.2rem" }}>
          {images.map((img, i) => <img key={i} src={img.url} alt={img.alt} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12 }} />)}
        </div>
      );
    }
    case "video": {
      const src = videoEmbedSrc(block.url);
      if (!src) return null;
      return (
        <div style={{ position: "relative", paddingTop: "56.25%", margin: "0 0 1.2rem", borderRadius: 12, overflow: "hidden", background: "#111" }}>
          <iframe
            title="Embedded video"
            src={src}
            sandbox="allow-scripts allow-same-origin allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        </div>
      );
    }
    case "audio": {
      const embed = audioEmbed(block.url);
      if (!embed) return null;
      if (embed.kind === "file") return <audio controls src={embed.src} style={{ width: "100%", margin: "0 0 1.2rem" }} />;
      return (
        <iframe
          title={embed.kind === "spotify" ? "Spotify embed" : "SoundCloud embed"}
          src={embed.src}
          sandbox="allow-scripts allow-same-origin allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ width: "100%", height: embed.kind === "spotify" ? 152 : 166, border: 0, borderRadius: 12, margin: "0 0 1.2rem" }}
        />
      );
    }
    case "html":
      return (
        <iframe
          title="HTML block"
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={htmlDocument(block.html, theme)}
          style={{ width: "100%", minHeight: 180, height: Math.min(720, Math.max(180, block.html.length / 2)), border: 0, display: "block", margin: "0 0 1rem" }}
        />
      );
    case "markdown":
      return (
        <iframe
          title="Markdown preview"
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={htmlDocument(markdownToHtml(block.markdown), theme)}
          style={{ width: "100%", minHeight: 80, height: Math.min(720, Math.max(80, block.markdown.length / 2)), border: 0, display: "block", margin: "0 0 1rem" }}
        />
      );
    case "table": {
      const rows = block.rows.filter((row) => row.some((cell) => cell.trim()));
      if (!rows.length) return null;
      const [first, ...rest] = rows;
      const body = block.hasHeader ? rest : rows;
      return (
        <div style={{ overflowX: "auto", margin: "0 0 1.2rem" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            {block.hasHeader && first ? (
              <thead>
                <tr>{first.map((cell, i) => <th key={i} style={{ border: "1px solid color-mix(in srgb, currentColor 28%, transparent)", padding: "8px 10px", textAlign: "left" }}>{cell}</th>)}</tr>
              </thead>
            ) : null}
            <tbody>
              {body.map((row, r) => (
                <tr key={r}>{row.map((cell, c) => <td key={c} style={{ border: "1px solid color-mix(in srgb, currentColor 28%, transparent)", padding: "8px 10px", verticalAlign: "top" }}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "button": {
      const label = block.label.trim() || "Button";
      if (!isSafeHref(block.href)) return <p><span style={{ display: "inline-block", padding: "10px 16px", borderRadius: 999, border: "1px solid currentColor", fontWeight: 700 }}>{label}</span></p>;
      return (
        <p style={{ margin: "0 0 1rem" }}>
          <a href={block.href} style={{ display: "inline-block", padding: "10px 16px", borderRadius: 999, border: "1px solid currentColor", color: "inherit", textDecoration: "none", fontWeight: 700 }}>{label}</a>
        </p>
      );
    }
    case "callout":
      return (
        <div className="callout">
          <p>{block.text}</p>
        </div>
      );
    case "code":
      return (
        <pre style={{ overflow: "auto", padding: "14px 16px", borderRadius: 12, background: "#16181d", color: "#e8eaed", margin: "0 0 1.2rem" }}>
          <code>{block.code}</code>
        </pre>
      );
    default:
      return null;
  }
}
