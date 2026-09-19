"use client";

import { useEffect, useState } from "react";
import { getChanceBand } from "@/lib/algorithm";

interface Props {
  value: number;
  size?: "lg" | "sm";
  caption?: string;
}

/** Circular chance meter drawn with a CSS conic-gradient. Counts up from 0 on mount. */
export default function ChanceRing({ value, size = "lg", caption = "Chance" }: Props) {
  const [shown, setShown] = useState(0);
  const band = getChanceBand(value);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 1300;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div
      className={`chance-ring${size === "sm" ? " sm" : ""}`}
      data-band={band.key}
      style={{ "--p": shown } as React.CSSProperties}
      role="img"
      aria-label={`${value} percent chance of a snow day. ${band.label}.`}
    >
      <div className="ring-inner" aria-hidden="true">
        <div className="ring-value">{shown}<small>%</small></div>
        {size === "lg" && <div className="ring-caption">{caption}</div>}
      </div>
    </div>
  );
}
