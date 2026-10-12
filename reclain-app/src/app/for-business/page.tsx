import "@/styles/home.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { BusinessPoints, BusinessTitle, CalendarMock } from "@/components/home/BusinessBand";
import { businessBand } from "@/config/content";
import { features } from "@/config/features";
import { site } from "@/config/site";
import { data } from "@/lib/data";
import type { Category } from "@/lib/types";

export const metadata: Metadata = {
  title: "For business",
  description: `List your business on ${site.shortName}: online bookings, mobile money payouts and fewer no-shows. Free to join, a small commission on completed bookings only.`,
};

const STEPS = [
  {
    title: "Set up in an evening",
    body: features.businessApproval
      ? "Add your menu, prices, team and opening hours. We give your listing a quick check, then it goes live."
      : "Add your menu, prices, team and opening hours. Your page goes live as soon as you're happy with it.",
  },
  {
    title: "Customers book and prepay",
    body: "They pick a time that's actually free and pay by MTN MoMo, Airtel Money or card. You get an SMS for every booking.",
  },
  {
    title: "Do the work, get paid",
    body: "Mark the job done in your dashboard. The money is released to you once the service has happened.",
  },
];

const PERKS = [
  { icon: "money", title: "Free to join", body: "UGX 0 to sign up and no monthly fee. We take a small commission on completed bookings only, so we earn when you do." },
  { icon: "phone", title: "Mobile money payouts", body: "MTN MoMo and Airtel Money payouts every evening. No chasing, no “I'll send it later”." },
  { icon: "check", title: "Fewer no-shows", body: "Prepaid bookings make no-shows think twice. Cash after the service is still there if you want it." },
  { icon: "chat", title: "Reminders that send themselves", body: "Customers get an SMS the night before, so you stop typing “Are we still on?”." },
];

export default async function ForBusinessPage() {
  // The category list is a nice-to-have; the page still works if it can't load.
  const categories = await data.listCategories().catch((): Category[] => []);
  return (
    <div className="fb-page">
      <section className="wrap fb-hero" aria-labelledby="fb-title">
        <p className="eyebrow">{businessBand.eyebrow}</p>
        <h1 id="fb-title">
          {businessBand.titleStart} <em className="em">{businessBand.titleEm}</em> {businessBand.titleEnd}
        </h1>
        <p className="fb-sub">
          Bookings, payments and reminders for salons, barbers, braiders, therapists, cleaners, laundries, repair pros and security firms in{" "}
          {site.city}. One dashboard, no spreadsheets.
        </p>
        <div className="fb-cta">
          <Link className="btn btn-black" href="/business/onboarding">
            {businessBand.cta}
          </Link>
          <a className="btn btn-ghost" href="#how">
            See how it works
          </a>
        </div>
        <p className="fb-small">{businessBand.small}</p>
      </section>

      <section className="wrap block" id="how" aria-labelledby="how-title">
        <div className="block-head">
          <h2 id="how-title">How it works</h2>
          <p className="block-note">Three steps. The first one takes about as long as a cornrow.</p>
        </div>
        <ol className="fb-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="fb-step">
              <span className="fb-num" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="wrap block" aria-labelledby="perks-title">
        <div className="block-head">
          <h2 id="perks-title">What you get</h2>
        </div>
        <ul className="fb-perks">
          {PERKS.map(p => (
            <li key={p.title} className="tcard">
              <span className="t-ic" aria-hidden="true">
                <Icon name={p.icon} />
              </span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap block" aria-labelledby="business-title">
        <div className="biz-band">
          <div className="biz-copy">
            <p className="eyebrow">Your week, on one screen</p>
            <BusinessTitle id="business-title" />
            <BusinessPoints />
          </div>
          <CalendarMock />
        </div>
      </section>

      {categories.length > 0 && (
        <section className="wrap block" aria-labelledby="who-title">
          <div className="block-head">
            <h2 id="who-title">Who it&apos;s for</h2>
            <p className="block-note">If people book you by the hour or the job, there&apos;s a place for you.</p>
          </div>
          <ul className="fb-cats">
            {categories.map(c => (
              <li key={c.id} className="fb-cat">
                <Icon name={c.icon} />
                {c.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="wrap block" aria-labelledby="join-title">
        <div className="fb-final">
          <h2 id="join-title">Ready when you are</h2>
          <p>Set up your page tonight and take your first booking tomorrow.</p>
          <Link className="btn btn-white" href="/business/onboarding">
            {businessBand.cta}
          </Link>
          <small>{businessBand.small}</small>
        </div>
      </section>
    </div>
  );
}
