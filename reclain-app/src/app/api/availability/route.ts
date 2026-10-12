// GET /api/availability?business=<slug>&date=YYYY-MM-DD&services=<id,id>&staff=<id|any>
// Free start times for one Kampala day, worked out from opening hours, closed days, the team
// and existing bookings. When the day has none, it also says which day next has some.
// Public (people pick a time before logging in) and never cached.

import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/config/site";
import { data, isDataError } from "@/lib/data";
import { bookableDates } from "@/lib/booking/rules";
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
    if (!bookable.includes(q.date)) {
      return json({ error: `Pick a day in the next ${site.bookingWindowDays} days.` }, 400);
    }

    const planned = planFor(venue, q.services, q.staff);
    if (!planned.ok) return json({ error: planned.error }, 400);
    const opts = { now, stepMin: site.slotStepMinutes, minLeadMin: site.minLeadMinutes };

    const day = dayRange(q.date);
    const busy = await data.getBusySlots(venue.id, day.fromIso, day.toIso);
    const result = slotsFor(planned.plan, q.date, busy, opts);

    let nextAvailable: string | null = null;
    if (worthSearching(result)) {
      const candidates = laterDates(q.date, bookable);
      if (candidates.length) {
        // One query for the whole stretch instead of one per day.
        const later = await data.getBusySlots(venue.id, dayRange(candidates[0]).fromIso, dayRange(candidates[candidates.length - 1]).toIso);
        nextAvailable = nextAvailableDate(planned.plan, candidates, later, opts);
      }
    }
    return json(toResponse(q.date, result, nextAvailable));
  } catch (e) {
    if (isDataError(e)) return json({ error: e.message }, e.kind === "not_found" ? 404 : 503);
    console.error("availability failed", e);
    return json({ error: "We couldn't load free times just now. Try again in a moment." }, 500);
  }
}
