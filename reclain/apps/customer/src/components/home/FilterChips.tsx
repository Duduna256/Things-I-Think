"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { Icon } from "@shared/components/Icon";
import { searchHref } from "./suggest";

export interface FilterChip {
  key: string;
  cat: string; // "" for All
  href: string; // where the chip goes without JavaScript
  label: string;
  icon?: string;
  isNew?: boolean;
  current: boolean;
}

// Category chips on the search page. Each is a real link, but a plain click also picks up
// what the search boxes show right now (even if Search wasn't pressed), so the results
// never contradict the visible area and day.
export function FilterChips({ chips, formId, label = "Filter by category" }: { chips: FilterChip[]; formId: string; label?: string }) {
  const router = useRouter();

  const onClick = (e: MouseEvent<HTMLAnchorElement>, cat: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;
    e.preventDefault();
    const values = new FormData(form);
    const get = (k: string) => String(values.get(k) ?? "");
    router.push(searchHref({ q: get("q"), area: get("area"), cat, when: get("when") }));
  };

  return (
    <nav aria-label={label}>
      <ul className="chips chip-row">
        {chips.map(c => (
          <li key={c.key}>
            <Link
              className={c.icon ? "chip chip-lg" : "chip chip-lg chip-all"}
              href={c.href}
              aria-current={c.current ? "page" : undefined}
              onClick={e => onClick(e, c.cat)}
            >
              {c.icon && (
                <span className="chip-ic" aria-hidden="true">
                  <Icon name={c.icon} />
                </span>
              )}
              {c.label}
              {c.isNew && <span className="new">NEW</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
