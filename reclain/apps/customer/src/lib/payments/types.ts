import type { Booking, PaymentMethod, PaymentStatus } from "@shared/lib/types";

export type OnlineMethod = Exclude<PaymentMethod, "cash">;

export interface StartPaymentInput {
  booking: Booking;
  method: OnlineMethod;
  msisdn: string | null; // 9 digits, for MTN/Airtel
  email: string | null;
  txRef: string; // our unique reference for this attempt
  redirectUrl: string; // where the provider sends the customer back to
}

export interface StartPaymentResult {
  // Where to send the customer: the provider's checkout page, or our own "check your phone" page.
  checkoutUrl: string;
  providerRef: string | null;
}

export interface VerifiedPayment {
  txRef: string;
  status: PaymentStatus;
  amount: number;
  providerRef: string | null;
  raw: unknown;
}

// Add a provider (Pesapal, MTN MoMo direct, …) by writing one of these
// in providers/ and registering it in payments/index.ts.
export interface PaymentProvider {
  name: string;
  start(input: StartPaymentInput): Promise<StartPaymentResult>;
  // Ask the provider what really happened. Never trust a webhook body on its own.
  verify(txRef: string, providerRef?: string | null): Promise<VerifiedPayment>;
}
