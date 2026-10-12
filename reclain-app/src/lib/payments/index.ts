import "server-only";
import { randomUUID } from "node:crypto";
import { site } from "../../config/site";
import { serverEnv } from "../env";
import { data, DataError } from "../data";
import { normalizeMsisdn } from "../phone";
import type { Booking } from "../types";
import { mockProvider } from "./providers/mock";
import type { OnlineMethod, PaymentProvider } from "./types";

// Pick the provider with PAYMENT_PROVIDER in .env.local / Vercel ("mock" or "flutterwave").
const providers: Record<string, () => Promise<PaymentProvider>> = {
  mock: async () => mockProvider,
  flutterwave: async () => (await import("./providers/flutterwave")).flutterwaveProvider,
};

export async function getPaymentProvider(): Promise<PaymentProvider> {
  const load = providers[serverEnv.paymentProvider] ?? providers.mock;
  return load();
}

// The provider that took a particular payment (payments.provider). Verifying with the provider
// that made the payment keeps old payments checkable after PAYMENT_PROVIDER changes.
export async function getProviderByName(name: string): Promise<PaymentProvider | null> {
  const load = providers[name];
  return load ? load() : null;
}

export function newTxRef(booking: Booking): string {
  return `${booking.ref}-${randomUUID().slice(0, 8)}`;
}

// Where Flutterwave sends the customer after checkout. That route checks with Flutterwave
// before believing anything, then forwards to the booking page. The mock provider ignores it.
export const PAYMENT_RETURN_PATH = "/api/payments/return";

// Starts a MoMo, Airtel or card payment for a booking and records it.
// Returns the URL to send the customer to.
export async function startPayment(booking: Booking, opts: { method: OnlineMethod; msisdn: string | null; email: string | null }): Promise<string> {
  if (booking.status !== "pending_payment" || booking.paymentStatus === "paid") {
    throw new DataError("invalid", "This booking isn't waiting for a payment any more. Refresh the page to see where it's at.");
  }
  if (!Number.isInteger(booking.total) || booking.total <= 0) {
    throw new DataError("invalid", "This booking has nothing to pay.");
  }
  // The number to send the MoMo or Airtel prompt to, as 9 digits. Card payments don't need one.
  const msisdn = opts.method === "card" ? null : (normalizeMsisdn(opts.msisdn) ?? normalizeMsisdn(booking.customerPhone));

  const provider = await getPaymentProvider();
  const txRef = newTxRef(booking);
  const result = await provider.start({
    booking,
    method: opts.method,
    msisdn,
    email: opts.email,
    txRef,
    redirectUrl: `${site.url}${PAYMENT_RETURN_PATH}`,
  });
  await data.server.createPayment({
    bookingId: booking.id,
    provider: provider.name,
    method: opts.method,
    amount: booking.total,
    msisdn,
    txRef,
    providerRef: result.providerRef,
    checkoutUrl: result.checkoutUrl,
  });
  return result.checkoutUrl;
}
