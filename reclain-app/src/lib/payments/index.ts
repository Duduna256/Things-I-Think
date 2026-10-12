import "server-only";
import { randomUUID } from "node:crypto";
import { site } from "../../config/site";
import { serverEnv } from "../env";
import { data } from "../data";
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

export function newTxRef(booking: Booking): string {
  return `${booking.ref}-${randomUUID().slice(0, 8)}`;
}

// Starts a MoMo, Airtel or card payment for a booking and records it.
// Returns the URL to send the customer to.
export async function startPayment(booking: Booking, opts: { method: OnlineMethod; msisdn: string | null; email: string | null }): Promise<string> {
  const provider = await getPaymentProvider();
  const txRef = newTxRef(booking);
  const result = await provider.start({
    booking,
    method: opts.method,
    msisdn: opts.msisdn,
    email: opts.email,
    txRef,
    redirectUrl: `${site.url}/bookings/${booking.id}?paid=1`,
  });
  await data.server.createPayment({
    bookingId: booking.id,
    provider: provider.name,
    method: opts.method,
    amount: booking.total,
    msisdn: opts.msisdn,
    txRef,
    providerRef: result.providerRef,
    checkoutUrl: result.checkoutUrl,
  });
  return result.checkoutUrl;
}
