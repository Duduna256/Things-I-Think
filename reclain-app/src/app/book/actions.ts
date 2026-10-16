"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { features } from "@/config/features";
import { site } from "@/config/site";
import { getSessionUser } from "@/lib/auth";
import { data, isDataError } from "@/lib/data";
import { notifyBookingConfirmed } from "@/lib/notify";
import { onlinePaymentsReady, startPayment } from "@/lib/payments";
import { bookableDates } from "@/lib/booking/rules";
import { normalizeMsisdn } from "@/lib/phone";
import { localParts } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { dayRange, planFor, slotsFor } from "@/app/api/availability/plan";
import { allowedLocation, payMethodsFor } from "@/components/booking/flow-state";
import type { BookingActionResult } from "@/components/booking/types";
import { detailErrors, firstError, isMobileMoney, momoSource } from "@/components/booking/validate";

const text = (max: number) => z.string().max(max);

const schema = z.object({
  slug: z.string().trim().min(1).max(100),
  serviceIds: z
    .string()
    .max(2000)
    .transform(s => [...new Set(s.split(",").map(x => x.trim()).filter(Boolean))])
    .pipe(z.array(z.string().max(100)).min(1).max(20)),
  staffId: text(100),
  startsAt: z.iso.datetime({ offset: true }),
  location: z.enum(["venue", "home"]),
  name: text(200),
  phone: text(40),
  address: text(300),
  notes: text(2000),
  pay: z.enum(["mtn", "airtel", "card", "cash"]),
  momo: text(40),
});

const field = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

// Creates a booking from the confirm step, then sends the customer on: to their booking
// (cash) or to the payment step (MTN MoMo, Airtel Money, card). Prices come from the
// database, never from this form.
export async function createBookingAction(_prev: BookingActionResult, formData: FormData): Promise<BookingActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "You've been logged out. Log in again and we'll keep your services and time.", kind: "auth" };

  const parsed = schema.safeParse({
    slug: field(formData, "slug"),
    serviceIds: field(formData, "serviceIds"),
    staffId: field(formData, "staffId"),
    startsAt: field(formData, "startsAt"),
    location: field(formData, "location"),
    name: field(formData, "name"),
    phone: field(formData, "phone"),
    address: field(formData, "address"),
    notes: field(formData, "notes"),
    pay: field(formData, "pay"),
    momo: field(formData, "momo"),
  });
  if (!parsed.success) {
    return { error: "Something in the form didn't look right. Check your details and the time, then try again.", kind: "validation" };
  }
  const input = parsed.data;

  let booking: Booking;
  try {
    const venue = await data.getBusinessBySlug(input.slug);
    if (!venue) return { error: "This venue isn't taking bookings right now.", kind: "not_found" };

    const online = onlinePaymentsReady();
    const offered = payMethodsFor(
      { ...features, mobileMoney: features.mobileMoney && online, cardPayments: features.cardPayments && online },
      venue.acceptsCash,
    );
    if (!offered.includes(input.pay)) {
      return {
        error: input.pay === "cash" ? "This venue doesn't take cash. Pick mobile money or card." : "That payment method isn't available. Pick another one.",
        kind: "validation",
        field: "pay",
      };
    }

    const location = allowedLocation(venue.visitMode, input.location, features.homeVisits);
    const errors = detailErrors({
      name: input.name,
      phone: input.phone,
      address: input.address,
      momo: input.momo,
      pay: input.pay,
      needsAddress: location === "home",
      isLaundry: venue.categoryId === "laundry",
    });
    const bad = firstError(errors);
    if (bad) return { error: errors[bad]!, kind: "validation", field: bad };

    // The time must be one the flow offers: on the slot grid, after the lead time, before any
    // cut-off and with someone free. The database still has the final say on clashes.
    const staffId = venue.skipProfessional || !input.staffId || input.staffId === "any" ? null : input.staffId;
    const planned = planFor(venue, input.serviceIds, staffId ?? "any");
    if (!planned.ok) return { error: planned.error, kind: "invalid" };
    const now = new Date();
    const startsAt = new Date(input.startsAt).toISOString();
    const day = localParts(startsAt).date;
    if (!bookableDates(site.bookingWindowDays, now).includes(day)) {
      return { error: `Pick a day in the next ${site.bookingWindowDays} days.`, kind: "invalid" };
    }
    const range = dayRange(day);
    const busy = await data.getBusySlots(venue.id, range.fromIso, range.toIso);
    // The grace matches create_booking(): a slot that was offered stays bookable while the
    // customer fills in their details.
    const minLeadMin = Math.max(site.minLeadMinutes - site.leadGraceMinutes, 0);
    const free = slotsFor(planned.plan, day, busy, { now, stepMin: site.slotStepMinutes, minLeadMin });
    if (free.kind !== "ok" || !free.slots.some(s => s.startsAt === startsAt)) {
      return { error: "That time has just gone. Pick another one.", kind: "conflict" };
    }

    const phone = normalizeMsisdn(input.phone)!;
    const name = input.name.trim().slice(0, 80);
    booking = await data.createBooking({
      businessId: venue.id,
      serviceIds: input.serviceIds,
      staffId,
      startsAt,
      location,
      address: location === "home" ? input.address.trim().slice(0, 200) : "",
      notes: input.notes.trim().slice(0, 500),
      customerName: name,
      customerPhone: phone,
      paymentMethod: input.pay,
    });

    // First booking: remember the name and number so the next one is already filled in.
    if (!user.fullName?.trim() || !user.phone) {
      await data.updateMyProfile({ fullName: user.fullName?.trim() || name, phone: user.phone || phone }).catch(() => undefined);
    }
  } catch (e) {
    if (isDataError(e)) return { error: e.message, kind: e.kind };
    console.error("createBooking failed", e);
    return { error: "We couldn't save your booking. Try again in a minute.", kind: "unavailable" };
  }

  revalidatePath("/bookings");

  let next: string;
  // Cash, and free bookings (nothing to pay), are confirmed straight away.
  const method = booking.paymentMethod;
  if (booking.status === "confirmed" || method === "cash") {
    await notifyBookingConfirmed(booking);
    next = `/bookings/${booking.id}?new=1`;
  } else {
    const msisdn = isMobileMoney(method) ? normalizeMsisdn(momoSource(input)) : null;
    try {
      next = await startPayment(booking, { method, msisdn, email: user.email });
    } catch (e) {
      // The booking exists and holds the slot; the booking page offers "Pay now".
      console.error("startPayment failed", e);
      next = `/bookings/${booking.id}?failed=1`;
    }
  }
  redirect(next);
}
