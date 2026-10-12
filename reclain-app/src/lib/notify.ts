import "server-only";
import type { Booking } from "./types";

// SMS messages about bookings. Placeholder: replaced by the notifications build.
// Every function here must never throw (a failed SMS must not break a booking).

export async function notifyBookingConfirmed(booking: Booking): Promise<void> {
  void booking;
}

export async function notifyBookingCancelled(booking: Booking, by: "customer" | "venue"): Promise<void> {
  void booking;
  void by;
}

export async function sendReminder(booking: Booking): Promise<boolean> {
  void booking;
  return false;
}
