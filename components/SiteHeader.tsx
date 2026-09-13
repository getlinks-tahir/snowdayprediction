"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("snowday-theme");
    const shouldUseDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(shouldUseDark);
    document.documentElement.dataset.theme = shouldUseDark ? "dark" : "light";
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("snowday-theme", next ? "dark" : "light");
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Snow Day Calculator home">
          <span aria-hidden="true">❄️</span>
          <span>
            <strong>Snow Day Calculator</strong>
            <small>Tomorrow&apos;s forecast, simplified</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/#calculator">Calculator</Link>
          <Link href="/blog">Blog</Link>
          <a href="/#how-it-works">How it works</a>
          <button className="theme-button" onClick={toggleTheme} type="button" aria-label="Toggle colour theme">
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </nav>
      </div>
    </header>
  );
}
