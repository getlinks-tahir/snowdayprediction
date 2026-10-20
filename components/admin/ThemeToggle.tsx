"use client";

import Icon from "./Icon";

/** Same storage key and event as the public header, so the choice is shared across the whole site. */
function toggleTheme() {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try { localStorage.setItem("theme", next); } catch { /* private mode: the choice just will not stick */ }
  window.dispatchEvent(new CustomEvent("themechange", { detail: next }));
}

export default function ThemeToggle() {
  return (
    <button type="button" className="icon-btn theme-toggle" onClick={toggleTheme} aria-label="Switch between light and dark mode">
      <Icon name="sun" className="icon-sun" />
      <Icon name="moon" className="icon-moon" />
    </button>
  );
}
