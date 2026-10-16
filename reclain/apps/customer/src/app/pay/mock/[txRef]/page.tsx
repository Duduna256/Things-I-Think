import "@/styles/pay.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { site } from "@shared/config/site";
import { requireUser } from "@shared/lib/auth";
import { data, isDataError } from "@shared/lib/data";
import { activePaymentProvider } from "@/lib/payments";
import { ugx } from "@shared/lib/format";
import { normalizeMsisdn, prettyMsisdn } from "@shared/lib/phone";
import { formatInstant, formatTime } from "@shared/lib/time";
import type { Booking, Payment } from "@shared/lib/types";
import { Icon } from "@shared/components/Icon";
import { parseTxRef } from "@/app/api/payments/settle";
import { MockPrompt } from "./MockPrompt";
import { headingWord, methodLabel, payeeName, promptQuestion, type PromptMethod } from "./prompt";

export const metadata: Metadata = { title: "Approve your payment", robots: { index: false, follow: false } };

type Props = { params: Promise<{ txRef: string }> };

// The payment, and its booking if it belongs to the person looking.
async function load(txRef: string, userId: string): Promise<{ payment: Payment; booking: Booking; holdExpired: boolean } | null> {
  try {
    const payment = await data.server.getPaymentByTxRef(txRef);
    if (!payment || payment.provider !== "mock") return null;
    // getBooking returns null unless you booked it (or own the venue); only the customer pays.
    const booking = await data.getBooking(payment.bookingId);
    if (!booking || booking.customerId !== userId) return null;
    const holdExpired = booking.expiresAt !== null && new Date(booking.expiresAt).getTime() < Date.now();
    return { payment, booking, holdExpired };
  } catch (e) {
    if (isDataError(e) && (e.kind === "not_found" || e.kind === "invalid")) return null;
    throw e;
  }
}

function BackLink({ href }: { href: string }) {
  return (
    <Link className="pay-back" href={href}>
      <Icon name="left" />
      Back to your booking
    </Link>
  );
}

function TestLabel() {
  return (
    <p className="pay-test">
      <Icon name="alert" />
      Test mode, no real money
    </p>
  );
}

// Test payments only (PAYMENT_PROVIDER=mock): a stand-in for the MoMo or Airtel prompt on the
// customer's phone, or for the card checkout.
export default async function MockPaymentPage({ params }: Props) {
  if (activePaymentProvider() !== "mock") notFound();
  const { txRef: raw } = await params;
  const txRef = parseTxRef(raw);
  if (!txRef) notFound();

  const user = await requireUser(`/pay/mock/${txRef}`);
  const found = await load(txRef, user.id);
  if (!found) notFound();
  const { payment, booking, holdExpired: expired } = found;
  // Cash never goes through a provider, so a cash payment row here would be a mistake.
  if (payment.method === "cash") notFound();
  const method: PromptMethod = payment.method;
  const bookingHref = `/bookings/${encodeURIComponent(booking.id)}`;

  if (payment.status === "paid") redirect(`${bookingHref}?paid=1`);

  if (payment.status !== "pending" || booking.status !== "pending_payment") {
    const declined = payment.status === "failed";
    return (
      <div className="wrap-narrow page pay-done">
        <TestLabel />
        <h1 className="page-title">{declined ? "You declined this one" : "Nothing to approve here"}</h1>
        <p className="pay-lead">
          {declined && booking.status === "pending_payment"
            ? "Nothing was taken. Your slot is still held if you'd like another go: press Pay now on your booking."
            : declined
              ? "Nothing was taken. Your booking page shows where things stand."
              : "This booking isn't waiting for a payment any more. Your booking page shows where it's at."}
        </p>
        <Link className="btn btn-black" href={bookingHref}>
          See your booking
        </Link>
      </div>
    );
  }

  const label = methodLabel(method);
  const heading = headingWord(method);
  const msisdn = normalizeMsisdn(payment.msisdn) ?? normalizeMsisdn(booking.customerPhone);
  const question = promptQuestion({ method, amount: payment.amount, payee: payeeName(site.shortName), venue: booking.business.name });

  return (
    <div className="wrap page pay-page">
      <section className="pay-intro" aria-labelledby="pay-title">
        <TestLabel />
        <h1 id="pay-title" className="page-title">
          {heading.lead} <span className="em">{heading.accent}</span>
        </h1>
        <p className="pay-lead">
          {method === "card"
            ? "This stands in for the card checkout page."
            : `This stands in for the ${label} prompt that would pop up on ${msisdn ? prettyMsisdn(msisdn) : "your phone"}.`}{" "}
          You play both parts: Approve pays for the booking, Decline shows what happens when a payment doesn&apos;t go through.
        </p>
        <dl className="pay-facts">
          <div>
            <dt>Booking</dt>
            <dd>
              {booking.business.name} · {booking.ref}
            </dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>{formatInstant(booking.startsAt)}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{ugx(payment.amount)}</dd>
          </div>
          {booking.expiresAt && !expired && (
            <div>
              <dt>Slot held until</dt>
              <dd>{formatTime(booking.expiresAt)}</dd>
            </div>
          )}
        </dl>
        {expired && booking.expiresAt && (
          <p className="notice notice-warn">
            <Icon name="clock" />
            <span>
              The hold ran out at {formatTime(booking.expiresAt)}. Approve now and the slot is yours only if nobody else has
              taken it.
            </span>
          </p>
        )}
        <BackLink href={bookingHref} />
      </section>
      <MockPrompt txRef={payment.txRef} method={method} label={label} question={question} />
    </div>
  );
}
