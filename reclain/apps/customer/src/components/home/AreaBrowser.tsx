"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { RegionLinks } from "./stats";

// "Browse by area": region tabs (arrow keys move between them) over a list of
// category-in-area links. Switching tabs only swaps the panel, so focus stays on the tab.
export function AreaBrowser({ regions }: { regions: RegionLinks[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  if (!regions.length) return null;
  const current = regions[Math.min(active, regions.length - 1)];

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = regions.length;
    const next = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  const list = (
    <ul className="area-list">
      {current.links.map(l => (
        <li key={l.href}>
          <Link className="area-link" href={l.href}>
            <b>{l.title}</b>
            <small>{l.sub}</small>
          </Link>
        </li>
      ))}
    </ul>
  );

  if (regions.length === 1) return list;

  return (
    <>
      <div className="area-tabs" role="tablist" aria-label="Region">
        {regions.map((r, i) => (
          <button
            key={r.region}
            ref={el => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            className="area-tab"
            id={`${id}-tab-${i}`}
            aria-selected={r === current}
            aria-controls={`${id}-panel`}
            tabIndex={r === current ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={e => onKeyDown(e, i)}
          >
            {r.region}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${regions.indexOf(current)}`}>
        {list}
      </div>
    </>
  );
}
