// Run: node --import tsx --test src/components/booking/labels.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Booking } from "../../lib/types";
import {
  bannerFor,
  canCancel,
  canPayAgain,
  canReview,
  holdExpired,
  insideCancellationFee,
  paymentPill,
  paymentStatusPill,
  splitBookings,
  statusPill,
} from "./labels";

const NOW = new Date("2030-01-07T09:00:00Z");
const hours = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

type B = Pick<Booking, "status" | "expiresAt" | "startsAt" | "endsAt" | "paymentMethod" | "paymentStatus" | "hasReview"> &
  Partial<Pick<Booking, "cancelledBy">> & { id: string };
const make = (over: Partial<B> = {}): B => ({
  id: "x",
  status: "confirmed",
  expiresAt: null,
  startsAt: hours(24),
  endsAt: hours(25),
  paymentMethod: "cash",
  paymentStatus: "unpaid",
  hasReview: false,
  ...over,
});

test("a pending payment's hold runs out", () => {
  assert.equal(holdExpired(make({ status: "pending_payment", expiresAt: hours(-0.1) }), NOW), true);
  assert.equal(holdExpired(make({ status: "pending_payment", expiresAt: hours(0.2) }), NOW), false);
  assert.equal(holdExpired(make({ status: "confirmed", expiresAt: hours(-1) }), NOW), false);
});

test("status pills", () => {
  assert.deepEqual(statusPill(make(), NOW), { label: "Confirmed", tone: "ok" });
  assert.deepEqual(statusPill(make({ status: "pending_payment", expiresAt: hours(0.5) }), NOW), { label: "Awaiting payment", tone: "warn" });
  assert.deepEqual(statusPill(make({ status: "pending_payment", expiresAt: hours(-1) }), NOW), { label: "Hold expired", tone: "mute" });
  assert.equal(statusPill(make({ status: "no_show" }), NOW).label, "Missed");
});

test("payment pills", () => {
  assert.deepEqual(paymentPill(make()), { label: "Cash after service", tone: "mute" });
  assert.deepEqual(paymentPill(make({ paymentStatus: "paid" })), { label: "Paid in cash", tone: "ok" });
  assert.deepEqual(paymentPill(make({ paymentMethod: "mtn", paymentStatus: "paid" })), { label: "Paid · MTN MoMo", tone: "ok" });
  assert.deepEqual(paymentPill(make({ status: "pending_payment", paymentMethod: "airtel", paymentStatus: "pending" })), {
    label: "Waiting for Airtel Money",
    tone: "warn",
  });
  assert.equal(paymentPill(make({ status: "cancelled", paymentMethod: "mtn", paymentStatus: "pending" })).label, "Not charged");
  assert.equal(paymentPill(make({ paymentMethod: "card", paymentStatus: "failed", status: "pending_payment" })).label, "Payment failed");
});

test("status-only payment pills don't repeat the method", () => {
  assert.equal(paymentStatusPill(make()).label, "Due after service");
  assert.equal(paymentStatusPill(make({ paymentMethod: "mtn", paymentStatus: "pending", status: "pending_payment" })).label, "Waiting for approval");
  assert.equal(paymentStatusPill(make({ paymentMethod: "card", paymentStatus: "paid" })).label, "Paid");
  assert.equal(paymentStatusPill(make({ status: "cancelled", paymentMethod: "mtn" })).label, "Not charged");
});

test("upcoming and past", () => {
  const list = [
    make({ id: "later", startsAt: hours(48), endsAt: hours(49) }),
    make({ id: "soon", startsAt: hours(2), endsAt: hours(3) }),
    make({ id: "done", status: "completed", startsAt: hours(-48), endsAt: hours(-47) }),
    make({ id: "cancelled", status: "cancelled" }),
    make({ id: "expired", status: "pending_payment", expiresAt: hours(-1) }),
    make({ id: "now", startsAt: hours(-0.5), endsAt: hours(0.5) }),
  ];
  const { upcoming, past } = splitBookings(list, NOW);
  assert.deepEqual(upcoming.map(b => b.id), ["now", "soon", "later"]);
  assert.deepEqual(past.map(b => b.id).sort(), ["cancelled", "done", "expired"]);
  assert.equal(past[past.length - 1].id, "done", "latest first");
});

test("what a customer can do", () => {
  assert.equal(canCancel(make(), NOW), true);
  assert.equal(canCancel(make({ startsAt: hours(-1) }), NOW), false, "not after it has started");
  assert.equal(canCancel(make({ status: "completed" }), NOW), false);
  assert.equal(canCancel(make({ status: "pending_payment", expiresAt: hours(0.3) }), NOW), true);

  const waiting = make({ status: "pending_payment", paymentMethod: "mtn", expiresAt: hours(0.3) });
  assert.equal(canPayAgain(waiting, NOW), true);
  assert.equal(canPayAgain({ ...waiting, expiresAt: hours(-0.1) }, NOW), false);
  assert.equal(canPayAgain({ ...waiting, paymentMethod: "cash" }, NOW), false);
  assert.equal(canPayAgain({ ...waiting, status: "confirmed" }, NOW), false);

  assert.equal(canReview(make({ status: "completed" }), true), true);
  assert.equal(canReview(make({ status: "completed", hasReview: true }), true), false);
  assert.equal(canReview(make({ status: "completed" }), false), false);
  assert.equal(canReview(make(), true), false);
});

test("the cancellation fee window", () => {
  assert.equal(insideCancellationFee(make({ startsAt: hours(3) }), NOW, 4), true);
  assert.equal(insideCancellationFee(make({ startsAt: hours(5) }), NOW, 4), false);
});

test("banners", () => {
  assert.equal(bannerFor(make(), { isNew: true }, NOW), "booked");
  assert.equal(bannerFor(make(), {}, NOW), null);
  assert.equal(bannerFor(make({ paymentMethod: "mtn", paymentStatus: "paid" }), { paid: true }, NOW), "paid");
  const waiting = make({ status: "pending_payment", paymentMethod: "mtn", paymentStatus: "pending", expiresAt: hours(0.3) });
  assert.equal(bannerFor(waiting, {}, NOW), "pending_momo");
  assert.equal(bannerFor(waiting, { paid: true }, NOW), "pending_momo", "webhook not in yet");
  assert.equal(bannerFor({ ...waiting, paymentMethod: "card" }, {}, NOW), "pending_card");
  assert.equal(bannerFor(waiting, { failed: true }, NOW), "failed");
  // Hold ran out: still checking while a payment is in flight, otherwise expired.
  assert.equal(bannerFor({ ...waiting, expiresAt: hours(-0.1) }, {}, NOW), "checking");
  assert.equal(bannerFor({ ...waiting, expiresAt: hours(-0.1) }, { failed: true }, NOW), "expired");
  assert.equal(bannerFor({ ...waiting, expiresAt: hours(-1) }, {}, NOW), "expired");
  assert.equal(bannerFor({ ...waiting, paymentStatus: "failed", expiresAt: hours(-1) }, {}, NOW), "expired");
  assert.equal(bannerFor({ ...waiting, paymentStatus: "unpaid", expiresAt: hours(-1) }, {}, NOW), "expired");
  assert.equal(bannerFor(make({ status: "cancelled", cancelledBy: "expired", paymentStatus: "pending", paymentMethod: "mtn", expiresAt: hours(-0.1) }), {}, NOW), "checking");
  assert.equal(bannerFor({ ...waiting, paymentStatus: "pending" }, { review: true }, NOW), "review");
  assert.equal(bannerFor(make({ status: "cancelled", cancelledBy: "expired", paymentStatus: "paid", paymentMethod: "mtn" }), { paid: true }, NOW), "paid_late");
  assert.equal(bannerFor(make({ status: "cancelled" }), { cancelled: true }, NOW), "cancelled");
  assert.equal(bannerFor(make({ status: "completed", hasReview: true }), { reviewed: true }, NOW), "reviewed");
});

test("a paid booking cancelled by someone says a refund is due, not 'arrived late'", () => {
  const paid = { status: "cancelled" as const, paymentStatus: "paid" as const, paymentMethod: "mtn" as const };
  assert.equal(bannerFor(make({ ...paid, cancelledBy: "customer" }), {}, NOW), "cancelled_refund");
  assert.equal(bannerFor(make({ ...paid, cancelledBy: "venue" }), {}, NOW), "cancelled_refund");
  assert.equal(bannerFor(make({ ...paid, cancelledBy: "expired" }), {}, NOW), "paid_late");
});

test("'still checking' only lasts a short while after the hold, and a failed check ends it", () => {
  const base = make({ status: "pending_payment", paymentMethod: "mtn", paymentStatus: "pending" });
  const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
  assert.equal(bannerFor({ ...base, expiresAt: minutesAgo(5) }, {}, NOW), "checking");
  assert.equal(bannerFor({ ...base, expiresAt: minutesAgo(5) }, { failed: true }, NOW), "expired");
  assert.equal(bannerFor({ ...base, expiresAt: minutesAgo(60) }, {}, NOW), "expired");
});
