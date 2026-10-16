// The steps of the booking flow and its summary. Only BookingFlow (a client component) uses these.

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PriceBreakdown } from "@/lib/booking/rules";
import { duration, durationLabel, initials, shortName, ugx } from "@/lib/format";
import { formatDate, formatMonth, hhmm, weekdayLong, weekdayOf, weekdayShort } from "@/lib/time";
import type { BookingLocation, Service } from "@/lib/types";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { Rating } from "@/components/Rating";
import { avatarColours } from "./colour";
import type { ServiceGroup } from "./flow-state";
import type { AvailabilityResponse, AvailabilitySlot, ChosenSlot, FlowBusiness } from "./types";

export type Staffer = { id: string; name: string; role: string; rating: number };
type HeadingRef = RefObject<HTMLHeadingElement | null>;

export const dayId = (date: string) => `bk-day-${date}`;

function longDate(date: string): string {
  return `${weekdayLong(weekdayOf(date))} ${Number(date.slice(8))} ${formatMonth(date).split(" ")[0]}`;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ---------------- Services ---------------- */

function MenuTabs({ groups }: { groups: ServiceGroup[] }) {
  const [active, setActive] = useState(0);
  const nav = useRef<HTMLElement>(null);

  // Highlight the section being read, as the page scrolls.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = groups.map((_, i) => document.getElementById(`bk-g-${i}`)).filter((el): el is HTMLElement => !!el);
    const seen = new Map<Element, boolean>();
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) seen.set(e.target, e.isIntersecting);
        const first = sections.findIndex(el => seen.get(el));
        if (first >= 0) setActive(first);
      },
      { rootMargin: "-170px 0px -45% 0px" },
    );
    sections.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [groups]);

  // Keep the highlighted tab in view when the row scrolls sideways (phones).
  useEffect(() => {
    const row = nav.current;
    const tab = row?.querySelectorAll<HTMLElement>("a")[active];
    if (row && tab && row.scrollWidth > row.clientWidth) row.scrollTo({ left: Math.max(0, tab.offsetLeft - 16), behavior: "auto" });
  }, [active]);

  const jump = (i: number) => {
    setActive(i);
    document.getElementById(`bk-g-${i}`)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    document.getElementById(`bk-gh-${i}`)?.focus({ preventScroll: true });
  };

  return (
    <nav className="bk-tabs" aria-label="Menu sections" ref={nav}>
      {groups.map((g, i) => (
        <a
          key={g.name}
          href={`#bk-g-${i}`}
          className="chip"
          aria-current={active === i ? "true" : undefined}
          onClick={e => {
            e.preventDefault();
            jump(i);
          }}
        >
          {g.name}
        </a>
      ))}
    </nav>
  );
}

export function ServicesStep({
  headingRef,
  ...props
}: {
  headingRef: HeadingRef;
  business: FlowBusiness;
  categoryName: string;
  areaName: string;
  openToday: string;
  groups: ServiceGroup[];
  serviceIds: string[];
  onToggle: (id: string) => void;
  allowHome: boolean;
  location: BookingLocation;
  onLocation: (loc: BookingLocation) => void;
  isLaundry: boolean;
}) {
  const { business: b, groups, serviceIds } = props;
  return (
    <>
      <div className="bk-venue-head">
        {props.categoryName && <p className="eyebrow">{props.categoryName}</p>}
        <h1 className="bk-h1" ref={headingRef} tabIndex={-1}>
          {b.name}
        </h1>
        <div className="bk-meta">
          <Rating value={b.ratingAvg} count={b.ratingCount} />
          {props.areaName && <span>{props.areaName}</span>}
          <span>{props.openToday}</span>
        </div>
        {b.blurb && <p className="bk-blurb">{b.blurb}</p>}
      </div>

      {props.allowHome && (
        <div className="bk-where">
          <div className="bk-seg" role="group" aria-label="Where should it happen?">
            <button type="button" aria-pressed={props.location === "venue"} onClick={() => props.onLocation("venue")}>
              <Icon name="store" />
              At the venue
            </button>
            <button type="button" aria-pressed={props.location === "home"} onClick={() => props.onLocation("home")}>
              <Icon name="home" />
              At my place <small>{b.homeVisitFee > 0 ? `+${ugx(b.homeVisitFee)}` : "no travel fee"}</small>
            </button>
          </div>
          <p className="bk-toggle-note">
            {props.location === "home"
              ? "They bring the tools. You provide the chair."
              : b.address
                ? `${b.address}${props.areaName ? `, ${props.areaName}` : ""}.`
                : `${props.areaName || b.name}.`}
          </p>
        </div>
      )}
      {b.visitMode === "mobile" && (
        <p className="bk-mobile-note">
          <Icon name="home" />
          {props.isLaundry ? "Free pickup and delivery to your door." : "They come to you. Travel is included in the price."}
        </p>
      )}

      {groups.length === 0 ? (
        <div className="empty">
          <b>Nothing on the menu yet</b>
          <p>{b.name} hasn&apos;t added any services. Check back soon, or find another venue.</p>
        </div>
      ) : (
        <>
          {groups.length > 1 && <MenuTabs groups={groups} />}
          {groups.map((g, i) => (
            <section key={g.name} className="bk-group" id={`bk-g-${i}`} aria-labelledby={`bk-gh-${i}`}>
              <h2 id={`bk-gh-${i}`} tabIndex={-1}>
                {g.name}
              </h2>
              <ul className="bk-svcs">
                {g.services.map(s => {
                  const on = serviceIds.includes(s.id);
                  return (
                    <li key={s.id}>
                      <button type="button" className="bk-svc" aria-pressed={on} onClick={() => props.onToggle(s.id)}>
                        <span className="bk-svc-text">
                          <b>{s.name}</b>
                          <span className="bk-dur">{durationLabel(s)}</span>
                          {s.description && <span className="bk-desc">{s.description}</span>}
                          <span className="bk-price">{ugx(s.price)}</span>
                        </span>
                        <span className="bk-svc-add" aria-hidden="true">
                          <Icon name={on ? "check" : "plus"} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </>
  );
}

/* ---------------- Professional ---------------- */

export function ProStep({
  headingRef,
  ...props
}: {
  headingRef: HeadingRef;
  staff: Staffer[];
  palette: [string, string, string];
  staffId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <>
      <h1 className="bk-h1" ref={headingRef} tabIndex={-1}>
        Pick a professional
      </h1>
      <p className="bk-step-note">Pick someone, or let us choose whoever&apos;s free.</p>
      <div className="bk-pros" role="group" aria-label="Professionals">
        <button type="button" className="bk-pro bk-pro-any" aria-pressed={props.staffId === "any"} onClick={() => props.onPick("any")}>
          <span className="avatar" aria-hidden="true">
            <Icon name="users" />
          </span>
          <b>Any professional</b>
          <small>Whoever&apos;s free first.</small>
        </button>
        {props.staff.map((p, i) => (
          <button key={p.id} type="button" className="bk-pro" aria-pressed={props.staffId === p.id} onClick={() => props.onPick(p.id)}>
            <span className="avatar" style={avatarColours(props.palette, i)} aria-hidden="true">
              {initials(p.name)}
            </span>
            <b>{p.name}</b>
            {p.role && <small>{p.role}</small>}
            {/* A rating of 0 means nobody has rated them yet. */}
            {p.rating > 0 ? (
              <span className="bk-pro-rating">
                <span aria-hidden="true">{p.rating.toFixed(1)}</span>
                <Icon name="star" />
                <span className="sr-only">Rated {p.rating.toFixed(1)} out of 5</span>
              </span>
            ) : (
              <span className="bk-pro-rating">
                New<span className="sr-only">, not rated yet</span>
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------------- Time ---------------- */

export type AvailState = { key: string; ok: true; data: AvailabilityResponse } | { key: string; ok: false; error: string };

export function TimeStep({
  headingRef,
  ...props
}: {
  headingRef: HeadingRef;
  business: FlowBusiness;
  isLaundry: boolean;
  dates: string[];
  date: string;
  slot: ChosenSlot | null;
  pro: Staffer | null;
  price: PriceBreakdown;
  cutoff: { name: string; minutes: number } | null;
  notice: string | null;
  avail: AvailState | null; // null while loading
  onPickDate: (date: string) => void;
  onPickSlot: (slot: AvailabilitySlot) => void;
  onJump: (date: string) => void;
  onRetry: () => void;
  onAnyPro: () => void;
  onEditServices: () => void;
}) {
  const { business: b, date, avail, pro, isLaundry } = props;
  const start = isLaundry ? "pickup" : "start";

  // Keep the chosen day in view in the strip (after a jump, or coming back from log-in).
  useEffect(() => {
    const day = document.getElementById(dayId(date));
    const row = day?.parentElement;
    if (!day || !row || row.scrollWidth <= row.clientWidth) return;
    const r = row.getBoundingClientRect();
    const d = day.getBoundingClientRect();
    if (d.left < r.left || d.right > r.right) row.scrollBy({ left: d.left - r.left - (r.width - d.width) / 2, behavior: "auto" });
  }, [date]);

  let body;
  if (!avail) {
    body = (
      <>
        <p className="sr-only" role="status">
          Finding free times…
        </p>
        <div className="bk-slots bk-slots-loading" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="bk-slot" />
          ))}
        </div>
      </>
    );
  } else if (!avail.ok) {
    body = (
      <div className="notice notice-err" role="alert">
        <Icon name="alert" />
        <span>
          We couldn&apos;t load the times. {avail.error}{" "}
          <button type="button" className="link-btn" onClick={props.onRetry}>
            Try again
          </button>
        </span>
      </div>
    );
  } else if (avail.data.kind === "ok") {
    body = (
      <div className="bk-slots" role="group" aria-label={`Free times on ${formatDate(date)}`}>
        {avail.data.slots.map(s => (
          <button
            key={s.startsAt}
            type="button"
            className="bk-slot"
            aria-pressed={props.slot?.startsAt === s.startsAt}
            onClick={() => props.onPickSlot(s)}
          >
            {s.time}
          </button>
        ))}
      </div>
    );
  } else {
    const { kind, nextAvailable } = avail.data;
    let title: string;
    let text: string;
    if (kind === "too_long") {
      title = "That's a marathon, not an appointment.";
      text = `Your selection takes ${duration(props.price.durationMin)}, longer than ${b.name} is open in a day. Remove a service and book it as a second visit.`;
    } else if (kind === "closed") {
      title = `Closed on ${weekdayLong(weekdayOf(date))}s.`;
      text = `${b.name} takes that day off.`;
    } else if (kind === "too_late") {
      title = "That's a wrap for today.";
      text = `The last ${start} time has passed.`;
    } else {
      title = "Fully booked. Popular for a reason.";
      text = `Nothing left on ${formatDate(date)}${pro ? ` with ${shortName(pro.name)}` : ""}.`;
    }
    body = (
      <div className="empty bk-empty-times">
        <b>{title}</b>
        <p>
          {text}
          {kind !== "too_long" && nextAvailable && ` The next free day is ${formatDate(nextAvailable)}.`}
          {kind !== "too_long" && !nextAvailable && ` Nothing's free in the next ${props.dates.length} days either.`}
        </p>
        {kind === "too_long" ? (
          <button type="button" className="btn btn-ghost" onClick={props.onEditServices}>
            Change services
          </button>
        ) : nextAvailable ? (
          <button type="button" className="btn btn-ghost" onClick={() => props.onJump(nextAvailable)}>
            Jump to the next free day
          </button>
        ) : pro ? (
          <button type="button" className="btn btn-ghost" onClick={props.onAnyPro}>
            Try any professional
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <h1 className="bk-h1" ref={headingRef} tabIndex={-1}>
        {isLaundry ? "Pick a pickup time" : "Pick a time"}
      </h1>
      {props.notice && (
        <p className="notice notice-warn" role="alert">
          <Icon name="alert" />
          <span>{props.notice}</span>
        </p>
      )}
      {(pro || props.cutoff) && (
        <div className="bk-step-notes">
          {pro && <p className="bk-step-note">Showing times for {pro.name}.</p>}
          {props.cutoff && (
            <p className="bk-step-note">
              <Icon name="clock" />
              Last {start} for {props.cutoff.name} is {hhmm(props.cutoff.minutes)}, so later times are hidden.
            </p>
          )}
        </div>
      )}
      <div className="bk-when">
        <p className="bk-month">{formatMonth(date)}</p>
        <div className="bk-days" role="group" aria-label="Pick a day">
          {props.dates.map(d => {
            const closed = b.closedDays.includes(weekdayOf(d));
            return (
              <button
                key={d}
                id={dayId(d)}
                type="button"
                className="bk-day"
                aria-pressed={d === date}
                aria-label={`${longDate(d)}${closed ? ", closed" : ""}`}
                disabled={closed}
                onClick={() => props.onPickDate(d)}
              >
                <span className="bk-day-num" aria-hidden="true">
                  {Number(d.slice(8))}
                </span>
                <span className="bk-day-wd" aria-hidden="true">
                  {closed ? "Closed" : weekdayShort(weekdayOf(d))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="bk-times">{body}</div>
    </>
  );
}

/* ---------------- Summary ---------------- */

export function SummaryDetails(props: {
  business: FlowBusiness;
  areaName: string;
  chosen: Service[];
  price: PriceBreakdown;
  location: BookingLocation;
  isLaundry: boolean;
  who: string | null;
  when: string | null;
  emptyText: string;
}) {
  const { business: b, chosen, price } = props;
  return (
    <>
      <div className="bk-sum-venue">
        <Cover palette={b.palette} word={b.coverWord} imageUrl={b.imageUrl} />
        <span>
          <b>{b.name}</b>
          <small>
            <Rating value={b.ratingAvg} count={b.ratingCount} />
            {props.areaName && <span>{props.areaName}</span>}
          </small>
        </span>
      </div>
      {chosen.length ? (
        <ul className="bk-sum-lines">
          {chosen.map(s => (
            <li key={s.id} className="bk-sum-line">
              <span>
                {s.name}
                <small>{durationLabel(s)}</small>
              </span>
              <span className="bk-amt">{ugx(s.price)}</span>
            </li>
          ))}
          {price.homeFee > 0 && (
            <li className="bk-sum-line">
              <span>
                Home visit
                <small>Travel to your place</small>
              </span>
              <span className="bk-amt">{ugx(price.homeFee)}</span>
            </li>
          )}
        </ul>
      ) : (
        <p className="bk-sum-empty">{props.emptyText}</p>
      )}
      {chosen.length > 0 && (
        <ul className="bk-sum-meta">
          <li>
            <Icon name={props.location === "home" ? "home" : "pin"} />
            <span>
              {props.location === "home"
                ? props.isLaundry
                  ? "Pickup from your place"
                  : "At your place"
                : [b.name, props.areaName].filter(Boolean).join(", ")}
            </span>
          </li>
          {props.who && (
            <li>
              <Icon name="user" />
              <span>{props.who}</span>
            </li>
          )}
          {props.when && (
            <li>
              <Icon name="cal" />
              <span>{props.when}</span>
            </li>
          )}
        </ul>
      )}
      <div className="bk-sum-total">
        <span>Total</span>
        <span>{chosen.length ? ugx(price.total) : "Free (for now)"}</span>
      </div>
    </>
  );
}
