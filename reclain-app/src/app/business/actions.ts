"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { features } from "@/config/features";
import { getSessionUser } from "@/lib/auth";
import { data, isDataError } from "@/lib/data";
import { notifyBookingCancelled } from "@/lib/notify";
import type { Booking, Business } from "@/lib/types";
import { BOOKING_OPS, missingSentence, OP_DONE, readiness, refusalReason, type BookingOp } from "@/components/dashboard/logic";
import { parseId } from "@/components/dashboard/schemas";
import type { FormResult } from "@/components/dashboard/types";
import { BUSINESS_COOKIE, BUSINESS_COOKIE_OPTIONS, ownedBusiness, refreshBusiness } from "./_lib/context";

// Pick which business the dashboard manages. Only your own businesses can be picked.
export async function switchBusinessAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/business");
  const id = parseId(formData.get("businessId"));
  if (id) {
    const mine = await data.getMyBusinesses().catch(() => []);
    if (mine.some(b => b.id === id)) (await cookies()).set(BUSINESS_COOKIE, id, BUSINESS_COOKIE_OPTIONS);
  }
  refreshBusiness();
}

// Draft -> waiting for review, once the basics are in place.
export async function submitForReviewAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const owned = await ownedBusiness(formData.get("businessId"));
  if (!owned.ok) return { message: owned.error };
  const { business } = owned;
  if (business.status !== "draft") return { message: "This business isn't a draft any more. Refresh the page to see where it's at." };
  const missing = missingSentence(readiness(business));
  if (missing) {
    return { message: `Nearly there. Before ${features.businessApproval ? "we can review it" : "you go live"}, ${missing}.` };
  }
  let updated: Business;
  try {
    updated = await data.submitBusinessForReview(business.id);
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("submitBusinessForReview failed", e);
    return { message: "We couldn't send it just now. Try again in a minute." };
  }
  // Going live changes the public pages too.
  refreshBusiness(updated.status === "published" ? updated.slug : undefined);
  return {
    ok: true,
    message: updated.status === "published" ? "You're live. Customers can find and book you now." : "Sent for review. We'll be in touch soon.",
  };
}

const opSchema = z.enum(BOOKING_OPS as [BookingOp, ...BookingOp[]]);

// Mark completed, no-show, cancel (and text the customer) or record a cash payment.
export async function bookingAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const id = parseId(formData.get("bookingId"));
  const op = opSchema.safeParse(formData.get("op"));
  if (!id || !op.success) return { message: "Something about that request looked off. Refresh the page and try again." };
  const user = await getSessionUser();
  if (!user) return { message: "You've been logged out. Log in again and try once more." };

  let updated: Booking;
  try {
    const [booking, mine] = await Promise.all([data.getBooking(id), data.getMyBusinesses()]);
    // getBooking also returns the person's own customer bookings, so check it's one of their venues.
    if (!booking || !mine.some(b => b.id === booking.businessId)) {
      return { message: "We couldn't find that booking on your business. Refresh the page and try again." };
    }
    const refused = refusalReason(op.data, booking, new Date());
    if (refused) return { message: refused };
    updated = await apply(op.data, booking.id);
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("bookingAction failed", e);
    return { message: "We couldn't update that booking just now. Try again in a minute." };
  }
  // Never throws: a failed SMS mustn't undo the cancellation.
  if (op.data === "cancel") await notifyBookingCancelled(updated, "venue");
  refreshBusiness();
  // The customer's own pages show the new status too.
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${updated.id}`);
  const message = op.data === "cancel" && !features.smsConfirmations ? "Booking cancelled." : OP_DONE[op.data];
  return { ok: true, message };
}

function apply(op: BookingOp, id: string): Promise<Booking> {
  switch (op) {
    case "complete":
      return data.setBookingStatus(id, "completed");
    case "no_show":
      return data.setBookingStatus(id, "no_show");
    case "cancel":
      return data.cancelBooking(id);
    case "cash_paid":
      return data.markCashPaid(id);
  }
}
