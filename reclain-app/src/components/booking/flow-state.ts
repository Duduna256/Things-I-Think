// Pure helpers for the booking flow: which steps it has, where the service happens,
// which payment methods are on offer, and reading/writing the flow's state in a URL
// (so a customer who logs in halfway comes back to the same services and time).
// No React and no server-only imports: used by the page, the client flow and the Server Action.

import type { BookingLocation, PaymentMethod, Service, VisitMode } from "../../lib/types";
import { effectiveLocation } from "../../lib/booking/rules";
import { hhmm, localParts, weekdayOf } from "../../lib/time";
import type { AvailabilityResponse, FlowSelection, FlowStep } from "./types";

export const STEP_LABELS: Record<FlowStep, string> = {
  services: "Services",
  pro: "Professional",
  time: "Time",
  confirm: "Confirm",
};

export function stepsFor(skipProfessional: boolean): FlowStep[] {
  return skipProfessional ? ["services", "time", "confirm"] : ["services", "pro", "time", "confirm"];
}

// Where the service happens. "At my place" only counts at a venue that does both
// when home visits are switched on in features.ts.
export function allowedLocation(visitMode: VisitMode, requested: BookingLocation, homeVisitsOn: boolean): BookingLocation {
  if (visitMode === "both" && !homeVisitsOn) return "venue";
  return effectiveLocation(visitMode, requested);
}

export interface PaymentFlags {
  mobileMoney: boolean;
  cardPayments: boolean;
  cashPayments: boolean;
}

// The payment methods the confirm step offers, in display order.
export function payMethodsFor(flags: PaymentFlags, acceptsCash: boolean): PaymentMethod[] {
  const out: PaymentMethod[] = [];
  if (flags.mobileMoney) out.push("mtn", "airtel");
  if (flags.cardPayments) out.push("card");
  if (flags.cashPayments && acceptsCash) out.push("cash");
  return out;
}

export interface ServiceGroup {
  name: string;
  services: Service[];
}

// The menu in sections, keeping the venue's order (services arrive sorted).
export function groupServices(services: Service[]): ServiceGroup[] {
  const groups: ServiceGroup[] = [];
  for (const s of services) {
    const name = s.groupName.trim() || "Services";
    let g = groups.find(x => x.name === name);
    if (!g) groups.push((g = { name, services: [] }));
    g.services.push(s);
  }
  return groups;
}

// The first bookable day the venue is open, or the first day if it never opens.
export function preferredDate(dates: string[], closedDays: number[]): string {
  return dates.find(d => !closedDays.includes(weekdayOf(d))) ?? dates[0];
}

export interface FlowContext {
  menuIds: string[];
  staffIds: string[];
  skipProfessional: boolean;
  visitMode: VisitMode;
  homeVisitsOn: boolean;
  closedDays: number[];
  dates: string[];
  payMethods: PaymentMethod[];
  now: Date;
  minLeadMinutes: number;
}

type Query = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

// Reads ?service= (one service, from the venue page) or the full state written by flowQuery().
// Anything that doesn't belong to this venue, or no longer makes sense, is dropped.
export function parseFlowQuery(query: Query, ctx: FlowContext): FlowSelection {
  const menu = new Set(ctx.menuIds);
  const list = one(query.services) ?? one(query.service) ?? "";
  const serviceIds = [...new Set(list.split(",").map(s => s.trim()))].filter(id => menu.has(id)).slice(0, 20);

  const location = allowedLocation(ctx.visitMode, one(query.loc) === "home" ? "home" : "venue", ctx.homeVisitsOn);

  const pro = one(query.pro);
  const staffId = ctx.skipProfessional ? "any" : pro === "any" ? "any" : pro && ctx.staffIds.includes(pro) ? pro : null;

  const wantedDate = one(query.date);
  const date =
    wantedDate && ctx.dates.includes(wantedDate) && !ctx.closedDays.includes(weekdayOf(wantedDate))
      ? wantedDate
      : preferredDate(ctx.dates, ctx.closedDays);

  let slot: FlowSelection["slot"] = null;
  const at = one(query.at);
  if (at && wantedDate === date) {
    const t = new Date(at);
    const local = Number.isNaN(t.getTime()) ? null : localParts(t);
    if (local && local.date === date && t.getTime() >= ctx.now.getTime() + ctx.minLeadMinutes * 60_000) {
      slot = { startsAt: t.toISOString(), time: hhmm(local.minutes) };
    }
  }

  const wantedPay = one(query.pay) as PaymentMethod | undefined;
  const pay = wantedPay && ctx.payMethods.includes(wantedPay) ? wantedPay : (ctx.payMethods[0] ?? null);

  const wantedStep = one(query.step);
  const ready = serviceIds.length > 0 && staffId !== null;
  let step: FlowStep = "services";
  if (ready && wantedStep === "confirm" && slot) step = "confirm";
  else if (ready && (wantedStep === "time" || wantedStep === "confirm")) step = "time";

  return { serviceIds, location, staffId, date, slot, step, pay };
}

// The query string that brings the flow back to `sel`. Holds no personal details.
export function flowQuery(sel: FlowSelection): string {
  const q = new URLSearchParams();
  if (sel.serviceIds.length) q.set("services", sel.serviceIds.join(","));
  if (sel.location === "home") q.set("loc", "home");
  if (sel.staffId) q.set("pro", sel.staffId);
  q.set("date", sel.date);
  if (sel.slot) q.set("at", sel.slot.startsAt);
  if (sel.pay) q.set("pay", sel.pay);
  q.set("step", sel.step);
  return q.toString();
}

// Checks the shape of a GET /api/availability answer before the flow trusts it.
export function isAvailability(body: unknown): body is AvailabilityResponse {
  if (!body || typeof body !== "object") return false;
  const b = body as Partial<AvailabilityResponse>;
  return (
    typeof b.kind === "string" &&
    ["ok", "closed", "too_long", "too_late", "full"].includes(b.kind) &&
    typeof b.date === "string" &&
    Array.isArray(b.slots) &&
    b.slots.every(s => s && typeof s.startsAt === "string" && typeof s.time === "string") &&
    (b.nextAvailable === null || typeof b.nextAvailable === "string")
  );
}

// The `error` text of an error answer, if it has one.
export function errorText(body: unknown): string | null {
  const e = body && typeof body === "object" ? (body as { error?: unknown }).error : null;
  return typeof e === "string" && e ? e : null;
}

// "Log in to book": the log-in page sends people back to `next` afterwards.
export function loginHref(slug: string, sel: FlowSelection): string {
  return `/login?next=${encodeURIComponent(`/book/${encodeURIComponent(slug)}?${flowQuery(sel)}`)}`;
}

// What a refused booking's error box offers next: another time (the slot or day was the
// problem), the customer's bookings (they hit an account limit), or nothing.
export function errorFix(result: { error: string; kind: string }): "time" | "bookings" | null {
  if (/upcoming bookings|a lot of bookings for one day/i.test(result.error)) return "bookings";
  if (result.kind === "conflict") return "time";
  if (/\b(time|times|slot)\b|opening hours|closed that day|earlier in the day|next \d+ days/i.test(result.error)) return "time";
  return null;
}
