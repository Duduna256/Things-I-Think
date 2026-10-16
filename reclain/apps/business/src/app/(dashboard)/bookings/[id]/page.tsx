import "@/styles/jobs.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { data, isDataError } from "@shared/lib/data";
import { duration, shortName, ugx } from "@shared/lib/format";
import { allowedJobActions, hasCheckedIn, hasCheckedOut, joinNames, shouldNudgeCompletion } from "@shared/lib/jobs/rules";
import { internationalMsisdn, prettyMsisdn } from "@shared/lib/phone";
import { formatDate, formatTime, localParts } from "@shared/lib/time";
import type { Booking, JobEvent } from "@shared/lib/types";
import { Icon } from "@shared/components/Icon";
import { PillTag } from "@/components/dashboard/BookingCard";
import { paymentPill, statusPill } from "@/components/dashboard/logic";
import { JobActions } from "@/components/jobs/JobActions";
import { JobTimeline } from "@/components/jobs/JobTimeline";
import { getDashboardDetail } from "../../../_lib/context";

export const metadata: Metadata = { title: "Job log" };

type Props = { params: Promise<{ id: string }> };

async function loadBooking(id: string): Promise<Booking | null> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return null;
  try {
    return await data.getBooking(id);
  } catch (e) {
    // A malformed id is refused by the database; treat it like any booking that isn't here.
    if (isDataError(e)) return null;
    throw e;
  }
}

// What the log is waiting for, in one line under the heading.
function stateLine(b: Booking, events: JobEvent[], allowed: ReturnType<typeof allowedJobActions>): string {
  if (b.status === "cancelled") return "This booking was cancelled, so its job log is closed.";
  if (b.status === "no_show") return "This booking was a no-show, so its job log is closed.";
  if (b.status === "pending_payment") return "The job log opens once the booking is confirmed.";
  if (hasCheckedOut(events)) return b.status === "completed" ? "Checked in and out. This record can't be changed." : "Checked out. Mark the booking completed when you're done.";
  if (hasCheckedIn(events)) return "You're checked in. Add photos and notes as you go, then check out when you leave.";
  if (b.status === "completed") return "This booking is completed. You can still add a late check-in, photos and notes for the record.";
  if (!allowed.check_in) return `Check in on the day of the booking (${formatDate(localParts(b.startsAt).date)}). You can add photos and notes before then.`;
  return "Check in when you arrive. Your phone's location is recorded with it, so the record stands up if there's ever a question.";
}

export default async function JobPage({ params }: Props) {
  const [{ detail }, { id }] = await Promise.all([getDashboardDetail(), params]);
  const booking = await loadBooking(id);
  if (!booking || booking.businessId !== detail.id) notFound();
  const b = booking;
  const events = await data.jobs.listJobEvents(b.id);
  const now = new Date();
  const allowed = allowedJobActions(b, events, now);
  const date = localParts(b.startsAt).date;
  const name = b.customerName.trim();
  const first = name ? shortName(name) : "the customer";
  const mins = b.items.reduce((sum, i) => sum + i.durationMin, 0);
  const staffNames = Object.fromEntries(detail.staff.map(s => [s.id, s.name]));
  const team = [b.staffName, ...b.crewNames].filter((n): n is string => !!n);
  const listHref = `/bookings?date=${date}`;

  return (
    <>
      <p className="job-back">
        <Link href={listHref}>
          <Icon name="left" />
          Bookings on {formatDate(date)}
        </Link>
      </p>
      <h1 className="page-title dash-title">
        {first}&apos;s <span className="em">job</span>
      </h1>
      <p className="dash-lede muted">{stateLine(b, events, allowed)}</p>

      <section className="card job-summary" aria-labelledby="job-booking">
        <h2 id="job-booking" className="sr-only">
          Booking {b.ref}
        </h2>
        <dl className="job-rows">
          <div className="job-row">
            <dt>When</dt>
            <dd>
              {formatDate(date)}, {formatTime(b.startsAt)} to {formatTime(b.endsAt)}
              {mins > 0 && <span className="muted"> ({duration(mins)})</span>}
            </dd>
          </div>
          <div className="job-row">
            <dt>Customer</dt>
            <dd>
              {name || "Customer"}
              {/^\d{9}$/.test(b.customerPhone) && (
                <a className="job-tel" href={`tel:${internationalMsisdn(b.customerPhone)}`}>
                  <Icon name="phone" />
                  <span className="sr-only">Call </span>
                  {prettyMsisdn(b.customerPhone)}
                </a>
              )}
            </dd>
          </div>
          <div className="job-row">
            <dt>Services</dt>
            <dd>
              <ul className="dash-bk-items">
                {b.items.map(i => (
                  <li key={i.id}>{i.name}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="job-row">
            <dt>Where</dt>
            <dd>
              <Icon name={b.location === "home" ? "home" : "store"} />
              {b.location === "home" ? <>Home visit: {b.address || "address not given"}</> : "At the venue"}
            </dd>
          </div>
          <div className="job-row">
            <dt>Crew</dt>
            <dd>{team.length ? joinNames(team) : "Whoever's free"}</dd>
          </div>
          {b.notes.trim() && (
            <div className="job-row">
              <dt>Customer&apos;s notes</dt>
              <dd className="dash-bk-notes">{b.notes}</dd>
            </div>
          )}
          <div className="job-row">
            <dt>Status</dt>
            <dd>
              <span className="dash-pills job-pills">
                <PillTag pill={statusPill(b, now)} />
                <PillTag pill={paymentPill(b)} />
                <span className="muted">
                  {ugx(b.total)} · Ref {b.ref}
                </span>
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="dash-section job-log" aria-labelledby="job-log-h">
        <div className="dash-section-head">
          <div>
            <h2 id="job-log-h">Job log</h2>
            <p className="muted">Written once, never edited. {first} can see it on their booking.</p>
          </div>
        </div>
        <JobActions businessId={detail.id} bookingId={b.id} allowed={allowed} />
        {shouldNudgeCompletion(b, events) && (
          <div className="notice notice-ok job-nudge" role="status">
            <Icon name="check" />
            <div>
              <p>Job done? Mark the booking completed so it counts in your takings.</p>
              <Link className="btn btn-black btn-sm" href={listHref}>
                Go to the bookings list
              </Link>
            </div>
          </div>
        )}
        {events.length === 0 ? (
          <div className="empty">
            <b>Nothing in the log yet.</b>
            <p>
              {allowed.check_in
                ? "Check in when you arrive. Photos before and after, and a note or two, make a record you can stand on."
                : allowed.photo
                  ? "Entries appear here as you add them."
                  : "Nothing was recorded for this booking."}
            </p>
          </div>
        ) : (
          <JobTimeline events={events} bookingDate={date} staffNames={staffNames} />
        )}
      </section>
    </>
  );
}
