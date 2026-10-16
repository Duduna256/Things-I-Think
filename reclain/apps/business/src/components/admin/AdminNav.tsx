import Link from "next/link";

// The admin area's own tabs: approvals, verification checks and payouts.
export const ADMIN_SECTIONS = [
  { href: "/admin", label: "Approvals" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/payouts", label: "Payouts" },
] as const;

export function AdminNav({ current }: { current: (typeof ADMIN_SECTIONS)[number]["href"] }) {
  return (
    <nav aria-label="Admin sections" className="admin-nav">
      <ul className="chips dash-tabs">
        {ADMIN_SECTIONS.map(s => (
          <li key={s.href}>
            <Link className="chip" href={s.href} aria-current={s.href === current ? "page" : undefined}>
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
