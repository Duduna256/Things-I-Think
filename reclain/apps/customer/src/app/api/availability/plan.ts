// The thinking behind GET /api/availability, kept pure so it can be tested without a server.
// route.ts does the I/O (load the venue, fetch busy times) and calls these.

import { z } from "zod";
import { availableSlots, latestStart, priceBooking, type SlotsResult } from "@shared/lib/booking/rules";
import { combineNeeds, type ResourceNeed } from "@shared/lib/capacity/plan";
import { addDays, toInstant } from "@shared/lib/time";
import type { BusinessDetail, BusyResource, BusySlot, ServiceNeed } from "@shared/lib/types";
import type { AvailabilityResponse } from "../../../components/booking/types";

export const NEXT_AVAILABLE_DAYS = 21;

export const querySchema = z.object({
  business: z.string().trim().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  services: z
    .string()
    .max(2000)
    .transform(s => [...new Set(s.split(",").map(x => x.trim()).filter(Boolean))])
    .pipe(z.array(z.string().max(100)).min(1).max(20)),
  staff: z.string().trim().min(1).max(100).default("any"),
});

export type AvailabilityQuery = z.infer<typeof querySchema>;

export interface SlotPlan {
  opensAt: string;
  closesAt: string;
  closedDays: number[];
  blockMin: number;
  latestStartMin: number | null;
  staffIds: string[]; // who may lead: the chosen professional, or everyone
  // Crew and equipment (see lib/capacity): everyone who could be on the job, how many people
  // the services need, and the units of each resource they use.
  teamIds: string[];
  peopleNeeded: number;
  resources: ResourceNeed[];
}

type PlanResult = { ok: true; plan: SlotPlan } | { ok: false; error: string };

// Checks the services and professional against the venue and works out how long to hold, how
// many people the job takes and what equipment it uses. `needs` comes from getServiceNeeds;
// without it only the people count is known (the venue's services carry it).
export function planFor(
  venue: Pick<BusinessDetail, "visitMode" | "homeVisitFee" | "opensAt" | "closesAt" | "closedDays" | "services" | "staff">,
  serviceIds: string[],
  staff: string,
  needs: ServiceNeed[] = [],
): PlanResult {
  const chosen = serviceIds.map(id => venue.services.find(s => s.id === id));
  if (!chosen.length || chosen.some(s => !s)) {
    return { ok: false, error: "One of those services isn't on this venue's menu any more. Go back and pick again." };
  }
  const services = chosen.filter((s): s is NonNullable<typeof s> => !!s);
  let staffIds: string[];
  if (staff === "any") staffIds = venue.staff.map(s => s.id);
  else if (venue.staff.some(s => s.id === staff)) staffIds = [staff];
  else return { ok: false, error: "That professional isn't taking bookings here. Pick someone else." };

  // Where it happens changes the price, not how long the slot is held.
  const { blockMin } = priceBooking(venue, services, "venue");
  const combined = combineNeeds(needs.filter(n => serviceIds.includes(n.serviceId)));
  return {
    ok: true,
    plan: {
      opensAt: venue.opensAt,
      closesAt: venue.closesAt,
      closedDays: venue.closedDays,
      blockMin,
      latestStartMin: latestStart(services),
      staffIds,
      teamIds: venue.staff.map(s => s.id),
      peopleNeeded: Math.max(combined.peopleNeeded, ...services.map(s => s.peopleNeeded)),
      resources: combined.resources,
    },
  };
}

// One Kampala day as a UTC range, for getBusySlots.
export function dayRange(date: string): { fromIso: string; toIso: string } {
  return { fromIso: toInstant(date, 0).toISOString(), toIso: toInstant(addDays(date, 1), 0).toISOString() };
}

export interface SlotOptions {
  now: Date;
  stepMin: number;
  minLeadMin: number;
}

export function slotsFor(plan: SlotPlan, date: string, busy: BusySlot[], opts: SlotOptions, busyResources: BusyResource[] = []): SlotsResult {
  return availableSlots({
    date,
    opensAt: plan.opensAt,
    closesAt: plan.closesAt,
    closedDays: plan.closedDays,
    blockMin: plan.blockMin,
    latestStartMin: plan.latestStartMin,
    staffIds: plan.staffIds,
    teamIds: plan.teamIds,
    peopleNeeded: plan.peopleNeeded,
    resources: plan.resources,
    busy,
    busyResources,
    now: opts.now,
    stepMin: opts.stepMin,
    minLeadMin: opts.minLeadMin,
  });
}

// The days worth searching after `date`: up to 21 days ahead, and only ones people can book.
export function laterDates(date: string, bookable: string[], maxDays = NEXT_AVAILABLE_DAYS): string[] {
  const last = addDays(date, maxDays);
  return bookable.filter(d => d > date && d <= last);
}

// Whether looking further ahead can help. Too long today means too long every day.
export function worthSearching(result: SlotsResult): boolean {
  return result.kind === "closed" || result.kind === "full" || result.kind === "too_late";
}

export function nextAvailableDate(plan: SlotPlan, candidates: string[], busy: BusySlot[], opts: SlotOptions, busyResources: BusyResource[] = []): string | null {
  for (const d of candidates) {
    if (slotsFor(plan, d, busy, opts, busyResources).kind === "ok") return d;
  }
  return null;
}

export function toResponse(date: string, result: SlotsResult, nextAvailable: string | null): AvailabilityResponse {
  if (result.kind === "ok") {
    return {
      kind: "ok",
      date,
      slots: result.slots.map(s => ({ time: s.time, startsAt: s.startsAt, staffIds: s.staffIds })),
      nextAvailable: null,
    };
  }
  return { kind: result.kind, date, slots: [], nextAvailable };
}
