import Link from "next/link";
import { site } from "../../config/site";
import { demoSignIn } from "../../auth/actions";
import { DEMO_USERS } from "../../lib/auth";
import { initials } from "../../lib/format";
import type { SessionUser } from "../../lib/types";
import { Icon } from "../Icon";
import { personaNext } from "./logic";

// Demo mode's log-in: three pretend people, one tap each. Server-rendered forms, so it works
// before any JavaScript arrives.
export function PersonaPicker({ next, current, venueName }: { next: string; current: SessionUser | null; venueName: string }) {
  const people = [
    {
      role: "customer",
      user: DEMO_USERS.customer,
      label: DEMO_USERS.customer.fullName ?? "Grace Nakato",
      short: (DEMO_USERS.customer.fullName ?? "Grace").split(" ")[0],
      tag: "Customer",
      does: "Books braids, pays by pretend MoMo, cancels and leaves reviews.",
      tone: "lilac",
    },
    {
      role: "provider",
      user: DEMO_USERS.provider,
      label: DEMO_USERS.provider.fullName ?? "Aisha Namuli",
      short: (DEMO_USERS.provider.fullName ?? "Aisha").split(" ")[0],
      tag: `Runs ${venueName}`,
      does: "Sees today's bookings, edits the menu and team, marks cash as paid.",
      tone: "peach",
    },
    {
      role: "admin",
      user: DEMO_USERS.admin,
      label: `${site.shortName} admin`,
      short: "the admin",
      tag: "Admin",
      does: "Approves new businesses before they appear in search.",
      tone: "mint",
    },
  ];
  const me = people.find(p => p.user.id === current?.id);

  return (
    <>
      {me && (
        <div className="notice notice-info auth-current">
          <Icon name="user" />
          <p>
            You&apos;re {me.short} right now. Pick someone else to switch, or{" "}
            <Link href={personaNext(me.role, next)}>carry on as {me.short}</Link>.
          </p>
        </div>
      )}
      <ul className="persona-list" aria-label="Pretend people">
        {people.map(p => (
          <li key={p.role}>
            <form action={demoSignIn}>
              <input type="hidden" name="role" value={p.role} />
              <input type="hidden" name="next" value={personaNext(p.role, next)} />
              <button type="submit" className={`persona persona-${p.tone}`}>
                <span className="avatar persona-av" aria-hidden="true">
                  {initials(p.label)}
                </span>
                <span className="persona-text">
                  <span className="sr-only">Log in as </span>
                  <span className="persona-name">{p.label}</span>
                  <span className="persona-tag">{p.tag}</span>
                  <span className="persona-does">{p.does}</span>
                </span>
                {me?.role === p.role ? (
                  <span className="pill pill-info persona-now">
                    You, right now
                  </span>
                ) : (
                  <span className="persona-go" aria-hidden="true">
                    <Icon name="arrow" />
                  </span>
                )}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
