"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@shared/components/Icon";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Overview", icon: "chart" },
  { href: "/bookings", label: "Bookings", icon: "cal" },
  { href: "/services", label: "Services", icon: "list" },
  { href: "/team", label: "Team", icon: "users" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

// The dashboard's sections. The layout can't see the path, so this reads it on the client.
export function DashNav() {
  const pathname = usePathname();
  const isCurrent = (href: string) => (href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav className="dash-nav" aria-label="Business dashboard">
      <ul className="chips dash-tabs">
        {ITEMS.map(item => (
          <li key={item.href}>
            <Link className="chip" href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined}>
              <Icon name={item.icon} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
