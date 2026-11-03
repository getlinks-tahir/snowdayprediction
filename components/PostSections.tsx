import type { PostSection } from "@/content/posts";
import BlockView from "@/components/BlockView";
import SafeInlineHtml from "@/components/SafeInlineHtml";
import { sectionToViewBlock, type LooseSection } from "@/lib/admin/blocks";

/**
 * Renders post sections for both the public blog and the admin live preview.
 * Sections carrying a rich ContentBlock render through BlockView; legacy sections
 * render with SafeInlineHtml so inline formatting works everywhere without breaking
 * existing published posts.
 */
export default function PostSections({ sections }: { sections: PostSection[] }) {
  return (
    <>
      {sections.map((raw, i) => {
        const block = sectionToViewBlock(raw as LooseSection);
        if (block) {
          return (
            <section key={i}>
              <BlockView block={block} />
            </section>
          );
        }
        const s = raw;
        return (
          <section key={i}>
            {s.heading && (
              <h2 style={{ fontSize: "1.6rem" }}>
                <SafeInlineHtml html={s.heading} />
              </h2>
            )}
            {s.paragraphs?.map((p, j) => (
              <p key={j}>
                <SafeInlineHtml html={p} />
              </p>
            ))}
            {s.list && s.list.length > 0 && (
              <ul>
                {s.list.map((li, j) => (
                  <li key={j}>
                    <SafeInlineHtml html={li} />
                  </li>
                ))}
              </ul>
            )}
            {s.callout && (
              <div className="callout">
                <p>
                  <SafeInlineHtml html={s.callout} />
                </p>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
