// GET /api/availability?business=<slug>&date=YYYY-MM-DD&services=<id,id>&staff=<id|any>
// Free start times for one Kampala day, worked out from opening hours, closed days, the team,
// the equipment the services use and existing bookings (the people and units they hold). When
// the day has none, it also says which day next has some.
// Public (people pick a time before logging in) and never cached.

import { NextResponse, type NextRequest } from "next/server";
import { site } from "@shared/config/site";
import { data, isDataError } from "@shared/lib/data";
import { bookableDates } from "@shared/lib/booking/rules";
import type { BusyResource, BusySlot } from "@shared/lib/types";
import { dayRange, laterDates, nextAvailableDate, planFor, querySchema, slotsFor, toResponse, worthSearching } from "./plan";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    business: sp.get("business") ?? "",
    date: sp.get("date") ?? "",
    services: sp.get("services") ?? "",
    staff: sp.get("staff") || undefined,
  });
  if (!parsed.success) return json({ error: "Pick a venue, a date and at least one service." }, 400);
  const q = parsed.data;

  try {
    const venue = await data.getBusinessBySlug(q.business);
    if (!venue) return json({ error: "We couldn't find that venue. It may have stopped taking bookings." }, 404);

    const now = new Date();
    const bookable = bookableDates(site.bookingWindowDays, now);
    const needs = await data.capacity.getServiceNeeds(venue.id, q.services);
    const planned = planFor(venue, q.services, q.staff, needs);
    if (!planned.ok) return json({ error: planned.error }, 400);
    const plan = planned.plan;
    const opts = { now, stepMin: site.slotStepMinutes, minLeadMin: site.minLeadMinutes };

    // What's taken over a stretch of days: the people on each booking (lead and crew) and, when
    // the services use equipment, the units each booking has reserved. One query per stretch.
    const taken = async (from: string, to: string): Promise<{ busy: BusySlot[]; busyResources: BusyResource[] }> => {
      const { fromIso } = dayRange(from);
      const { toIso } = dayRange(to);
      const [busy, busyResources] = await Promise.all([
        data.getBusySlots(venue.id, fromIso, toIso),
        plan.resources.length ? data.capacity.getBusyResources(venue.id, fromIso, toIso) : Promise.resolve([]),
      ]);
      return { busy, busyResources };
    };

    // A day that has just gone (the page was left open past midnight): answer like a day whose
    // last start has passed, so the flow offers the next free day instead of a dead end.
    if (q.date < bookable[0]) {
      const t = await taken(bookable[0], bookable[bookable.length - 1]);
      return json(toResponse(q.date, { kind: "too_late" }, nextAvailableDate(plan, bookable, t.busy, opts, t.busyResources)));
    }
    if (!bookable.includes(q.date)) {
      return json({ error: `Pick a day in the next ${site.bookingWindowDays} days.` }, 400);
    }

    const today = await taken(q.date, q.date);
    const result = slotsFor(plan, q.date, today.busy, opts, today.busyResources);

    let nextAvailable: string | null = null;
    if (worthSearching(result)) {
      const candidates = laterDates(q.date, bookable);
      if (candidates.length) {
        const later = await taken(candidates[0], candidates[candidates.length - 1]);
        nextAvailable = nextAvailableDate(plan, candidates, later.busy, opts, later.busyResources);
      }
    }
    return json(toResponse(q.date, result, nextAvailable));
  } catch (e) {
    if (isDataError(e)) return json({ error: e.message }, e.kind === "not_found" ? 404 : 503);
    console.error("availability failed", e);
    return json({ error: "We couldn't load free times just now. Try again in a moment." }, 500);
  }
}
