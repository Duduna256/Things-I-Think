// "Can I take this job?": the slot checker's thinking, kept pure so it's unit-tested.
// The page loads the venue, what the services need and what's already booked; this turns that
// into a verdict for every start time of the day, and the next free start when the day is full.

import { latestStart, priceBooking } from "@shared/lib/booking/rules";
import { checkDay, combineNeeds, nextFreeStart, type ResourceNeed, type SlotCheck } from "@shared/lib/capacity/plan";
import { duration, plural } from "@shared/lib/format";
import { addDays, formatDate } from "@shared/lib/time";
import type { BusinessDetail, BusyResource, BusySlot, ServiceNeed } from "@shared/lib/types";

export interface CheckerInput {
  venue: Pick<BusinessDetail, "visitMode" | "homeVisitFee" | "opensAt" | "closesAt" | "closedDays" | "services" | "staff">;
  serviceIds: string[];
  needs: ServiceNeed[]; // for at least the chosen services
  date: string;
  busy: BusySlot[]; // from the chosen day to the end of the search
  busyResources: BusyResource[];
  now: Date;
  stepMin: number;
  searchDays: number; // how far past the day to look for the next free start
}

export type CheckerReport =
  | { kind: "closed"; needsText: string; weekday: string }
  | { kind: "too_long"; needsText: string; takes: string }
  | { kind: "ok"; needsText: string; slots: SlotCheck[]; freeCount: number; nextFree: { date: string; time: string } | null };

// "2 people · 1 patrol car · 4 two-way radios", or "1 person" when the job takes nothing special.
export function needsSentence(peopleNeeded: number, resources: ResourceNeed[]): string {
  const parts = [peopleNeeded === 1 ? "1 person" : `${peopleNeeded} people`];
  for (const r of resources) parts.push(plural(r.needed, r.name.toLowerCase()));
  return parts.join(" · ");
}

export function runChecker(input: CheckerInput): CheckerReport {
  const services = input.serviceIds.map(id => input.venue.services.find(s => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
  const { blockMin, durationMin } = priceBooking(input.venue, services, "venue");
  const combined = combineNeeds(input.needs.filter(n => input.serviceIds.includes(n.serviceId)));
  const peopleNeeded = Math.max(combined.peopleNeeded, ...services.map(s => s.peopleNeeded));
  const needsText = needsSentence(peopleNeeded, combined.resources);
  const team = input.venue.staff.filter(s => s.active).map(s => s.id);

  const common = {
    opensAt: input.venue.opensAt,
    closesAt: input.venue.closesAt,
    closedDays: input.venue.closedDays,
    blockMin,
    latestStartMin: latestStart(services),
    staffIds: team,
    teamIds: team,
    peopleNeeded,
    resources: combined.resources,
    busy: input.busy,
    busyResources: input.busyResources,
    now: input.now,
    stepMin: input.stepMin,
  };
  const day = checkDay({ ...common, date: input.date });
  if (day.kind === "closed") return { kind: "closed", needsText, weekday: formatDate(input.date).split(" ")[0] };
  if (day.kind === "too_long") return { kind: "too_long", needsText, takes: duration(durationMin) };

  const freeCount = day.slots.filter(s => s.free).length;
  let nextFree: { date: string; time: string } | null = null;
  if (!freeCount) {
    const later = Array.from({ length: input.searchDays }, (_, i) => addDays(input.date, i + 1));
    const found = nextFreeStart(later, common);
    if (found) nextFree = { date: found.date, time: found.slot.time };
  }
  return { kind: "ok", needsText, slots: day.slots, freeCount, nextFree };
}
