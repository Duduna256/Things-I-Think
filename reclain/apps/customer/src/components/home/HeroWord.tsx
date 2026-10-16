"use client";

import { useEffect, useRef, useState } from "react";

const SWAP_EVERY_MS = 2600;
const SWAP_OUT_MS = 280;

// The rotating italic word in the hero headline. Decorative: the <h1> carries the plain
// sentence for screen readers. The wrapper eases to each word's measured width, so the
// centred line glides instead of lurching. With reduced motion the first word stays put.
export function HeroWord({ words }: { words: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"" | "out" | "in">("");
  const wrapRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure || words.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let widths: number[] = [];
    let current = 0;
    let alive = true;
    let swapTimer: number | undefined;

    // Widths in em, so they stay right when the headline's font size changes with the screen.
    const remeasure = () => {
      const size = parseFloat(getComputedStyle(wrap).fontSize) || 16;
      widths = Array.from(measure.children, el => el.getBoundingClientRect().width / size);
    };
    const fit = (i: number) => {
      if (widths[i]) wrap.style.width = `${widths[i]}em`;
    };
    remeasure();
    fit(0);
    document.fonts?.ready.then(() => {
      if (!alive) return;
      remeasure();
      fit(current);
    });

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setPhase("out");
      swapTimer = window.setTimeout(() => {
        current = (current + 1) % words.length;
        fit(current);
        setIndex(current);
        setPhase("in");
      }, SWAP_OUT_MS);
    }, SWAP_EVERY_MS);

    return () => {
      alive = false;
      window.clearInterval(timer);
      window.clearTimeout(swapTimer);
      wrap.style.width = "";
    };
  }, [words]);

  return (
    <span className="rot-wrap" ref={wrapRef}>
      <em className={phase ? `rot-word swap-${phase}` : "rot-word"}>{words[index] ?? ""}</em>
      <span className="rot-measure" ref={measureRef}>
        {words.map(w => (
          <em key={w}>{w}</em>
        ))}
      </span>
    </span>
  );
}
