"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { features } from "@/config/features";
import { getSessionUser } from "@/lib/auth";
import { data, isDataError } from "@/lib/data";
import { notifyBookingCancelled } from "@/lib/notify";
import { startPayment } from "@/lib/payments";
import { NETWORKS, networkOf } from "@/lib/phone";
import type { Booking, SessionUser } from "@/lib/types";
import { canCancel, canPayAgain, canReview } from "@/components/booking/labels";
import type { BookingPageResult } from "@/components/booking/types";
import { isMobileMoney } from "@/components/booking/validate";

const bookingId = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);

const field = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

type Loaded = { ok: true; user: SessionUser; booking: Booking } | { ok: false; error: string };

// The logged-in customer's own booking, or a reason why not. Venue owners can read their
// customers' bookings through data.getBooking, so ownership is checked here too.
async function ownBooking(raw: string): Promise<Loaded> {
  const id = bookingId.safeParse(raw);
  if (!id.success) return { ok: false, error: "We couldn't find that booking." };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You've been logged out. Log in again and try once more." };
  let booking: Booking | null;
  try {
    booking = await data.getBooking(id.data);
  } catch (e) {
    if (isDataError(e)) return { ok: false, error: e.message };
    throw e;
  }
  if (!booking || booking.customerId !== user.id) return { ok: false, error: "We couldn't find that booking." };
  return { ok: true, user, booking };
}

function refresh(booking: Booking) {
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${booking.id}`);
}

// "Pay now": starts the MoMo, Airtel or card payment again for a booking still waiting on it.
export async function payAgainAction(_prev: BookingPageResult, formData: FormData): Promise<BookingPageResult> {
  const loaded = await ownBooking(field(formData, "bookingId"));
  if (!loaded.ok) return { error: loaded.error };
  const { user, booking } = loaded;
  if (!canPayAgain(booking, new Date())) {
    return { error: "This booking isn't waiting for a payment any more. Refresh the page to see where it's at." };
  }
  const method = booking.paymentMethod;
  if (method === "cash") return { error: "Cash bookings are paid at the venue." };

  let url: string;
  try {
    let msisdn: string | null = null;
    if (isMobileMoney(method)) {
      // Prompt the number used last time, or the booking's phone if it's on the same network.
      const payments = await data.server.listPaymentsForBooking(booking.id);
      const last = [...payments]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .find(p => p.msisdn && networkOf(p.msisdn) === method)?.msisdn;
      msisdn = last ?? (networkOf(booking.customerPhone) === method ? booking.customerPhone : null);
      if (!msisdn) {
        return {
          error: `We don't have an ${NETWORKS[method].short} number for this booking. Cancel it and book again with the number you'd like to pay from.`,
        };
      }
    }
    url = await startPayment(booking, { method, msisdn, email: user.email });
  } catch (e) {
    if (isDataError(e)) return { error: e.message };
    console.error("payAgain failed", e);
    return { error: "We couldn't start the payment. Try again in a minute." };
  }
  refresh(booking);
  redirect(url);
}

export async function cancelBookingAction(_prev: BookingPageResult, formData: FormData): Promise<BookingPageResult> {
  const loaded = await ownBooking(field(formData, "bookingId"));
  if (!loaded.ok) return { error: loaded.error };
  const { booking } = loaded;
  if (!canCancel(booking, new Date())) {
    return { error: "This booking can't be cancelled any more. If something's wrong, call the venue." };
  }
  try {
    const cancelled = await data.cancelBooking(booking.id);
    await notifyBookingCancelled(cancelled, "customer");
  } catch (e) {
    if (isDataError(e)) return { error: e.message };
    console.error("cancelBooking failed", e);
    return { error: "We couldn't cancel that just now. Try again in a minute." };
  }
  refresh(booking);
  redirect(`/bookings/${booking.id}?cancelled=1`);
}

const reviewSchema = z.object({
  rating: z.string().regex(/^[1-5]$/, "Pick a star rating.").transform(Number),
  title: z.string().trim().min(1, "Give your review a title.").max(80, "Keep the title under 80 characters."),
  body: z.string().trim().min(1, "Tell people how it went.").max(600, "Keep it under 600 characters."),
});

export async function reviewBookingAction(_prev: BookingPageResult, formData: FormData): Promise<BookingPageResult> {
  if (!features.reviews) return { error: "Reviews are switched off right now." };
  const loaded = await ownBooking(field(formData, "bookingId"));
  if (!loaded.ok) return { error: loaded.error };
  const { booking } = loaded;
  if (!canReview(booking, features.reviews)) {
    return { error: booking.hasReview ? "You've already reviewed this booking." : "You can review a booking once it's completed." };
  }
  const parsed = reviewSchema.safeParse({
    rating: field(formData, "rating"),
    title: field(formData, "title"),
    body: field(formData, "body"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const name = issue?.path[0];
    return {
      error: issue?.message ?? "Check the review and try again.",
      field: name === "rating" || name === "title" || name === "body" ? name : undefined,
    };
  }
  try {
    await data.createReview({ bookingId: booking.id, ...parsed.data });
  } catch (e) {
    if (isDataError(e)) return { error: e.message };
    console.error("createReview failed", e);
    return { error: "We couldn't post your review just now. Try again in a minute." };
  }
  refresh(booking);
  revalidatePath(`/v/${booking.business.slug}`);
  redirect(`/bookings/${booking.id}?reviewed=1`);
}
