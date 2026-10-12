// Words and rules for a customer's bookings: status pills, payment pills, which actions
// are allowed, and which banner the booking page shows. Pure, so it's tested and shared.

import type { Booking, BookingStatus, PaymentMethod } from "../../lib/types";

export type Tone = "ok" | "warn" | "err" | "info" | "mute";

export interface PillInfo {
  label: string;
  tone: Tone;
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  mtn: "MTN MoMo",
  airtel: "Airtel Money",
  card: "Card",
  cash: "Cash after service",
};

type BookingLike = Pick<Booking, "status" | "expiresAt" | "startsAt" | "endsAt" | "paymentMethod" | "paymentStatus" | "hasReview">;

const isOnline = (m: PaymentMethod) => m !== "cash";

// An unpaid mobile money or card booking only holds its slot for a while.
export function holdExpired(b: Pick<Booking, "status" | "expiresAt">, now: Date): boolean {
  return b.status === "pending_payment" && !!b.expiresAt && new Date(b.expiresAt).getTime() <= now.getTime();
}

const STATUS: Record<BookingStatus, PillInfo> = {
  pending_payment: { label: "Awaiting payment", tone: "warn" },
  confirmed: { label: "Confirmed", tone: "ok" },
  completed: { label: "Completed", tone: "info" },
  cancelled: { label: "Cancelled", tone: "mute" },
  no_show: { label: "Missed", tone: "err" },
};

export function statusPill(b: Pick<Booking, "status" | "expiresAt">, now: Date): PillInfo {
  if (holdExpired(b, now)) return { label: "Hold expired", tone: "mute" };
  return STATUS[b.status];
}

export function paymentPill(b: Pick<Booking, "status" | "paymentMethod" | "paymentStatus">): PillInfo {
  const method = METHOD_LABEL[b.paymentMethod];
  if (b.paymentStatus === "refunded") return { label: "Refunded", tone: "info" };
  if (b.paymentStatus === "paid") return { label: b.paymentMethod === "cash" ? "Paid in cash" : `Paid · ${method}`, tone: "ok" };
  if (b.status === "cancelled" || b.status === "no_show") return { label: "Not charged", tone: "mute" };
  if (b.paymentMethod === "cash") return { label: "Cash after service", tone: "mute" };
  if (b.paymentStatus === "failed") return { label: "Payment failed", tone: "err" };
  if (b.paymentStatus === "pending") return { label: `Waiting for ${method}`, tone: "warn" };
  return { label: `Not paid yet · ${method}`, tone: "warn" };
}

// The payment's state on its own, for a row that already names the method.
export function paymentStatusPill(b: Pick<Booking, "status" | "paymentMethod" | "paymentStatus">): PillInfo {
  if (b.paymentStatus === "refunded") return { label: "Refunded", tone: "info" };
  if (b.paymentStatus === "paid") return { label: "Paid", tone: "ok" };
  if (b.status === "cancelled" || b.status === "no_show") return { label: "Not charged", tone: "mute" };
  if (b.paymentMethod === "cash") return { label: "Due after service", tone: "mute" };
  if (b.paymentStatus === "failed") return { label: "Failed", tone: "err" };
  if (b.paymentStatus === "pending") return { label: "Waiting for approval", tone: "warn" };
  return { label: "Not paid yet", tone: "warn" };
}

// Upcoming: still on, and not over yet (soonest first). Past: everything else (latest first).
export function splitBookings<T extends BookingLike>(list: T[], now: Date): { upcoming: T[]; past: T[] } {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const b of list) {
    const live = b.status === "confirmed" || (b.status === "pending_payment" && !holdExpired(b, now));
    if (live && new Date(b.endsAt).getTime() > now.getTime()) upcoming.push(b);
    else past.push(b);
  }
  upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  past.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return { upcoming, past };
}

const notStarted = (b: Pick<Booking, "startsAt">, now: Date) => new Date(b.startsAt).getTime() > now.getTime();

export function canCancel(b: BookingLike, now: Date): boolean {
  const live = b.status === "confirmed" || (b.status === "pending_payment" && !holdExpired(b, now));
  return live && notStarted(b, now);
}

export function canPayAgain(b: BookingLike, now: Date): boolean {
  return (
    b.status === "pending_payment" &&
    isOnline(b.paymentMethod) &&
    b.paymentStatus !== "paid" &&
    !holdExpired(b, now) &&
    notStarted(b, now)
  );
}

export function canReview(b: Pick<Booking, "status" | "hasReview">, reviewsOn: boolean): boolean {
  return reviewsOn && b.status === "completed" && !b.hasReview;
}

// True when the appointment is closer than the free cancellation window.
export function insideCancellationFee(b: Pick<Booking, "startsAt">, now: Date, freeHours: number): boolean {
  return new Date(b.startsAt).getTime() - now.getTime() < freeHours * 3_600_000;
}

export type Banner =
  | "booked"
  | "paid"
  | "failed"
  | "pending_momo"
  | "pending_card"
  | "expired"
  | "paid_late"
  | "cancelled"
  | "reviewed"
  | null;

export interface BannerFlags {
  isNew?: boolean;
  paid?: boolean;
  failed?: boolean;
  cancelled?: boolean;
  reviewed?: boolean;
}

// Which message sits at the top of the booking page, from the booking itself and the
// ?new=1 / ?paid=1 / ?failed=1 flags the flow and the payment pages add.
export function bannerFor(b: BookingLike, flags: BannerFlags, now: Date): Banner {
  if (flags.cancelled && b.status === "cancelled") return "cancelled";
  if (flags.reviewed && b.hasReview) return "reviewed";
  if (b.status === "confirmed") {
    if (flags.paid && b.paymentStatus === "paid") return "paid";
    if (flags.isNew || flags.paid) return "booked";
    return null;
  }
  if (b.status === "cancelled" && b.paymentStatus === "paid") return "paid_late";
  if (b.status === "pending_payment") {
    if (holdExpired(b, now)) return "expired";
    if (flags.failed || b.paymentStatus === "failed") return "failed";
    if (b.paymentMethod === "mtn" || b.paymentMethod === "airtel") return "pending_momo";
    if (b.paymentMethod === "card") return "pending_card";
  }
  return null;
}
