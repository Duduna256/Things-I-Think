import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { businessBand } from "@/config/content";

// A pretend Saturday in a salon's calendar, hourly rows from 09:00 to 15:00.
// Lengths match the real menu: knotless braids take most of the day.
const COLUMNS: { name: string; appts: { title: string; sub: string; rows: string; tone: string }[] }[] = [
  { name: "Aisha", appts: [{ title: "Knotless braids", sub: "Grace N. · 09:00", rows: "2 / 8", tone: "a-lilac" }] },
  {
    name: "Nana",
    appts: [
      { title: "Locs retwist", sub: "Ivan M. · 09:00", rows: "2 / 5", tone: "a-peach" },
      { title: "Cornrows", sub: "Sarah K. · 12:00", rows: "5 / 7", tone: "a-mint" },
    ],
  },
  {
    name: "Joy",
    appts: [
      { title: "Starter locs", sub: "Brian O. · 09:00", rows: "2 / 6", tone: "a-lilac" },
      { title: "Free slot", sub: "13:00 · Filling fast", rows: "6 / 8", tone: "a-free" },
    ],
  },
];

export function CalendarMock() {
  return (
    <div className="biz-cal" aria-hidden="true">
      <div className="cal-head">
        <b>Saturday</b>
        <span>09:00 – 15:00 · 3 stylists</span>
      </div>
      <div className="cal-grid">
        {COLUMNS.map(col => (
          <div key={col.name} className="cal-col">
            <b>{col.name}</b>
            {col.appts.map(a => (
              <i key={a.title} className={`appt ${a.tone}`} style={{ gridRow: a.rows } as CSSProperties}>
                {a.title}
                <small>{a.sub}</small>
              </i>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BusinessTitle({ id }: { id?: string }) {
  return (
    <h2 id={id}>
      {businessBand.titleStart} <em>{businessBand.titleEm}</em> {businessBand.titleEnd}
    </h2>
  );
}

export function BusinessPoints() {
  return (
    <ul className="biz-list">
      {businessBand.points.map(p => (
        <li key={p}>
          <Icon name="check" />
          {p}
        </li>
      ))}
    </ul>
  );
}

// The dark "Run your salon, not your WhatsApp." band.
export function BusinessBand({ showMoreLink = true }: { showMoreLink?: boolean }) {
  return (
    <section className="wrap block" id="business" aria-labelledby="business-title">
      <div className="biz-band">
        <div className="biz-copy">
          <p className="eyebrow">{businessBand.eyebrow}</p>
          <BusinessTitle id="business-title" />
          <BusinessPoints />
          <div className="biz-cta">
            <Link className="btn btn-white" href="/business/onboarding">
              {businessBand.cta}
            </Link>
            {showMoreLink && (
              <Link className="biz-more" href="/for-business">
                How it works
              </Link>
            )}
            <span>{businessBand.small}</span>
          </div>
        </div>
        <CalendarMock />
      </div>
    </section>
  );
}
