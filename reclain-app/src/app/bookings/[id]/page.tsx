import "@/styles/booking.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { features } from "@/config/features";
import { site } from "@/config/site";
import { requireUser } from "@/lib/auth";
import { data, isDataError } from "@/lib/data";
import { duration, ugx } from "@/lib/format";
import { prettyMsisdn } from "@/lib/phone";
import { formatInstant, formatTime } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { placeName } from "@/components/VenueCard";
import { CancelBooking, PayNowButton, ReviewForm } from "@/components/booking/BookingActions";
import {
  bannerFor,
  canCancel,
  canPayAgain,
  canReview,
  insideCancellationFee,
  METHOD_LABEL,
  paymentPill,
  paymentStatusPill,
  statusPill,
  type Banner,
} from "@/components/booking/labels";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const flag = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) === "1";

async function loadBooking(id: string): Promise<Booking | null> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return null;
  try {
    return await data.getBooking(id);
  } catch (e) {
    // A malformed id is refused by the database; treat it like any booking that isn't yours.
    if (isDataError(e)) return null;
    throw e;
  }
}

function BannerBox({ banner, booking: b, checkHref }: { banner: Banner; booking: Booking; checkHref: string }) {
  const method = METHOD_LABEL[b.paymentMethod];
  switch (banner) {
    case "booked":
      return (
        <div className="bkd-banner bkd-done" role="status">
          <span className="bkd-tick" aria-hidden="true">
            <Icon name="check" />
          </span>
          <div>
            <p className="bkd-banner-title">You&apos;re booked.</p>
            <p>Your future self says thank you. We&apos;ll text the details to {prettyMsisdn(b.customerPhone)}.</p>
          </div>
        </div>
      );
    case "paid":
      return (
        <div className="bkd-banner bkd-done" role="status">
          <span className="bkd-tick" aria-hidden="true">
            <Icon name="check" />
          </span>
          <div>
            <p className="bkd-banner-title">Paid and booked.</p>
            <p>
              {site.shortName} holds the {ugx(b.total)} until your service is done. We&apos;ll text the details to{" "}
              {prettyMsisdn(b.customerPhone)}.
            </p>
          </div>
        </div>
      );
    case "pending_momo":
    case "pending_card":
      return (
        <div className="bkd-banner notice-info" role="status">
          <Icon name="clock" />
          <div>
            <p className="bkd-banner-title">
              {banner === "pending_momo" ? "Almost booked: approve the prompt on your phone" : "Almost booked: finish paying by card"}
            </p>
            <p>
              {banner === "pending_momo"
                ? `Look out for an ${method} prompt of ${ugx(b.total)} and enter your PIN.`
                : `Pay ${ugx(b.total)} on the secure checkout page to lock in your slot.`}
              {b.expiresAt && ` We're holding your slot until ${formatTime(b.expiresAt)}.`}
            </p>
            <div className="bkd-banner-actions">
              {/* A plain link on purpose: it asks the payment provider, then comes back here. */}
              <a className="btn btn-ghost btn-sm" href={checkHref}>
                Check again
              </a>
              <PayNowButton bookingId={b.id} />
            </div>
          </div>
        </div>
      );
    case "failed":
      return (
        <div className="bkd-banner notice-err" role="alert">
          <Icon name="alert" />
          <div>
            <p className="bkd-banner-title">That payment didn&apos;t go through.</p>
            <p>
              Nothing was taken. Your slot is still held{b.expiresAt ? ` until ${formatTime(b.expiresAt)}` : ""}, so try again
              with {method}.
            </p>
            <div className="bkd-banner-actions">
              <PayNowButton bookingId={b.id} />
            </div>
          </div>
        </div>
      );
    case "checking":
      return (
        <div className="bkd-banner notice-info" role="status">
          <Icon name="clock" />
          <div>
            <p className="bkd-banner-title">We&apos;re still checking your payment.</p>
            <p>
              Your slot hold ran out while we waited to hear from {method}. If the money went through, we&apos;ll confirm your
              booking, or refund you if the slot has gone. Please don&apos;t book or pay again yet.
            </p>
            <div className="bkd-banner-actions">
              <a className="btn btn-ghost btn-sm" href={checkHref}>
                Check again
              </a>
            </div>
          </div>
        </div>
      );
    case "expired":
      return (
        <div className="bkd-banner notice-warn" role="status">
          <Icon name="clock" />
          <div>
            <p className="bkd-banner-title">This hold has run out.</p>
            <p>We held the slot for {site.pendingPaymentMinutes} minutes, but the payment didn&apos;t come through. Book again to pick a new time.</p>
          </div>
        </div>
      );
    case "paid_late":
      return (
        <div className="bkd-banner notice-warn" role="status">
          <Icon name="alert" />
          <div>
            <p className="bkd-banner-title">Your payment arrived after the slot was released.</p>
            <p>
              We&apos;ve recorded it for a refund and the {site.shortName} team will be in touch. Questions? Email {site.email}.
            </p>
          </div>
        </div>
      );
    case "review":
      return (
        <div className="bkd-banner notice-warn" role="status">
          <Icon name="alert" />
          <div>
            <p className="bkd-banner-title">We&apos;re double-checking that payment.</p>
            <p>
              Something about it didn&apos;t add up, so a person will look at it before your booking is confirmed. If money left
              your account, we&apos;ll sort it out. Please don&apos;t pay again for now. Questions? Email {site.email}.
            </p>
          </div>
        </div>
      );
    case "cancelled":
      return (
        <div className="bkd-banner notice-ok" role="status">
          <Icon name="check" />
          <div>
            <p className="bkd-banner-title">Booking cancelled.</p>
            <p>We&apos;ve let {b.business.name} know. Fancy another time?</p>
          </div>
        </div>
      );
    case "reviewed":
      return (
        <div className="bkd-banner notice-ok" role="status">
          <Icon name="check" />
          <div>
            <p className="bkd-banner-title">Thanks for the review.</p>
            <p>It&apos;s live on {b.business.name}&apos;s page. The team will be pleased (or will know what to fix).</p>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default async function BookingPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/bookings/${encodeURIComponent(id)}`);
  const booking = await loadBooking(id);
  // Venue owners can read their customers' bookings, but this page is the customer's own.
  if (!booking || booking.customerId !== user.id) notFound();
  const b = booking;

  const areas = await data.listAreas();
  const now = new Date();
  const banner = bannerFor(
    b,
    { isNew: flag(query.new), paid: flag(query.paid), failed: flag(query.failed), cancelled: flag(query.cancelled), reviewed: flag(query.reviewed), review: flag(query.review) },
    now,
  );
  const status = statusPill(b, now);
  const payment = paymentPill(b);
  const paymentState = paymentStatusPill(b);
  const area = placeName(areas.find(a => a.id === b.business.areaId));
  const minutes = b.items.reduce((s, i) => s + i.durationMin, 0);
  const where =
    b.location === "home" ? b.address || "Your place" : [b.business.name, b.business.address, area].filter(Boolean).join(", ");
  const bookAgain = `/book/${b.business.slug}${
    b.items.some(i => i.serviceId) ? `?services=${encodeURIComponent(b.items.flatMap(i => (i.serviceId ? [i.serviceId] : [])).join(","))}` : ""
  }`;
  // "Check again" asks the provider about the latest open payment (the webhook may be slow or,
  // in local development, not set up at all), then comes back here.
  const openPayment =
    banner === "pending_momo" || banner === "pending_card" || banner === "checking"
      ? (await data.server.listPaymentsForBooking(b.id)).find(p => p.status === "pending")
      : undefined;
  const checkHref = openPayment ? `/api/payments/return?tx_ref=${encodeURIComponent(openPayment.txRef)}` : `/bookings/${b.id}`;
  const showPay = canPayAgain(b, now) && banner !== "pending_momo" && banner !== "pending_card" && banner !== "failed" && banner !== "review";
  const cancellable = canCancel(b, now);
  const hours = site.freeCancellationHours;

  return (
    <div className="wrap-narrow page bkd">
      <Link className="bkd-back" href="/bookings">
        <Icon name="left" />
        My bookings
      </Link>

      <BannerBox banner={banner} booking={b} checkHref={checkHref} />

      <header className="bkd-head">
        <Cover palette={b.business.palette} word={b.business.coverWord} className="bkd-cover" />
        <div className="bkd-head-text">
          <p className="eyebrow">Booking {b.ref}</p>
          <h1 className="page-title">{b.business.name}</h1>
          <p className="bkd-when">{formatInstant(b.startsAt)}</p>
          <div className="bkl-pills">
            <span className={`pill pill-${status.tone}`}>{status.label}</span>
            <span className={`pill pill-${payment.tone}`}>{payment.label}</span>
          </div>
        </div>
      </header>

      <section className="card bkd-card" aria-labelledby="bkd-details">
        <h2 id="bkd-details">Details</h2>
        <dl className="bkd-rows">
          <div className="bkd-row">
            <dt>Reference</dt>
            <dd>{b.ref}</dd>
          </div>
          <div className="bkd-row">
            <dt>Venue</dt>
            <dd>
              <Link href={`/v/${b.business.slug}`}>{b.business.name}</Link>
              {area && <span className="muted">, {area}</span>}
            </dd>
          </div>
          <div className="bkd-row">
            <dt>When</dt>
            <dd>
              {formatInstant(b.startsAt)}–{formatTime(b.endsAt)}
              {minutes > 0 && <span className="muted"> ({duration(minutes)})</span>}
            </dd>
          </div>
          <div className="bkd-row">
            <dt>Professional</dt>
            <dd>{b.staffName ?? "Whoever's free first"}</dd>
          </div>
          <div className="bkd-row">
            <dt>Where</dt>
            <dd>
              {b.location === "home" && <span className="muted">At your place: </span>}
              {where}
            </dd>
          </div>
          {b.notes && (
            <div className="bkd-row">
              <dt>Your notes</dt>
              <dd className="bkd-notes">{b.notes}</dd>
            </div>
          )}
          <div className="bkd-row">
            <dt>Payment</dt>
            <dd>
              {b.paymentMethod === "cash" ? "Cash" : METHOD_LABEL[b.paymentMethod]}{" "}
              <span className={`pill pill-${paymentState.tone}`}>{paymentState.label}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="card bkd-card" aria-labelledby="bkd-price">
        <h2 id="bkd-price">What you&apos;re paying for</h2>
        <ul className="bkd-items">
          {b.items.map(i => (
            <li key={i.id}>
              <span>
                {i.name}
                {i.durationMin > 0 && <small>{duration(i.durationMin)}</small>}
              </span>
              <span className="bkd-amt">{ugx(i.price)}</span>
            </li>
          ))}
          {b.homeFee > 0 && (
            <li>
              <span>
                Home visit
                <small>Travel to your place</small>
              </span>
              <span className="bkd-amt">{ugx(b.homeFee)}</span>
            </li>
          )}
        </ul>
        <div className="bkd-total">
          <span>Total</span>
          <span>{ugx(b.total)}</span>
        </div>
      </section>

      <div className="bkd-actions">
        {showPay && <PayNowButton bookingId={b.id} />}
        {/* Not while a payment is still being checked: it could be paid twice. */}
        {banner !== "checking" && (
          <Link className="btn btn-black" href={bookAgain}>
            Book again
          </Link>
        )}
        {cancellable && (
          <CancelBooking
            bookingId={b.id}
            policy={`Cancelling is free up to ${hours} hours before your appointment. After that the venue may keep a small fee, because they turned someone else away for you.`}
            lateWarning={
              insideCancellationFee(b, now, hours)
                ? `Your appointment is less than ${hours} hours away, so ${b.business.name} may keep a small fee.`
                : null
            }
          />
        )}
      </div>

      {canReview(b, features.reviews) && <ReviewForm bookingId={b.id} venueName={b.business.name} />}
    </div>
  );
}
