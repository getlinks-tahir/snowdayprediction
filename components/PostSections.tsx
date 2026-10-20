import type { PostSection } from "@/content/posts";
import BlockView from "@/components/BlockView";
import { sectionToViewBlock, type LooseSection } from "@/lib/admin/blocks";

/**
 * Renders post sections the way the public blog always has, unless the section
 * carries a block from the new editor. Existing posts have no block and no
 * sentinel, so their markup is unchanged.
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
            {s.heading && <h2 style={{ fontSize: "1.6rem" }}>{s.heading}</h2>}
            {s.paragraphs?.map((p, j) => <p key={j}>{p}</p>)}
            {s.list && (
              <ul>
                {s.list.map((li, j) => <li key={j}>{li}</li>)}
              </ul>
            )}
            {s.callout && <div className="callout"><p>{s.callout}</p></div>}
          </section>
        );
      })}
    </>
  );
}
