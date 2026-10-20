"use client";

import NextLink from "next/link";
import { useState } from "react";
import { Close, Menu, Moon, Snowflake, Sun } from "./Icons";

const NAV = [
  { href: "/#calculator", label: "Calculator" },
  { href: "/#snow-map", label: "Live Map" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#cities", label: "Cities" },
  { href: "/blog", label: "Blog" },
  { href: "/#faq", label: "FAQ" },
];

function toggleTheme() {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* private mode: the choice just will not stick */
  }
  window.dispatchEvent(new CustomEvent("themechange", { detail: next }));
}

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <NextLink href="/" className="brand" aria-label="Snow Day Calculator home">
          <span className="brand-mark"><Snowflake className="" /></span>
          <span>Snow Day <b>Calculator</b></span>
        </NextLink>

        <nav className="main-nav" aria-label="Main">
          {NAV.map((n) => (
            <NextLink key={n.href} href={n.href}>{n.label}</NextLink>
          ))}
        </nav>

        <div className="header-actions">
          <button type="button" className="icon-btn theme-toggle" onClick={toggleTheme} aria-label="Switch between light and dark mode">
            <Sun className="icon-sun" />
            <Moon className="icon-moon" />
          </button>
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <Close /> : <Menu />}
          </button>
        </div>
      </div>
      <nav id="mobile-nav" className="mobile-nav" data-open={open} aria-label="Mobile">
        {NAV.map((n) => (
          <NextLink key={n.href} href={n.href} onClick={() => setOpen(false)}>{n.label}</NextLink>
        ))}
      </nav>
    </header>
  );
}
