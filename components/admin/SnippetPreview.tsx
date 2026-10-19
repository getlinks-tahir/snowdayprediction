import { SITE_NAME, SITE_URL } from "@/lib/site";

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Approximates how the post could look in Google. The page title is "title | site name" on the live site. */
export default function SnippetPreview({ title, slug, description }: { title: string; slug: string; description: string }) {
  const host = new URL(SITE_URL).host;
  const fullTitle = `${title.trim() || "Untitled post"} | ${SITE_NAME}`;
  return (
    <div className="a-snippet" aria-label="Search result preview">
      <div className="a-snippet-url">{host} › blog › {slug || "your-slug"}</div>
      <div className="a-snippet-title">{clip(fullTitle, 60)}</div>
      <div className="a-snippet-desc">{description.trim() ? clip(description.trim(), 160) : "Add a meta description to control what search engines show here."}</div>
    </div>
  );
}
