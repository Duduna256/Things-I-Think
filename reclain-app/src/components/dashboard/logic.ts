// Rules and numbers for the provider dashboard and the admin screen: which actions a booking
// allows, status words, takings, the day strip, filters and the review checklist.
// Pure (relative imports only), so it's unit-tested and safe on both sides of the boundary.

import { addDays, localParts, parseHHMM, toInstant, weekdayOf } from "../../lib/time";
import type { Booking, BookingStatus, BusinessStatus, PaymentMethod, Service, Staff } from "../../lib/types";

export type Tone = "ok" | "warn" | "err" | "info" | "mute";
export interface Pill {
  label: string;
  tone: Tone;
}

type Timing = Pick<Booking, "status" | "expiresAt" | "startsAt" | "endsAt">;
type Money = Pick<Booking, "status" | "paymentMethod" | "paymentStatus">;
type BookingLike = Timing & Money;

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  mtn: "MTN MoMo",
  airtel: "Airtel Money",
  card: "Card",
  cash: "Cash",
};

// ---------- Dates (Kampala) ----------

// The UTC instants a local day starts and ends at, for listBusinessBookings().
export function dayRange(date: string): { fromIso: string; toIso: string } {
  return { fromIso: toInstant(date, 0).toISOString(), toIso: toInstant(addDays(date, 1), 0).toISOString() };
}

// The Monday of the week a local date falls in.
export function weekStart(date: string): string {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

// Monday 00:00 to the next Monday 00:00, local time.
export function weekRange(date: string): { start: string; end: string; fromIso: string; toIso: string } {
  const start = weekStart(date);
  return {
    start,
    end: addDays(start, 6),
    fromIso: toInstant(start, 0).toISOString(),
    toIso: toInstant(addDays(start, 7), 0).toISOString(),
  };
}

// A "YYYY-MM-DD" from the address bar, or the fallback when it isn't a real date.
export function parseDateParam(raw: unknown, fallback: string): string {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallback;
  const [y, m, d] = raw.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return fallback;
  if (y < 2020 || y > 2100) return fallback;
  return raw;
}

export function greeting(now: Date): string {
  const hour = Math.floor(localParts(now).minutes / 60);
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

// ---------- Booking state ----------

// An unpaid mobile money or card booking only holds its slot for a while.
export function holdExpired(b: Pick<Booking, "status" | "expiresAt">, now: Date): boolean {
  return b.status === "pending_payment" && !!b.expiresAt && new Date(b.expiresAt).getTime() <= now.getTime();
}

// Still on: confirmed, or waiting for a payment that can still arrive.
export function isLive(b: Pick<Booking, "status" | "expiresAt">, now: Date): boolean {
  return b.status === "confirmed" || (b.status === "pending_payment" && !holdExpired(b, now));
}

// Money the venue has made: completed bookings and paid ones, never cancelled or refunded.
export function isTaking(b: Money): boolean {
  if (b.status === "cancelled" || b.paymentStatus === "refunded") return false;
  return b.status === "completed" || b.paymentStatus === "paid";
}

export function takings(list: (Money & Pick<Booking, "total">)[]): number {
  return list.reduce((sum, b) => (isTaking(b) ? sum + b.total : sum), 0);
}

// Live bookings starting between now and `untilIso`.
export function countUpcoming(list: Timing[], now: Date, untilIso: string): number {
  const from = now.getTime();
  const until = new Date(untilIso).getTime();
  return list.filter(b => {
    const t = new Date(b.startsAt).getTime();
    return isLive(b, now) && t >= from && t < until;
  }).length;
}

export type BookingOp = "complete" | "no_show" | "cancel" | "cash_paid";
export const BOOKING_OPS: BookingOp[] = ["complete", "no_show", "cancel", "cash_paid"];

// Why the venue can't do this to the booking right now, or null when it can.
export function refusalReason(op: BookingOp, b: BookingLike, now: Date): string | null {
  const started = new Date(b.startsAt).getTime() <= now.getTime();
  const ended = new Date(b.endsAt).getTime() <= now.getTime();
  switch (op) {
    case "complete":
    case "no_show":
      if (b.status !== "confirmed") {
        return b.status === "pending_payment"
          ? "This booking is still waiting for its payment, so it can't be closed yet."
          : "This booking is already closed.";
      }
      if (!started) return op === "complete" ? "You can mark it completed once it has started." : "You can mark a no-show once the start time has passed.";
      return null;
    case "cancel":
      if (!isLive(b, now)) return "This booking can no longer be cancelled.";
      if (ended) return "This booking has already finished. Mark it completed or a no-show instead.";
      return null;
    case "cash_paid":
      if (b.paymentMethod !== "cash") return "Only cash bookings are marked paid by hand.";
      if (b.paymentStatus === "paid") return "This booking is already marked as paid.";
      if (b.status !== "confirmed" && b.status !== "completed") return "Only a confirmed or completed booking can be marked paid.";
      return null;
  }
}

export interface AllowedActions {
  complete: boolean;
  noShow: boolean;
  cancel: boolean;
  cashPaid: boolean;
}

export function allowedActions(b: BookingLike, now: Date): AllowedActions {
  return {
    complete: refusalReason("complete", b, now) === null,
    noShow: refusalReason("no_show", b, now) === null,
    cancel: refusalReason("cancel", b, now) === null,
    cashPaid: refusalReason("cash_paid", b, now) === null,
  };
}

export function hasAnyAction(a: AllowedActions): boolean {
  return a.complete || a.noShow || a.cancel || a.cashPaid;
}

export const OP_DONE: Record<BookingOp, string> = {
  complete: "Marked as completed.",
  no_show: "Marked as a no-show.",
  cancel: "Cancelled. We'll text the customer to let them know.",
  cash_paid: "Cash payment recorded.",
};

const STATUS: Record<BookingStatus, Pill> = {
  pending_payment: { label: "Awaiting payment", tone: "warn" },
  confirmed: { label: "Confirmed", tone: "ok" },
  completed: { label: "Completed", tone: "info" },
  cancelled: { label: "Cancelled", tone: "mute" },
  no_show: { label: "No-show", tone: "err" },
};

export function statusPill(b: Pick<Booking, "status" | "expiresAt">, now: Date): Pill {
  if (holdExpired(b, now)) return { label: "Hold expired", tone: "mute" };
  return STATUS[b.status];
}

export function paymentPill(b: Money): Pill {
  const method = METHOD_LABEL[b.paymentMethod];
  if (b.paymentStatus === "refunded") return { label: "Refunded", tone: "info" };
  if (b.paymentStatus === "paid") {
    if (b.status === "cancelled") return { label: "Paid · refund due", tone: "err" };
    return { label: b.paymentMethod === "cash" ? "Paid in cash" : `Paid · ${method}`, tone: "ok" };
  }
  if (b.status === "cancelled" || b.status === "no_show") return { label: "Not charged", tone: "mute" };
  if (b.paymentMethod === "cash") return { label: "Cash on the day", tone: "mute" };
  if (b.paymentStatus === "failed") return { label: `${method} failed`, tone: "err" };
  if (b.paymentStatus === "pending") return { label: `Waiting for ${method}`, tone: "warn" };
  return { label: `Not paid yet · ${method}`, tone: "warn" };
}

// ---------- Bookings page filter ----------

export interface StatusFilter {
  key: string;
  label: string;
  statuses: BookingStatus[];
}

export const STATUS_FILTERS: StatusFilter[] = [
  { key: "all", label: "All", statuses: [] },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { key: "pending", label: "Awaiting payment", statuses: ["pending_payment"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "no_show", label: "No-shows", statuses: ["no_show"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

export function parseStatusFilter(raw: unknown): StatusFilter {
  return STATUS_FILTERS.find(f => f.key === raw) ?? STATUS_FILTERS[0];
}

// ---------- Today's strip ----------

export interface Block {
  id: string;
  left: number; // % from opening time
  width: number; // % of the opening hours
  past: boolean;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

// Where each booking sits on a strip that runs from opening to closing time.
export function dayBlocks(
  list: (Timing & Pick<Booking, "id">)[],
  date: string,
  opensAt: string,
  closesAt: string,
  now: Date,
): Block[] {
  const open = parseHHMM(opensAt);
  const span = parseHHMM(closesAt) - open;
  if (span <= 0) return [];
  const dayStart = toInstant(date, 0).getTime();
  const toMin = (iso: string) => (new Date(iso).getTime() - dayStart) / 60_000;
  return list
    .filter(b => b.status !== "cancelled" && !holdExpired(b, now))
    .map(b => {
      const start = clamp(toMin(b.startsAt) - open, 0, span);
      const end = clamp(toMin(b.endsAt) - open, 0, span);
      return {
        id: b.id,
        left: round1((start / span) * 100),
        width: round1(Math.max(((end - start) / span) * 100, 1.5)),
        past: new Date(b.endsAt).getTime() <= now.getTime(),
      };
    })
    .filter(b => b.left < 100);
}

// Where "now" sits on the strip, or null when it's another day or outside opening hours.
export function nowMarker(now: Date, date: string, opensAt: string, closesAt: string): number | null {
  const local = localParts(now);
  if (local.date !== date) return null;
  const open = parseHHMM(opensAt);
  const close = parseHHMM(closesAt);
  if (close <= open || local.minutes < open || local.minutes > close) return null;
  return round1(((local.minutes - open) / (close - open)) * 100);
}

// Hour labels for the strip: every hour, or every other hour on a long day.
export function hourTicks(opensAt: string, closesAt: string): { label: string; left: number }[] {
  const open = parseHHMM(opensAt);
  const close = parseHHMM(closesAt);
  if (close <= open) return [];
  const step = close - open > 10 * 60 ? 120 : 60;
  const ticks: { label: string; left: number }[] = [];
  for (let t = Math.ceil(open / 60) * 60; t <= close; t += step) {
    ticks.push({ label: String(t / 60).padStart(2, "0"), left: round1(((t - open) / (close - open)) * 100) });
  }
  return ticks;
}

// Index of the first booking that starts after now (where the "Now" line goes), or -1.
export function nowIndex(list: Pick<Booking, "startsAt">[], now: Date): number {
  return list.findIndex(b => new Date(b.startsAt).getTime() > now.getTime());
}

// ---------- Going live ----------

export interface ReadinessItem {
  key: "service" | "team" | "phone" | "blurb" | "address";
  label: string; // the to-do, as a sentence fragment
  done: boolean;
  required: boolean;
}

export function readiness(b: {
  services: Pick<Service, "active">[];
  staff: Pick<Staff, "active">[];
  phone: string | null;
  blurb: string;
  address: string;
  visitMode: "salon" | "both" | "mobile";
}): ReadinessItem[] {
  return [
    { key: "service", label: "add at least one service", done: b.services.some(s => s.active), required: true },
    { key: "team", label: "have someone on the team taking bookings", done: b.staff.some(s => s.active), required: true },
    { key: "phone", label: "add a phone number so we can text you new bookings", done: !!b.phone, required: true },
    { key: "blurb", label: "write a line or two about what you do", done: b.blurb.trim().length > 0, required: false },
    ...(b.visitMode === "mobile"
      ? []
      : [{ key: "address" as const, label: "add your address so customers can find you", done: b.address.trim().length > 0, required: false }]),
  ];
}

// "add a service and add a phone number" from the required items still to do.
export function missingSentence(items: ReadinessItem[]): string {
  const todo = items.filter(i => i.required && !i.done).map(i => i.label);
  if (todo.length <= 1) return todo.join("");
  return `${todo.slice(0, -1).join(", ")} and ${todo[todo.length - 1]}`;
}

// ---------- Team ----------

// True when the change would take the team from someone taking bookings to nobody.
export function leavesNobodyActive(
  staff: Pick<Staff, "id" | "active">[],
  change: { id: string; remove?: boolean; active?: boolean },
): boolean {
  if (!staff.some(s => s.active)) return false;
  const after = staff
    .filter(s => !(change.remove && s.id === change.id))
    .map(s => (s.id === change.id && change.active !== undefined ? { ...s, active: change.active } : s));
  return !after.some(s => s.active);
}

// ---------- Admin ----------

export const ADMIN_TABS: BusinessStatus[] = ["pending", "published", "draft", "suspended"];

export const BUSINESS_STATUS: Record<BusinessStatus, { tab: string; pill: Pill }> = {
  pending: { tab: "Waiting", pill: { label: "Waiting for review", tone: "warn" } },
  published: { tab: "Live", pill: { label: "Live", tone: "ok" } },
  draft: { tab: "Drafts", pill: { label: "Draft", tone: "mute" } },
  suspended: { tab: "Suspended", pill: { label: "Suspended", tone: "err" } },
};

export type AdminOp = "approve" | "send_back" | "suspend" | "unsuspend";
export const ADMIN_OPS: AdminOp[] = ["approve", "send_back", "suspend", "unsuspend"];

export const ADMIN_TARGET: Record<AdminOp, BusinessStatus> = {
  approve: "published",
  send_back: "draft",
  suspend: "suspended",
  unsuspend: "published",
};

// What an admin can do from each status, most likely first.
export function adminOps(status: BusinessStatus): AdminOp[] {
  switch (status) {
    case "pending":
      return ["approve", "send_back", "suspend"];
    case "published":
      return ["suspend"];
    case "draft":
      return ["suspend"];
    case "suspended":
      return ["unsuspend"];
  }
}

export function parseAdminTab(raw: unknown): BusinessStatus {
  return ADMIN_TABS.find(t => t === raw) ?? "pending";
}
