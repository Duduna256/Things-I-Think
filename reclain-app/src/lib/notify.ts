// SMS messages about bookings: what goes out, when, and to whom.
//
// The wording functions are pure and unit-tested (notify.test.ts). Each message aims for one
// 160-character SMS in the plain GSM alphabet: richer wording first, plainer wording (and a
// shorter link, then a shortened name) only when it would run long.
//
// The send functions never throw: a failed SMS must not break a booking. Confirmations and
// cancellations go out after the response has been sent, so nobody waits on the SMS gateway.
// This file has no "server-only" marker so the tests can load it; the sending code it pulls in
// (./sms) carries the marker, so a browser bundle that imported this would still fail to build.

import { features } from "../config/features";
import { site } from "../config/site";
import { ugx } from "./format";
import { normalizeMsisdn, prettyMsisdn } from "./phone";
import { formatDate, formatTime, localParts } from "./time";
import type { Booking } from "./types";

export const SMS_LIMIT = 160;

// ---------- Wording ----------

// Curly quotes, long dashes and the like aren't in the GSM alphabet. One of them turns a
// 160-character SMS into a 70-character one, so swap them for plain equivalents.
export function toGsm(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u2032`\u00B4]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u2007\u2009\u202F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "https://reclain.com" -> "reclain.com". Phones turn it into a link on their own.
export function siteHost(url: string = site.url): string {
  return url
    .replace(/^https:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

// "Kneaded Massage & Spa", 16 -> "Kneaded Massage..."
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, Math.max(1, max - 3)).replace(/[^A-Za-z0-9)]+$/, "");
  return `${cut || text.slice(0, 1)}...`;
}

// Ends a phrase with a full stop, unless it already ends with one ("Knotless br...").
function stop(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

// One way of wording a message. `full` asks for the booking's own link rather than the
// bookings list; `name` is the stretchy part (a venue name, or services), shortened last.
type Wording = (o: { full: boolean; name: string }) => string;

function shorten(wording: Wording, full: boolean, name: string, min: number): string {
  const text = toGsm(wording({ full, name }));
  const over = text.length - SMS_LIMIT;
  if (over <= 0) return text;
  return toGsm(wording({ full, name: clip(name, Math.max(min, name.length - over)) }));
}

// Picks the richest wording that fits one SMS. Order of sacrifice: the wit, then a few letters
// of the name, then the booking's own link (for the bookings list), then more of the name.
function fit(wordings: Wording[], name: string): string {
  const plainest = wordings[wordings.length - 1];
  for (const full of [true, false]) {
    for (const wording of wordings) {
      const text = toGsm(wording({ full, name }));
      if (text.length <= SMS_LIMIT) return text;
    }
    if (full) {
      const clipped = shorten(plainest, true, name, 16);
      if (clipped.length <= SMS_LIMIT) return clipped;
    }
  }
  return shorten(plainest, false, name, 10);
}

function when(b: Pick<Booking, "startsAt">) {
  return { date: formatDate(localParts(b.startsAt).date), time: formatTime(b.startsAt) };
}

// Where it happens, from the customer's side.
function place(b: Pick<Booking, "location" | "business">, name: string): string {
  if (b.location !== "home") return name;
  return b.business.categoryId === "laundry" ? `${name} pickup` : `${name} at your place`;
}

function money(b: Pick<Booking, "total" | "paymentMethod" | "paymentStatus">, long: boolean): string {
  const amount = ugx(b.total);
  if (b.paymentStatus === "paid") return `${amount} paid`;
  if (b.paymentMethod === "cash") return long ? `${amount} cash after service` : `${amount} cash`;
  return long ? `${amount} not paid yet` : `${amount} to pay`;
}

const bookingLink = (b: Pick<Booking, "id">, full: boolean) => (full ? `${siteHost()}/bookings/${b.id}` : `${siteHost()}/bookings`);
const dashboardLink = () => `${siteHost()}/business/bookings`;
const venueLink = (b: Pick<Booking, "business">) => `${siteHost()}/v/${b.business.slug}`;

function customerLabel(b: Pick<Booking, "customerName" | "customerPhone">): string {
  const name = clip(b.customerName.trim() || "A customer", 30);
  const phone = normalizeMsisdn(b.customerPhone);
  return phone ? `${name}, ${prettyMsisdn(phone)}` : name;
}

// To the customer, once the booking is confirmed (paid, or cash).
export function confirmationSms(b: Booking): string {
  const { date, time } = when(b);
  return fit(
    [
      ({ full, name }) => `You're booked! ${place(b, name)}, ${date} at ${time}. Ref ${b.ref}, ${money(b, true)}. Change of plans? ${bookingLink(b, full)}`,
      ({ full, name }) => `Booked: ${place(b, name)}, ${date} ${time}. Ref ${b.ref}, ${money(b, false)}. Manage: ${bookingLink(b, full)}`,
    ],
    b.business.name,
  );
}

// To the venue's phone, for the same booking. The dashboard has the full details.
export function venueBookingSms(b: Booking): string {
  const { date, time } = when(b);
  const visit = b.location === "home" ? (b.business.categoryId === "laundry" ? ", pickup" : ", home visit") : "";
  const names = b.items.map(i => i.name);
  const all = names.join(", ") || "See the dashboard";
  const more = names.length > 1 ? ` + ${names.length - 1} more` : "";
  const head = `New booking ${b.ref}: ${customerLabel(b)}`;
  return fit(
    [
      () => `${head}, ${date} at ${time}${visit}. ${stop(all)} ${money(b, true)}. Details: ${dashboardLink()}`,
      () => `${head}, ${date} ${time}${visit}. ${stop(all)} ${money(b, false)}. ${dashboardLink()}`,
      // Too many to list: the first service, and a count of the rest.
      ({ name }) => `${head}, ${date} ${time}${visit}. ${stop(name + more)} ${money(b, false)}. ${dashboardLink()}`,
    ],
    names[0] ?? all,
  );
}

// To the customer, when their booking is cancelled by them or by the venue.
export function cancellationSms(b: Booking, by: "customer" | "venue"): string {
  const { date, time } = when(b);
  const paid = b.paymentStatus === "paid";
  if (by === "customer") {
    // Whether money comes back depends on how late it was, so a person follows up.
    const money = paid ? ` We'll be in touch about your ${ugx(b.total)}.` : "";
    return fit(
      [
        ({ name }) => `Cancelled: ${b.ref} at ${name}, ${date} at ${time}.${money} No hard feelings. Book again any time: ${venueLink(b)}`,
        ({ name }) => `Cancelled: ${b.ref} at ${name}, ${date} ${time}.${money} Book again: ${venueLink(b)}`,
      ],
      b.business.name,
    );
  }
  // The venue called it off, so the customer gets everything back.
  const money = paid ? ` We'll refund your ${ugx(b.total)}.` : "";
  return fit(
    [
      ({ name }) => `Sorry, ${name} had to cancel ${b.ref} on ${date} at ${time}.${money} Pick another time: ${venueLink(b)}`,
      ({ name }) => `${name} cancelled ${b.ref}, ${date} ${time}.${money} Rebook: ${venueLink(b)}`,
    ],
    b.business.name,
  );
}

// To the venue, when the customer cancels.
export function venueCancellationSms(b: Booking): string {
  const { date, time } = when(b);
  return fit(
    [
      ({ name }) => `Cancelled by the customer: ${b.ref}, ${name}, ${date} at ${time}. The slot is free again. ${dashboardLink()}`,
      ({ name }) => `Cancelled: ${b.ref}, ${name}, ${date} ${time}. Slot free again. ${dashboardLink()}`,
    ],
    customerLabel(b),
  );
}

// To the customer, the evening before.
export function reminderSms(b: Booking): string {
  const { date, time } = when(b);
  const cash = b.paymentMethod === "cash" && b.paymentStatus !== "paid";
  return fit(
    [
      ({ full, name }) =>
        `See you tomorrow! ${place(b, name)}, ${date} at ${time}. Ref ${b.ref}.${cash ? ` Cash after service: ${ugx(b.total)}.` : ""} Can't make it? ${bookingLink(b, full)}`,
      ({ full, name }) => `Reminder: ${place(b, name)}, tomorrow ${date} ${time}. Ref ${b.ref}.${cash ? ` ${ugx(b.total)} cash.` : ""} ${bookingLink(b, full)}`,
      // The link finds the booking, so the ref is the first thing to go.
      ({ full, name }) => `Reminder: ${place(b, name)}, tomorrow ${date} ${time}.${cash ? ` ${ugx(b.total)} cash.` : ""} ${bookingLink(b, full)}`,
    ],
    b.business.name,
  );
}

// ---------- Sending ----------

async function deliver(phone: string | null | undefined, body: string, kind: string, bookingId: string): Promise<boolean> {
  if (!phone) return false;
  const { sendSms } = await import("./sms");
  const result = await sendSms(phone, body, { kind, bookingId });
  return result.ok;
}

// Sends once the response has gone (Next's after()), or straight away outside a request.
async function inBackground(label: string, task: () => Promise<unknown>): Promise<void> {
  const run = async () => {
    try {
      await task();
    } catch (e) {
      console.error(`${label} failed`, e);
    }
  };
  try {
    const { after } = await import("next/server");
    after(run);
  } catch {
    // Not inside a request (a script, say): send now instead.
    await run();
  }
}

export async function notifyBookingConfirmed(booking: Booking): Promise<void> {
  try {
    if (!features.smsConfirmations || booking.status !== "confirmed") return;
    const toCustomer = confirmationSms(booking);
    const toVenue = venueBookingSms(booking);
    await inBackground("Booking confirmation SMS", () =>
      Promise.all([
        deliver(booking.customerPhone, toCustomer, "confirmed", booking.id),
        deliver(booking.business.phone, toVenue, "venue_new_booking", booking.id),
      ]),
    );
  } catch (e) {
    console.error("notifyBookingConfirmed failed", e);
  }
}

export async function notifyBookingCancelled(booking: Booking, by: "customer" | "venue"): Promise<void> {
  try {
    if (!features.smsConfirmations) return;
    const toCustomer = cancellationSms(booking, by);
    // The venue only needs telling when the customer did it.
    const toVenue = by === "customer" ? venueCancellationSms(booking) : null;
    await inBackground("Cancellation SMS", () =>
      Promise.all([
        deliver(booking.customerPhone, toCustomer, by === "customer" ? "cancelled" : "cancelled_by_venue", booking.id),
        toVenue ? deliver(booking.business.phone, toVenue, "venue_cancelled", booking.id) : false,
      ]),
    );
  } catch (e) {
    console.error("notifyBookingCancelled failed", e);
  }
}

// The day-before reminder. True when the SMS went out (the cron job then marks it sent).
export async function sendReminder(booking: Booking): Promise<boolean> {
  try {
    if (!features.smsReminders || booking.status !== "confirmed") return false;
    return await deliver(booking.customerPhone, reminderSms(booking), "reminder", booking.id);
  } catch (e) {
    console.error("sendReminder failed", e);
    return false;
  }
}
