import "server-only";
import { revalidatePath } from "next/cache";
import { data, DataError } from "@shared/lib/data";
import { notifyBookingConfirmed } from "@shared/lib/notify";
import { getProviderByName, startPayment } from "@/lib/payments";
import { normalizeMsisdn } from "@shared/lib/phone";
import { FlutterwaveError, isTransactionNotFound } from "@/lib/payments/providers/flutterwave";
import type { Booking, Payment } from "@shared/lib/types";
import { bookingPathFor, settle, type SettleDeps, type SettleOutcome } from "./settle";

// The real data layer behind settle(). verify() asks the provider that took the payment.
export function settleDeps(overrides: Partial<SettleDeps> = {}): SettleDeps {
  return {
    getPayment: txRef => data.server.getPaymentByTxRef(txRef),
    getBooking: id => data.server.getBooking(id),
    async verify(payment: Payment) {
      const provider = await getProviderByName(payment.provider);
      if (!provider) throw new Error(`No payment provider called "${payment.provider}" for ${payment.txRef}`);
      try {
        return await provider.verify(payment.txRef, payment.providerRef);
      } catch (e) {
        if (isTransactionNotFound(e)) return null;
        throw e;
      }
    },
    isMismatch: e => e instanceof FlutterwaveError && e.code === "mismatch",
    apply: input => data.server.applyPaymentResult(input),
    // notify.ts sends after the response, so this returns straight away.
    notifyConfirmed: booking => notifyBookingConfirmed(booking),
    log: (message, detail) => console.warn(`[payments] ${message}`, detail ?? ""),
    ...overrides,
  };
}

// Asks the provider about a payment and records the answer.
export function settleWithProvider(txRef: string, opts: { provider?: string } = {}): Promise<SettleOutcome> {
  return settle(txRef, settleDeps(), opts);
}

// The customer's booking pages and the venue's dashboard show payment state: refresh them.
export function refreshBookingPages(booking: Pick<Booking, "id"> | null | undefined) {
  try {
    revalidatePath("/bookings");
    if (booking) revalidatePath(`/bookings/${booking.id}`);
  } catch (e) {
    console.warn("[payments] revalidatePath failed", e);
  }
}

// "Pay now" on a booking that's still waiting for its money. Before starting a fresh payment,
// ask the provider about the open ones: one may already have gone through (its webhook is just
// late), or still be in progress. Either way the customer goes there instead of paying twice.
// Returns where to send the customer.
export async function payAgain(
  booking: Booking,
  opts: { method: Exclude<Payment["method"], "cash">; msisdn: string | null; email: string | null },
): Promise<string> {
  const open = (await data.server.listPaymentsForBooking(booking.id)).filter(p => p.status === "pending").slice(0, 3);
  // Payments whose provider answer didn't add up (wrong amount, currency or reference). They're
  // logged for a person to check; they must never be reused or re-checked in a loop.
  const doubtful = new Set<string>();
  for (const p of open) {
    let outcome: SettleOutcome;
    try {
      outcome = await settleWithProvider(p.txRef);
    } catch (e) {
      console.error(`[payments] payAgain: couldn't check ${p.txRef}`, e);
      throw new DataError("unavailable", "We couldn't check on your last payment just now. Try again in a minute.");
    }
    if (outcome.kind === "rejected") {
      doubtful.add(p.txRef);
      continue;
    }
    if (outcome.kind === "paid" || outcome.kind === "paid_late") {
      refreshBookingPages(outcome.booking);
      return bookingPathFor(outcome);
    }
  }

  // Still open with the provider (the prompt is out, or the checkout page is still valid):
  // send the customer back to it rather than starting a second payment.
  const msisdn = opts.method === "card" ? null : (normalizeMsisdn(opts.msisdn) ?? normalizeMsisdn(booking.customerPhone));
  const reusable = (await data.server.listPaymentsForBooking(booking.id)).find(
    p => p.status === "pending" && !doubtful.has(p.txRef) && p.method === opts.method && (p.msisdn ?? null) === msisdn && p.checkoutUrl,
  );
  if (reusable?.checkoutUrl) return reusable.checkoutUrl;

  return startPayment(booking, opts);
}
