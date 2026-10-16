import "@shared/styles/auth.css";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { features } from "@shared/config/features";
import { site } from "@shared/config/site";
import { safeNext } from "@shared/auth/actions";
import { getSessionUser } from "@shared/lib/auth";
import { data } from "@shared/lib/data";
import { isDemo } from "@shared/lib/env";
import { Icon } from "@shared/components/Icon";
import { LoginPanel } from "@shared/components/auth/LoginPanel";
import { PersonaPicker } from "@shared/components/auth/PersonaPicker";
import { cleanNext, loginContext, parseView } from "@shared/components/auth/logic";

export const metadata: Metadata = {
  title: "Log in or sign up",
  description: `Log in to ${site.name} to book and pay for services in ${site.city}, or to run your business.`,
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = await safeNext(cleanNext(sp.next, [site.url]));
  const user = await getSessionUser();

  if (isDemo) {
    const venue = await data.getBusinessBySlug("braid-republic").catch(() => null);
    return (
      <div className="auth">
        <div className="auth-bg" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <section className="auth-card auth-card-wide" aria-labelledby="auth-title">
          <p className="auth-brand" aria-hidden="true">
            {site.shortName}
          </p>
          <h1 className="auth-title" id="auth-title">
            Pick a <span className="em">person</span>
          </h1>
          <p className="auth-sub">{next === "/" ? "See the app through their eyes. One tap, no password." : loginContext(next)}</p>
          <PersonaPicker next={next} current={user} venueName={venue?.name ?? "The Braid Republic"} />
          <div className="auth-demo-note">
            <h2>What&apos;s demo mode?</h2>
            <p>
              {site.shortName} isn&apos;t connected to its database yet, so it runs on sample venues and pretend people. Payments are
              simulated, texts go to the server log, and everything resets when the server restarts.
            </p>
            <p className="hint">
              Real log-in by email link, password and Google switches on once Supabase keys are added. See docs/GO-LIVE.md.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (user) redirect(next);

  const methods = { link: features.emailLinkLogin, password: features.passwordLogin, google: features.googleLogin };
  const anyMethod = methods.link || methods.password || methods.google;

  return (
    <div className="auth">
      <div className="auth-bg" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="auth-brand" aria-hidden="true">
          {site.shortName}
        </p>
        <h1 className="auth-title" id="auth-title">
          Log in or <span className="em">sign up</span>
        </h1>
        <p className="auth-sub">{loginContext(next)}</p>
        {anyMethod ? (
          <LoginPanel next={next} methods={methods} initialView={parseView(sp.mode) ?? (methods.link ? "link" : "login")} />
        ) : (
          <div className="notice notice-warn">
            <Icon name="alert" />
            <p>
              Logging in is switched off for a moment. Try again soon, or email <a href={`mailto:${site.email}`}>{site.email}</a>.
            </p>
          </div>
        )}
      </section>
      <p className="auth-foot">
        Trouble logging in? Email <a href={`mailto:${site.email}`}>{site.email}</a>. <Link href="/">Back to the homepage</Link>
      </p>
    </div>
  );
}
