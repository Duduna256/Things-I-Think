import "@shared/styles/auth.css";
import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@shared/config/site";
import { safeNext } from "@shared/auth/actions";
import { Icon } from "@shared/components/Icon";
import { cleanNext, loginHref, parseReason, REASON_COPY } from "@shared/components/auth/logic";

export const metadata: Metadata = { title: "That link didn't work", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Where /auth/callback and /auth/confirm send people when a link or Google didn't log them in.
export default async function AuthErrorPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const reason = parseReason(sp.reason);
  const next = await safeNext(cleanNext(sp.next, [site.url]));
  const copy = REASON_COPY[reason];

  return (
    <div className="auth">
      <div className="auth-bg" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <section className="auth-card auth-oops" aria-labelledby="auth-title">
        <span className="auth-sent-ic auth-oops-ic" aria-hidden="true">
          <Icon name="alert" />
        </span>
        <h1 className="auth-title" id="auth-title">
          {copy.title}
        </h1>
        <p className="auth-sub">{copy.body}</p>
        <p className="auth-small">No harm done: nothing was booked or paid on the way.</p>
        <div className="auth-actions">
          <Link className="btn btn-black btn-wide" href={loginHref(next)}>
            Back to log in
          </Link>
          <Link className="btn btn-ghost btn-wide" href="/">
            Go to the homepage
          </Link>
        </div>
        <p className="auth-small">
          Still stuck? Email <a href={`mailto:${site.email}`}>{site.email}</a> and we&apos;ll sort it out.
        </p>
      </section>
    </div>
  );
}
