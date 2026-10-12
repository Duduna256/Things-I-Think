import "@/styles/booking.css";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { data } from "@/lib/data";
import { ugx } from "@/lib/format";
import { formatInstant } from "@/lib/time";
import type { Area, Booking } from "@/lib/types";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { placeName } from "@/components/VenueCard";
import { paymentPill, splitBookings, statusPill } from "@/components/booking/labels";

export const metadata: Metadata = { title: "My bookings", robots: { index: false } };

function BookingCard({ booking: b, areas, now }: { booking: Booking; areas: Area[]; now: Date }) {
  const status = statusPill(b, now);
  const payment = paymentPill(b);
  const where = b.location === "home" ? "At your place" : placeName(areas.find(a => a.id === b.business.areaId));
  return (
    <li>
      <Link className="bkl-card" href={`/bookings/${b.id}`}>
        <Cover palette={b.business.palette} word={b.business.coverWord} className="bkl-cover" />
        <span className="bkl-main">
          <span className="bkl-venue">{b.business.name}</span>
          <span className="bkl-when">
            <Icon name="cal" />
            {formatInstant(b.startsAt)}
            {where && <span className="bkl-where"> · {where}</span>}
          </span>
          <span className="bkl-services">{b.items.map(i => i.name).join(", ") || "Booking"}</span>
        </span>
        <span className="bkl-side">
          <span className="bkl-total">{ugx(b.total)}</span>
          <span className="bkl-pills">
            <span className={`pill pill-${status.tone}`}>{status.label}</span>
            <span className={`pill pill-${payment.tone}`}>{payment.label}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

export default async function BookingsPage() {
  await requireUser("/bookings");
  const [bookings, areas] = await Promise.all([data.listMyBookings(), data.listAreas()]);
  const now = new Date();
  const { upcoming, past } = splitBookings(bookings, now);

  return (
    <div className="wrap-narrow page bkl">
      <header className="bkl-head">
        <h1 className="page-title">My bookings</h1>
        {bookings.length > 0 && (
          <Link className="btn btn-ghost btn-sm" href="/search">
            Book something new
          </Link>
        )}
      </header>

      {bookings.length === 0 ? (
        <div className="empty">
          <b>No bookings yet</b>
          <p>Your calendar is suspiciously free. Find a braider, a barber or someone to tackle the laundry, and book in under a minute.</p>
          <Link className="btn btn-black" href="/search">
            Find a venue
          </Link>
        </div>
      ) : (
        <>
          <section className="bkl-section" aria-labelledby="bkl-upcoming">
            <h2 id="bkl-upcoming">Upcoming</h2>
            {upcoming.length ? (
              <ul className="bkl-list">
                {upcoming.map(b => (
                  <BookingCard key={b.id} booking={b} areas={areas} now={now} />
                ))}
              </ul>
            ) : (
              <p className="muted">
                Nothing coming up. <Link href="/search">Find something to look forward to</Link>.
              </p>
            )}
          </section>
          {past.length > 0 && (
            <section className="bkl-section" aria-labelledby="bkl-past">
              <h2 id="bkl-past">Past</h2>
              <ul className="bkl-list">
                {past.map(b => (
                  <BookingCard key={b.id} booking={b} areas={areas} now={now} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
