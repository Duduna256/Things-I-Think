import "server-only";
import { data } from "../../data";
import type { PaymentProvider } from "../types";

// Test payments with no account and no real money. The customer lands on /pay/mock/[txRef],
// which plays the part of the phone prompt: tap Approve and the booking is paid.
export const mockProvider: PaymentProvider = {
  name: "mock",

  async start(input) {
    return { checkoutUrl: `/pay/mock/${encodeURIComponent(input.txRef)}`, providerRef: `MOCK-${input.txRef}` };
  },

  async verify(txRef) {
    const payment = await data.server.getPaymentByTxRef(txRef);
    if (!payment) throw new Error("Unknown payment reference");
    return { txRef, status: payment.status, amount: payment.amount, providerRef: payment.providerRef, raw: { mock: true } };
  },
};
