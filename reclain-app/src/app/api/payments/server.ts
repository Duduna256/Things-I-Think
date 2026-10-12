import "server-only";
import { revalidatePath } from "next/cache";
import { data } from "@/lib/data";
import { notifyBookingConfirmed } from "@/lib/notify";
import { getProviderByName } from "@/lib/payments";
import { isTransactionNotFound } from "@/lib/payments/providers/flutterwave";
import type { Booking, Payment } from "@/lib/types";
import { createClaims, settle, type SettleDeps, type SettleOutcome } from "./settle";

// One claim list per server process, kept across hot reloads in development.
const g = globalThis as unknown as { __reclainPaymentClaims?: (key: string) => boolean };
const claim = (g.__reclainPaymentClaims ??= createClaims());

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
    apply: input => data.server.applyPaymentResult(input),
    // notify.ts sends after the response, so this returns straight away.
    notifyConfirmed: booking => notifyBookingConfirmed(booking),
    claim,
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
    revalidatePath("/business", "layout");
  } catch (e) {
    console.warn("[payments] revalidatePath failed", e);
  }
}
