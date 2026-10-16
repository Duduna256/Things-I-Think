import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { features } from "@shared/config/features";
import { site } from "@shared/config/site";
import { data } from "@shared/lib/data";
import { plural, shortName, ugx } from "@shared/lib/format";
import { addDays, formatDate, formatTime, todayLocal, weekdayLong, weekdayOf } from "@shared/lib/time";
import type { Booking } from "@shared/lib/types";
import { Icon } from "@shared/components/Icon";
import { BookingCard } from "@/components/dashboard/BookingCard";
import { Checklist } from "@/components/dashboard/Checklist";
import { DayStrip } from "@/components/dashboard/DayStrip";
import { countUpcoming, dayRange, greeting, holdExpired, isLive, nowIndex, readiness, takings, weekRange } from "@/components/dashboard/logic";
import { getDashboard } from "../_lib/context";

export const metadata: Metadata = { title: "Overview" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const DAY_MS = 86_400_000;

// Read the clock once per request, outside render, so every number on the page agrees.
function clock() {
  const now = new Date();
  const today = todayLocal(now);
  return { now, today, in7Days: new Date(now.getTime() + 7 * DAY_MS).toISOString() };
}

export default async function OverviewPage({ searchParams }: Props) {
  const [{ user, business }, sp] = await Promise.all([getDashboard(), searchParams]);
  const welcome = one(sp.welcome) === "1";
  const { now, today, in7Days } = clock();
  const todayRange = dayRange(today);
  const week = weekRange(today);
  const live: Booking["status"][] = ["confirmed", "pending_payment"];

  const [todays, thisWeek, next7, later, earlier, detail] = await Promise.all([
    data.listBusinessBookings(business.id, todayRange),
    data.listBusinessBookings(business.id, { fromIso: week.fromIso, toIso: week.toIso }),
    data.listBusinessBookings(business.id, { fromIso: now.toISOString(), toIso: in7Days, status: live }),
    data.listBusinessBookings(business.id, { fromIso: todayRange.toIso, toIso: dayRange(addDays(today, 60)).toIso, status: live }),
    data.listBusinessBookings(business.id, { fromIso: dayRange(addDays(today, -14)).fromIso, toIso: todayRange.fromIso, status: ["confirmed"] }),
    business.status === "draft" ? data.getMyBusiness(business.id) : Promise.resolve(null),
  ]);

  const timeline = todays.filter(b => b.status !== "cancelled" && !holdExpired(b, now));
  const dropped = todays.length - timeline.length;
  const comingUp = later.filter(b => isLive(b, now)).slice(0, 5);
  const stillOpen = earlier.slice(0, 5);
  const nowAt = nowIndex(timeline, now);
  const weekday = weekdayOf(today);
  const closedToday = business.closedDays.includes(weekday);
  const textsCustomer = features.smsConfirmations;
  const firstName = user.fullName ? shortName(user.fullName) : null;
  const checklist = detail ? readiness(detail) : null;

  return (
    <>
      <h1 className="page-title dash-title">
        {greeting(now)}, <span className="em">{firstName ?? "boss"}</span>.
      </h1>

      {welcome && (
        <div className="notice notice-ok dash-welcome" role="status">
          <Icon name="sparkle" />
          <p>
            Welcome to {site.shortName}. {business.name} is set up.{" "}
            {business.status === "draft"
              ? features.businessApproval
                ? "Tick off the list below, then send it for a quick review."
                : "Tick off the list below, then send it in."
              : "Here's your day at a glance."}
          </p>
        </div>
      )}

      {checklist && (
        <section className="card dash-section dash-ready" aria-labelledby="ready-h">
          <h2 id="ready-h">Getting ready for customers</h2>
          <p className="muted">
            Customers can&apos;t see {business.name} until {features.businessApproval ? "it's been reviewed" : "you send it in"}. Here&apos;s
            what&apos;s left.
          </p>
          <Checklist items={checklist} />
        </section>
      )}

      <section className="dash-stats" aria-label="This week in numbers">
        <div className="dash-stat">
          <span className="dash-stat-label">Today</span>
          <b className="display">{timeline.length}</b>
          <span className="muted">{timeline.length === 1 ? "booking" : "bookings"}</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-label">Next 7 days</span>
          <b className="display">{countUpcoming(next7, now, in7Days)}</b>
          <span className="muted">still to come</span>
        </div>
        <div className="dash-stat dash-stat-money">
          <span className="dash-stat-label">Takings this week</span>
          <b className="display">{ugx(takings(thisWeek))}</b>
          <span className="muted">
            Completed or paid, {formatDate(week.start)} to {formatDate(week.end)}
          </span>
        </div>
      </section>

      <section className="dash-section" aria-labelledby="today-h">
        <div className="dash-section-head">
          <div>
            <h2 id="today-h">Today, {formatDate(today)}</h2>
            <p className="muted">
              {closedToday ? `You're closed on ${weekdayLong(weekday)}s.` : `Open ${business.opensAt} to ${business.closesAt}.`}
              {dropped > 0 && ` ${plural(dropped, "booking")} cancelled or unpaid.`}
            </p>
          </div>
          <Link className="btn btn-ghost btn-sm" href={`/bookings?date=${today}`}>
            Open the day view
          </Link>
        </div>

        {!closedToday && <DayStrip bookings={timeline} date={today} opensAt={business.opensAt} closesAt={business.closesAt} now={now} />}

        {timeline.length === 0 ? (
          <div className="empty">
            <b>{closedToday ? "A day off. Enjoy it." : "Nothing booked today."}</b>
            <p>
              {business.status === "published"
                ? "A quiet day is a good day to polish your menu or add a new service."
                : "Once you're live, today's bookings show up here."}
            </p>
          </div>
        ) : (
          <ol className="dash-tl">
            {timeline.map((b, i) => (
              <Fragment key={b.id}>
                {i === nowAt && <NowLine now={now} />}
                <li>
                  <BookingCard booking={b} now={now} textsCustomer={textsCustomer} />
                </li>
              </Fragment>
            ))}
            {nowAt === -1 && <NowLine now={now} />}
          </ol>
        )}
      </section>

      {stillOpen.length > 0 && (
        <section className="dash-section" aria-labelledby="open-h">
          <div className="dash-section-head">
            <div>
              <h2 id="open-h">Still open from earlier</h2>
              <p className="muted">Mark these completed or no-shows so your takings add up.</p>
            </div>
          </div>
          <ul className="dash-list">
            {stillOpen.map(b => (
              <li key={b.id}>
                <BookingCard booking={b} now={now} showDate textsCustomer={textsCustomer} />
              </li>
            ))}
          </ul>
          {earlier.length > stillOpen.length && (
            <p className="muted dash-more">
              And {plural(earlier.length - stillOpen.length, "more")}. Find them by date in <Link href="/bookings">Bookings</Link>.
            </p>
          )}
        </section>
      )}

      <section className="dash-section" aria-labelledby="next-h">
        <div className="dash-section-head">
          <h2 id="next-h">Coming up</h2>
          <Link className="link-btn" href={`/bookings?date=${addDays(today, 1)}`}>
            See tomorrow
          </Link>
        </div>
        {comingUp.length === 0 ? (
          <div className="empty">
            <b>Nothing booked after today yet.</b>
            <p>{business.status === "published" ? "New bookings land here the moment they're made." : "Once you're live, new bookings land here."}</p>
          </div>
        ) : (
          <ul className="dash-list">
            {comingUp.map(b => (
              <li key={b.id}>
                <BookingCard booking={b} now={now} showDate textsCustomer={textsCustomer} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function NowLine({ now }: { now: Date }) {
  return (
    <li className="dash-now" aria-hidden="true">
      <span>Now · {formatTime(now)}</span>
    </li>
  );
}
