import Link from "next/link";
import { Fragment } from "react";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { appBand, faq, occasions, trust } from "@/config/content";
import { site } from "@/config/site";
import { ugx } from "@/lib/format";
import type { TrendingTile } from "./stats";
import { searchHref, venuesLabel } from "./suggest";

// ---------- Marquee (decorative: the same words are in the chips and search) ----------
export function Marquee({ items }: { items: readonly string[] }) {
  const run = (copy: string) =>
    items.map((t, i) => (
      <Fragment key={`${copy}-${i}`}>
        <span className={i % 3 === 1 ? "is-em" : undefined}>{t}</span>
        <Icon name="sparkle" />
      </Fragment>
    ));
  return (
    <div className="home-marquee" aria-hidden="true">
      <div className="marquee-track">
        {run("a")}
        {run("b")}
      </div>
    </div>
  );
}

// ---------- "Got something on?" ----------
export function Occasions() {
  return (
    <section className="wrap block" id="occasions" aria-labelledby="occasions-title">
      <div className="block-head">
        <h2 id="occasions-title">Got something on?</h2>
        <p className="block-note">Tell us the occasion. We&apos;ll find the fix.</p>
      </div>
      <div className="occ-bento">
        {occasions.map(o => (
          <Link key={o.title} href={searchHref({ q: o.q })} className={`occ tone-${o.tone}${"big" in o && o.big ? " occ-big" : ""}`}>
            <span className="occ-title">{o.title}</span>
            <span className="occ-foot">
              <span className="occ-sub">{o.sub}</span>
              <span className="occ-go">
                {o.cta} <Icon name="arrow" />
              </span>
            </span>
            <Icon name={o.icon} className="ic occ-art" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------- Trending ----------
export function Trending({ tiles }: { tiles: TrendingTile[] }) {
  if (!tiles.length) return null;
  return (
    <section className="wrap block" aria-labelledby="trending-title">
      <div className="block-head">
        <h2 id="trending-title">Trending this week</h2>
        <p className="block-note">The services Kampala keeps coming back for.</p>
      </div>
      <ul className="trend-grid">
        {tiles.map(t => (
          <li key={t.term}>
            <Link className="ttile" href={searchHref({ q: t.term })}>
              <span
                className="sw"
                aria-hidden="true"
                style={{ background: `radial-gradient(90% 90% at 80% 10%, ${t.palette[2]} 0, transparent 60%), ${t.palette[1]}` }}
              />
              <span className="ttile-text">
                <b>{t.term}</b>
                <small>from {ugx(t.from)}</small>
                <small>{venuesLabel(t.venueCount)}</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Trust ----------
export function Trust() {
  const words = trust.title.trim().split(" ");
  const last = words.pop() ?? "";
  const [jac, ink] = trust.stats;
  return (
    <section className="wrap block trust-block" aria-labelledby="trust-title">
      <div className="block-head">
        <h2 id="trust-title">
          {words.join(" ")} <em className="em">{last}</em>
        </h2>
        <p className="block-note">{trust.note}</p>
      </div>
      <div className="trust-grid">
        {jac && (
          <div className="tcard t-num t-jac">
            <strong>{jac.value}</strong>
            <p>{jac.label}</p>
          </div>
        )}
        {trust.cards.map(c => (
          <div key={c.title} className="tcard">
            <span className="t-ic" aria-hidden="true">
              <Icon name={c.icon} />
            </span>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </div>
        ))}
        {ink && (
          <div className="tcard t-num t-ink">
            <strong>{ink.value}</strong>
            <p>{ink.label}</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- App band, with a phone drawn in CSS ----------
export function AppBand() {
  return (
    <section className="wrap block" id="app" aria-labelledby="app-title">
      <div className="app-band">
        <div className="app-copy">
          <p className="eyebrow">{appBand.eyebrow}</p>
          <h2 id="app-title">{appBand.title}</h2>
          <p>{appBand.body}</p>
          <ul className="store-row" aria-label="App stores">
            <li className="store-chip">
              <b>App Store</b>
              <small>Coming soon</small>
            </li>
            <li className="store-chip">
              <b>Google Play</b>
              <small>Coming soon</small>
            </li>
          </ul>
        </div>
        <div className="app-phone" aria-hidden="true">
          <div className="phone-screen">
            <div className="ph-top">
              <b>{site.shortName}</b>
              <span className="ph-dot" />
            </div>
            <Cover className="ph-cover" palette={["#2b1a4a", "#7b4fd6", "#f6b9a3"]} word="braids" />
            <p className="ph-name">The Braid Republic</p>
            <p className="ph-meta">4.9 ★ · Ntinda</p>
            <div className="ph-appt">
              <span className="ph-day">
                <small>SAT</small>18
              </span>
              <span>
                <b>Knotless braids</b>
                <small>10:00 · with Aisha</small>
              </span>
              <span className="ph-ok">Confirmed</span>
            </div>
            <div className="ph-appt">
              <span className="ph-day">
                <small>WED</small>22
              </span>
              <span>
                <b>Wash &amp; fold</b>
                <small>Pickup 08:00</small>
              </span>
              <span className="ph-ok">Paid</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- FAQ ----------
export function Faq() {
  return (
    <section className="wrap block faq-block" id="faq" aria-labelledby="faq-title">
      <div className="block-head">
        <h2 id="faq-title">Questions people ask</h2>
      </div>
      <div className="faq-list">
        {faq.map(f => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
