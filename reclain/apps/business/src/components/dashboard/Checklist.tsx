// What's left before a draft business can go for review, with a link to fix each one.

import Link from "next/link";
import { Icon } from "@shared/components/Icon";
import type { ReadinessItem } from "./logic";

const WHERE: Record<ReadinessItem["key"], { href: string; label: string }> = {
  service: { href: "/services", label: "Add a service" },
  team: { href: "/team", label: "Check your team" },
  phone: { href: "/settings#phone", label: "Add a phone number" },
  blurb: { href: "/settings#blurb", label: "Write a description" },
  address: { href: "/settings#address", label: "Add your address" },
};

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1) + ".";

export function Checklist({ items }: { items: ReadinessItem[] }) {
  return (
    <ul className="dash-checklist">
      {items.map(item => (
        <li key={item.key} className={item.done ? "is-done" : undefined}>
          <span className="dash-check" aria-hidden="true">
            {item.done && <Icon name="check" />}
          </span>
          <span className="dash-check-text">
            <span className="sr-only">{item.done ? "Done: " : "To do: "}</span>
            {sentence(item.label)}
            {!item.required && <span className="muted"> Optional, but it helps.</span>}
          </span>
          {!item.done && (
            <Link className="btn btn-ghost btn-sm" href={WHERE[item.key].href}>
              {WHERE[item.key].label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
