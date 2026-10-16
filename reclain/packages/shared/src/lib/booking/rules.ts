// Booking rules shared by the screens, the API and demo mode.
// The database enforces the same rules in create_booking() (supabase/migrations).

import type { BookingLocation, BusyResource, BusySlot, Service, VisitMode } from "../types";
import { addDays, hhmm, localParts, parseHHMM, toInstant, weekdayOf } from "../time";
import { checkWindow, type ResourceNeed } from "../capacity/plan";

export const MIN_BLOCK_MINUTES = 30;

// Where the service happens, given what the venue offers.
export function effectiveLocation(visitMode: VisitMode, requested: BookingLocation): BookingLocation {
  if (visitMode === "mobile") return "home";
  if (visitMode === "salon") return "venue";
  return requested;
}

export interface PriceBreakdown {
  subtotal: number;
  homeFee: number;
  total: number;
  durationMin: number; // sum of service durations
  blockMin: number; // how long the slot is held (at least 30 minutes)
}

export function priceBooking(
  business: { visitMode: VisitMode; homeVisitFee: number },
  services: Pick<Service, "price" | "durationMin">[],
  location: BookingLocation,
): PriceBreakdown {
  const subtotal = services.reduce((s, x) => s + x.price, 0);
  const durationMin = services.reduce((s, x) => s + x.durationMin, 0);
  const loc = effectiveLocation(business.visitMode, location);
  const homeFee = business.visitMode === "both" && loc === "home" ? business.homeVisitFee : 0;
  return { subtotal, homeFee, total: subtotal + homeFee, durationMin, blockMin: Math.max(durationMin, MIN_BLOCK_MINUTES) };
}

// The latest allowed start (minutes after midnight) across the chosen services, or null.
export function latestStart(services: Pick<Service, "latestStart">[]): number | null {
  const limits = services.map(s => s.latestStart).filter((x): x is string => !!x).map(parseHHMM);
  return limits.length ? Math.min(...limits) : null;
}

export interface Slot {
  minutes: number; // local minutes after midnight
  time: string; // "10:30"
  startsAt: string; // ISO instant
  staffIds: string[]; // professionals free at this time
}

export interface SlotInput {
  date: string; // local "YYYY-MM-DD"
  opensAt: string; // "08:00"
  closesAt: string; // "20:00"
  closedDays: number[];
  blockMin: number;
  latestStartMin?: number | null;
  staffIds: string[]; // who may take it: one id for a chosen pro, everyone for "any"
  busy: BusySlot[];
  // Crew and equipment (see lib/capacity). Left out, a slot needs one free professional.
  teamIds?: string[]; // everyone who could be crew, when a job needs more than one person
  peopleNeeded?: number;
  resources?: ResourceNeed[];
  busyResources?: BusyResource[];
  now?: Date;
  stepMin?: number;
  minLeadMin?: number;
}

export type SlotsResult =
  | { kind: "ok"; slots: Slot[] }
  | { kind: "closed" }
  | { kind: "too_long" } // the services take longer than the venue is open
  | { kind: "too_late" } // today, and the last start time has passed
  | { kind: "full" }; // open, but every slot is taken

export function availableSlots(input: SlotInput): SlotsResult {
  const now = input.now ?? new Date();
  const step = input.stepMin ?? 30;
  const lead = input.minLeadMin ?? 60;
  if (input.closedDays.includes(weekdayOf(input.date))) return { kind: "closed" };
  const open = parseHHMM(input.opensAt);
  const close = parseHHMM(input.closesAt);
  if (input.blockMin > close - open) return { kind: "too_long" };

  const earliest = now.getTime() + lead * 60_000;
  const lastStart = Math.min(close - input.blockMin, input.latestStartMin ?? Infinity);

  const slots: Slot[] = [];
  let anyFuture = false;
  for (let t = open; t <= lastStart; t += step) {
    const start = toInstant(input.date, t);
    if (start.getTime() < earliest) continue;
    anyFuture = true;
    const end = start.getTime() + input.blockMin * 60_000;
    // Enough free people (the lead plus crew) and enough free equipment.
    const check = checkWindow({
      start: start.getTime(),
      end,
      staffIds: input.staffIds,
      teamIds: input.teamIds,
      peopleNeeded: input.peopleNeeded,
      resources: input.resources,
      busy: input.busy,
      busyResources: input.busyResources,
    });
    if (check.free) slots.push({ minutes: t, time: hhmm(t), startsAt: start.toISOString(), staffIds: check.leadIds });
  }
  if (slots.length) return { kind: "ok", slots };
  return anyFuture ? { kind: "full" } : { kind: "too_late" };
}

// The local dates customers can pick from, starting today.
export function bookableDates(days: number, now: Date = new Date()): string[] {
  const today = localParts(now).date;
  return Array.from({ length: days }, (_, i) => addDays(today, i));
}
