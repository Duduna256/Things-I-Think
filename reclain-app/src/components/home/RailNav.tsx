"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

// Previous / next buttons for a horizontal .rail found by id. They re-check whether there is
// anything to scroll to when the rail scrolls, resizes, its content changes or fonts load,
// so they are never stuck disabled on a full rail.
// aria-disabled (not disabled) keeps keyboard focus on the button when it reaches the end.
export function RailNav({ railId, label }: { railId: string; label: string }) {
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    const rail = document.getElementById(railId);
    if (!rail) return;
    let alive = true;
    const update = () => {
      if (!alive) return;
      setCanPrev(rail.scrollLeft > 4);
      setCanNext(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4);
    };
    const frame = requestAnimationFrame(update);
    rail.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("load", update);
    const resize = new ResizeObserver(update);
    resize.observe(rail);
    const mutate = new MutationObserver(update);
    mutate.observe(rail, { childList: true, subtree: true });
    document.fonts?.ready.then(update);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      rail.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("load", update);
      resize.disconnect();
      mutate.disconnect();
    };
  }, [railId]);

  const scroll = (dir: -1 | 1) => {
    const rail = document.getElementById(railId);
    if (!rail) return;
    if (dir < 0 ? !canPrev : !canNext) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollBy({ left: dir * rail.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="rail-nav">
      <button type="button" className="icon-btn" aria-label={`Previous ${label}`} aria-controls={railId} aria-disabled={!canPrev} onClick={() => scroll(-1)}>
        <Icon name="left" />
      </button>
      <button type="button" className="icon-btn" aria-label={`More ${label}`} aria-controls={railId} aria-disabled={!canNext} onClick={() => scroll(1)}>
        <Icon name="right" />
      </button>
    </div>
  );
}
