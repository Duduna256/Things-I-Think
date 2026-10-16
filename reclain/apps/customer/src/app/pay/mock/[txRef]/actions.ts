"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@shared/lib/auth";
import { data, isDataError } from "@shared/lib/data";
import { activePaymentProvider } from "@/lib/payments";
import { bookingPathFor, describe, settle, txRefSchema, type SettleOutcome } from "@/app/api/payments/settle";
import { refreshBookingPages, settleDeps } from "@/app/api/payments/server";
import type { MockPromptState } from "./prompt";

const schema = z.object({
  txRef: txRefSchema,
  decision: z.enum(["approve", "decline"]),
});

const NOT_YOURS = "We couldn't find that payment on your account. Check you're logged in as the person who booked.";

// Approve or Decline on the pretend phone prompt (PAYMENT_PROVIDER=mock only). It plays the
// part of the customer's phone: the result is recorded for the payment's own amount, exactly
// as a real provider's answer would be, then the customer lands on their booking.
export async function answerMockPrompt(_prev: MockPromptState, formData: FormData): Promise<MockPromptState> {
  if (activePaymentProvider() !== "mock") {
    return { error: "Test payments are switched off on this site, so this prompt can't be used. Go back to your booking to pay." };
  }
  const parsed = schema.safeParse({ txRef: formData.get("txRef"), decision: formData.get("decision") });
  if (!parsed.success) {
    return { error: "That prompt didn't come through properly. Go back to your booking and press Pay now for a fresh one." };
  }
  const { txRef, decision } = parsed.data;

  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/pay/mock/${txRef}`)}`);

  let outcome: SettleOutcome;
  try {
    const payment = await data.server.getPaymentByTxRef(txRef);
    if (!payment || payment.provider !== "mock") return { error: NOT_YOURS };
    const booking = await data.getBooking(payment.bookingId);
    if (!booking || booking.customerId !== user.id) return { error: NOT_YOURS };

    if (payment.status !== "pending") {
      // Already answered (a second tap, or another tab): show where things stand.
      outcome = describe(booking, false);
    } else if (booking.status !== "pending_payment") {
      return { error: "This booking isn't waiting for a payment any more. Go back to your booking to see where it's at." };
    } else {
      outcome = await settle(
        txRef,
        settleDeps({
          verify: async p => ({
            txRef: p.txRef,
            status: decision === "approve" ? "paid" : "failed",
            amount: p.amount,
            providerRef: p.providerRef,
            raw: { mock: true, decision, answeredAt: new Date().toISOString() },
          }),
        }),
        { provider: "mock" },
      );
    }
  } catch (e) {
    if (isDataError(e)) return { error: e.message };
    console.error("[payments] mock prompt failed", e);
    return { error: "We couldn't record that just now. Try again in a moment." };
  }

  if (outcome.kind !== "unknown") refreshBookingPages(outcome.booking);
  redirect(bookingPathFor(outcome));
}
