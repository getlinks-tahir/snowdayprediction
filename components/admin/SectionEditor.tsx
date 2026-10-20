"use client";

import { useState } from "react";
import type { PostSection, SectionInput } from "@/lib/admin/types";
import { splitLines, splitParagraphs } from "@/lib/admin/validators";
import Icon from "./Icon";

/** Editor-side shape. Paragraphs and list are kept as raw text so typing blank lines and trailing newlines works. */
export interface EditorSection {
  uid: string;
  heading: string;
  paragraphsText: string;
  listText: string;
  callout: string;
  showList: boolean;
  showCallout: boolean;
  collapsed: boolean;
}

export const emptySection = (uid: string): EditorSection => ({
  uid, heading: "", paragraphsText: "", listText: "", callout: "", showList: false, showCallout: false, collapsed: false,
});

export function toEditorSection(s: PostSection, uid: string): EditorSection {
  return {
    uid,
    heading: s.heading ?? "",
    paragraphsText: (s.paragraphs ?? []).join("\n\n"),
    listText: (s.list ?? []).join("\n"),
    callout: s.callout ?? "",
    showList: Boolean(s.list?.length),
    showCallout: Boolean(s.callout),
    collapsed: false,
  };
}

export function toSectionInput(s: EditorSection): SectionInput {
  return {
    heading: s.heading,
    paragraphs: splitParagraphs(s.paragraphsText),
    list: s.showList ? splitLines(s.listText) : [],
    callout: s.showCallout ? s.callout : "",
  };
}

/** Same shape as the stored data: only keys that have content. */
export function toPostSection(s: SectionInput): PostSection {
  const out: PostSection = {};
  if (s.heading.trim()) out.heading = s.heading.trim();
  if (s.paragraphs.length) out.paragraphs = s.paragraphs;
  if (s.list.length) out.list = s.list;
  if (s.callout.trim()) out.callout = s.callout.trim();
  return out;
}

interface Props {
  section: EditorSection;
  index: number;
  total: number;
  onChange: (patch: Partial<EditorSection>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const rowsFor = (text: string, min: number) => Math.min(20, Math.max(min, text.split("\n").length + 1));

export default function SectionEditor({ section: s, index, total, onChange, onMove, onDuplicate, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const paragraphs = splitParagraphs(s.paragraphsText).length;
  const items = s.showList ? splitLines(s.listText).length : 0;
  const summary = [
    paragraphs ? `${paragraphs} paragraph${paragraphs > 1 ? "s" : ""}` : null,
    items ? `${items} list item${items > 1 ? "s" : ""}` : null,
    s.showCallout && s.callout.trim() ? "callout" : null,
  ].filter(Boolean).join(" · ");

  return (
    <fieldset className="a-section">
      <legend className="sr-only">Section {index + 1}</legend>
      <div className="a-section-head">
        <button type="button" className="a-section-toggle" onClick={() => onChange({ collapsed: !s.collapsed })} aria-expanded={!s.collapsed}>
          <Icon name="chevron" className={`a-icon a-chev ${s.collapsed ? "is-closed" : ""}`} />
          <span className="a-section-num">Section {index + 1}</span>
          <span className="a-section-title">{s.heading.trim() || (s.collapsed ? "No heading" : "")}</span>
          {s.collapsed && summary && <span className="a-section-sum">{summary}</span>}
        </button>
        <div className="a-section-tools">
          <button type="button" className="icon-btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move section ${index + 1} up`} title="Move up"><Icon name="up" /></button>
          <button type="button" className="icon-btn" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={`Move section ${index + 1} down`} title="Move down"><Icon name="down" /></button>
          <button type="button" className="icon-btn" onClick={onDuplicate} aria-label={`Duplicate section ${index + 1}`} title="Duplicate"><Icon name="copy" /></button>
          {confirmDelete ? (
            <>
              <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>Delete section</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Keep</button>
            </>
          ) : (
            <button type="button" className="icon-btn a-danger" onClick={() => setConfirmDelete(true)} aria-label={`Delete section ${index + 1}`} title="Delete"><Icon name="trash" /></button>
          )}
        </div>
      </div>

      {!s.collapsed && (
        <div className="a-section-body">
          <label className="a-field">
            <span className="a-label">Heading <em>(optional)</em></span>
            <input className="a-input" value={s.heading} onChange={(e) => onChange({ heading: e.target.value })} maxLength={200} placeholder="Shown as a large subheading" />
          </label>

          <label className="a-field">
            <span className="a-label">Paragraphs <em>({paragraphs} — separate with a blank line)</em></span>
            <textarea className="a-input a-textarea" value={s.paragraphsText} rows={rowsFor(s.paragraphsText, 5)} onChange={(e) => onChange({ paragraphsText: e.target.value })} placeholder={"First paragraph.\n\nSecond paragraph."} />
          </label>

          {s.showList ? (
            <label className="a-field">
              <span className="a-label">
                Bullet list <em>({items} — one item per line)</em>
                <button type="button" className="a-link-btn" onClick={() => onChange({ showList: false, listText: "" })}>Remove list</button>
              </span>
              <textarea className="a-input a-textarea" value={s.listText} rows={rowsFor(s.listText, 4)} onChange={(e) => onChange({ listText: e.target.value })} placeholder={"First item\nSecond item"} />
            </label>
          ) : null}

          {s.showCallout ? (
            <label className="a-field">
              <span className="a-label">
                Callout box
                <button type="button" className="a-link-btn" onClick={() => onChange({ showCallout: false, callout: "" })}>Remove callout</button>
              </span>
              <textarea className="a-input a-textarea" value={s.callout} rows={rowsFor(s.callout, 3)} onChange={(e) => onChange({ callout: e.target.value })} placeholder="A highlighted tip or note" />
            </label>
          ) : null}

          <div className="a-section-add">
            {!s.showList && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({ showList: true })}><Icon name="plus" /> Add bullet list</button>}
            {!s.showCallout && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({ showCallout: true })}><Icon name="plus" /> Add callout</button>}
            <span className="a-hint">On the site each section shows in this order: heading, paragraphs, list, callout.</span>
          </div>
        </div>
      )}
    </fieldset>
  );
}
