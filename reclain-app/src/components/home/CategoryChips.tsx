import Link from "next/link";
import { Icon } from "@/components/Icon";

export interface ChipLink {
  key: string;
  href: string;
  label: string;
  icon?: string;
  isNew?: boolean;
  current?: boolean;
}

// A scrolling row of big category chips. They are links, so they work without JavaScript
// and keep their place in history.
export function CategoryChips({ chips, label = "Categories" }: { chips: ChipLink[]; label?: string }) {
  return (
    <nav aria-label={label}>
      <ul className="chips chip-row">
        {chips.map(c => (
          <li key={c.key}>
            <Link className={c.icon ? "chip chip-lg" : "chip chip-lg chip-all"} href={c.href} aria-current={c.current ? "page" : undefined}>
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
