import type { Metadata } from "next";
import Link from "next/link";
import { features } from "@shared/config/features";
import { data } from "@shared/lib/data";
import { plural, ugx } from "@shared/lib/format";
import { addDays, formatDate, todayLocal, weekdayLong, weekdayOf } from "@shared/lib/time";
import { Icon } from "@shared/components/Icon";
import { BookingCard } from "@/components/dashboard/BookingCard";
import { dayRange, isTaking, parseDateParam, parseStatusFilter, STATUS_FILTERS } from "@/components/dashboard/logic";
import { getDashboard } from "../../_lib/context";

export const metadata: Metadata = { title: "Bookings" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function clock() {
  const now = new Date();
  return { now, today: todayLocal(now) };
}

export default async function BookingsPage({ searchParams }: Props) {
  const [{ business }, sp] = await Promise.all([getDashboard(), searchParams]);
  const { now, today } = clock();
  const date = parseDateParam(one(sp.date), today);
  const filter = parseStatusFilter(one(sp.status));
  const list = await data.listBusinessBookings(business.id, { ...dayRange(date), status: filter.statuses.length ? filter.statuses : undefined });

  const href = (d: string, status = filter.key) => {
    const q = new URLSearchParams();
    if (d !== today) q.set("date", d);
    if (status !== "all") q.set("status", status);
    const s = q.toString();
    return s ? `/bookings?${s}` : "/bookings";
  };
  const weekday = weekdayOf(date);
  const closed = business.closedDays.includes(weekday);
  const label = date === today ? "Today" : date === addDays(today, 1) ? "Tomorrow" : date === addDays(today, -1) ? "Yesterday" : null;
  const earned = list.filter(isTaking).reduce((sum, b) => sum + b.total, 0);
  const textsCustomer = features.smsConfirmations;

  return (
    <>
      <h1 className="page-title dash-title">
        Bookings, <span className="em">sorted</span>.
      </h1>

      <div className="dash-day">
        <div className="dash-day-nav">
          <Link className="icon-btn" href={href(addDays(date, -1))} aria-label={`Previous day, ${formatDate(addDays(date, -1))}`}>
            <Icon name="left" />
          </Link>
          <h2 className="dash-day-label" aria-live="polite">
            {label && <span className="dash-day-rel">{label}</span>}
            {formatDate(date)}
          </h2>
          <Link className="icon-btn" href={href(addDays(date, 1))} aria-label={`Next day, ${formatDate(addDays(date, 1))}`}>
            <Icon name="right" />
          </Link>
        </div>
        <form className="dash-day-form" action="/bookings" method="get">
          <label className="field">
            <span>Go to a date</span>
            <input type="date" name="date" defaultValue={date} required />
          </label>
          {filter.key !== "all" && <input type="hidden" name="status" value={filter.key} />}
          <button type="submit" className="btn btn-black btn-sm">
            Show day
          </button>
          {date !== today && (
            <Link className="link-btn" href={href(today)}>
              Back to today
            </Link>
          )}
        </form>
      </div>

      <nav aria-label="Filter by status">
        <ul className="chips dash-tabs dash-filter">
          {STATUS_FILTERS.map(f => (
            <li key={f.key}>
              <Link className="chip" href={href(date, f.key)} aria-current={f.key === filter.key ? "page" : undefined}>
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="muted dash-summary">
        {plural(list.length, "booking")}
        {filter.key !== "all" ? ` (${filter.label.toLowerCase()})` : ""}
        {earned > 0 && ` · ${ugx(earned)} completed or paid`}
        {closed && ` · You're closed on ${weekdayLong(weekday)}s`}
      </p>

      {list.length === 0 ? (
        <div className="empty">
          <b>{filter.key === "all" ? `Nothing booked for ${formatDate(date)}.` : `No ${filter.label.toLowerCase()} bookings on ${formatDate(date)}.`}</b>
          <p>
            {filter.key !== "all" ? (
              <Link href={href(date, "all")}>Show every booking that day</Link>
            ) : closed ? (
              "You're closed that day, so customers can't book it."
            ) : date < today ? (
              "Nothing to tidy up here."
            ) : (
              "Bookings appear here the moment a customer makes one."
            )}
          </p>
        </div>
      ) : (
        <ul className="dash-list">
          {list.map(b => (
            <li key={b.id}>
              <BookingCard booking={b} now={now} textsCustomer={textsCustomer} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
