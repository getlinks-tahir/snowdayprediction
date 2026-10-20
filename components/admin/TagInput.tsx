"use client";

import { useId, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import Icon from "./Icon";

const MAX_TAGS = 10;
const MAX_LEN = 40;

export default function TagInput({ value, onChange, suggestions }: { value: string[]; onChange: (tags: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState("");
  const listId = useId();

  function addMany(raw: string) {
    const next = [...value];
    for (const part of raw.split(",")) {
      const t = part.trim().slice(0, MAX_LEN);
      if (t && next.length < MAX_TAGS && !next.some((x) => x.toLowerCase() === t.toLowerCase())) next.push(t);
    }
    if (next.length !== value.length) onChange(next);
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addMany(text);
    } else if (e.key === "Backspace" && text === "" && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (pasted.includes(",")) { e.preventDefault(); addMany(pasted); }
  }

  const unused = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <div className="a-tags">
        {value.map((t) => (
          <span key={t} className="a-tag">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove tag ${t}`}><Icon name="close" className="a-icon a-icon-sm" /></button>
          </span>
        ))}
        <input
          className="a-tag-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => addMany(text)}
          list={listId}
          placeholder={value.length >= MAX_TAGS ? "Tag limit reached" : "Type a tag and press Enter"}
          disabled={value.length >= MAX_TAGS}
          maxLength={MAX_LEN}
          aria-label="Add a tag"
        />
        <datalist id={listId}>{unused.map((s) => <option key={s} value={s} />)}</datalist>
      </div>
      <p className="a-hint">{value.length}/{MAX_TAGS} tags. Press Enter or comma to add.</p>
    </div>
  );
}
