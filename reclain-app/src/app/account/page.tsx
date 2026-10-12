import "@/styles/auth.css";
import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { signOut } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth";
import { data } from "@/lib/data";
import { isDemo } from "@/lib/env";
import { initials } from "@/lib/format";
import { normalizeMsisdn, prettyMsisdn } from "@/lib/phone";
import type { BusinessStatus } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { ProfileForm } from "@/components/auth/ProfileForm";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

const STATUS: Record<BusinessStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "mute" },
  pending: { label: "Waiting for review", tone: "warn" },
  published: { label: "Live", tone: "ok" },
  suspended: { label: "Paused", tone: "err" },
};

export default async function AccountPage() {
  const user = await requireUser("/account");
  const [profile, businesses] = await Promise.all([data.getMyProfile().catch(() => null), data.getMyBusinesses().catch(() => [])]);
  const me = { ...user, ...(profile ?? {}) };
  const name = me.fullName?.trim() || "";
  const msisdn = normalizeMsisdn(me.phone);
  const deleteMail = `mailto:${site.email}?subject=${encodeURIComponent(`Please delete my ${site.shortName} account`)}&body=${encodeURIComponent(
    `Hello,\n\nPlease delete the ${site.shortName} account for ${me.email ?? "this email address"}.\n\nThank you.`,
  )}`;

  return (
    <div className="wrap-narrow page acct">
      <header className="acct-head">
        <span className="avatar acct-av" aria-hidden="true">
          {initials(name || me.email || "?") || <Icon name="user" />}
        </span>
        <div className="acct-head-text">
          <h1 className="page-title">
            Your <span className="em">account</span>
          </h1>
          <p className="muted">{name ? `Logged in as ${name}.` : "Add your name below so venues know who's coming."}</p>
        </div>
      </header>

      {isDemo && (
        <div className="notice notice-info acct-demo">
          <Icon name="sparkle" />
          <p>
            Demo mode: you&apos;re one of the pretend people. Changes here last until the server restarts.{" "}
            <Link href="/login?next=%2Faccount">Switch person</Link>
          </p>
        </div>
      )}

      <div className="acct-grid">
        <section className="card acct-card acct-details" aria-labelledby="acct-details-h">
          <h2 id="acct-details-h">Your details</h2>
          <dl className="acct-facts">
            <div>
              <dt>Email</dt>
              <dd>{me.email ?? "No email on this account"}</dd>
            </div>
          </dl>
          <p className="hint acct-email-hint">This is how you log in, so it stays as it is.</p>
          <ProfileForm fullName={name} phone={msisdn ? prettyMsisdn(msisdn) : (me.phone ?? "")} />
        </section>

        <div className="acct-side">
          <section className="card acct-card" aria-labelledby="acct-biz-h">
            {businesses.length > 0 ? (
              <>
                <h2 id="acct-biz-h">Your {businesses.length === 1 ? "business" : "businesses"}</h2>
                <ul className="acct-biz">
                  {businesses.slice(0, 4).map(b => (
                    <li key={b.id}>
                      <span className="acct-biz-name">{b.name}</span>
                      <span className={`pill pill-${STATUS[b.status].tone}`}>{STATUS[b.status].label}</span>
                    </li>
                  ))}
                  {businesses.length > 4 && <li className="muted">and {businesses.length - 4} more</li>}
                </ul>
                <Link className="btn btn-black btn-wide" href="/business">
                  Open your dashboard
                </Link>
              </>
            ) : (
              <>
                <h2 id="acct-biz-h">Run a business?</h2>
                <p className="muted">
                  Salons, barbers, laundries, cleaners and repair crews take bookings and mobile money on {site.shortName}. Free to
                  join.
                </p>
                <Link className="btn btn-black btn-wide" href="/business/onboarding">
                  List your business
                </Link>
                <Link className="acct-link" href="/for-business">
                  How it works for pros <Icon name="arrow" />
                </Link>
              </>
            )}
          </section>

          <nav className="card acct-card acct-links" aria-label="Your account">
            <Link className="acct-row" href="/bookings">
              <Icon name="cal" />
              <span>My bookings</span>
              <Icon name="right" className="ic acct-chev" />
            </Link>
            {me.isAdmin && (
              <Link className="acct-row" href="/admin">
                <Icon name="shield" />
                <span>Approve businesses</span>
                <Icon name="right" className="ic acct-chev" />
              </Link>
            )}
            <form action={signOut}>
              <button type="submit" className="acct-row acct-logout">
                <Icon name="logout" />
                <span>Log out</span>
              </button>
            </form>
          </nav>
        </div>
      </div>

      <section className="acct-delete" aria-labelledby="acct-delete-h">
        <h2 id="acct-delete-h">Deleting your account</h2>
        <p>
          Email <a href={deleteMail}>{site.email}</a> from {me.email ? <b className="acct-email">{me.email}</b> : "the address you log in with"}{" "}
          and we&apos;ll take care of it. We&apos;ll reply to confirm before anything is deleted.
        </p>
      </section>
    </div>
  );
}
