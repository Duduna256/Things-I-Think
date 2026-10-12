// What happened to a payment, worked out the same way wherever the news arrives: the customer
// coming back from checkout (/api/payments/return), Flutterwave's webhook, or the test prompt
// at /pay/mock/[txRef].
//
// Pure: everything it touches comes in as `deps`, so it's unit-tested (settle.test.ts) and
// wired to the real data layer in ./server.ts. Relative imports only, for the tests.

import { z } from "zod";
import type { Booking, Payment, PaymentStatus } from "../../../lib/types";
import type { PaymentResultApplied } from "../../../lib/data/source";
import type { VerifiedPayment } from "../../../lib/payments/types";

// Our payment references look like "RCL-AB12CD-1a2b3c4d" (see newTxRef in lib/payments).
export const txRefSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{1,100}$/);

export function parseTxRef(value: unknown): string | null {
  const parsed = txRefSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export interface SettleDeps {
  getPayment(txRef: string): Promise<Payment | null>;
  getBooking(id: string): Promise<Booking | null>;
  // Ask the provider. null means it has no record of the payment (checkout closed before paying).
  verify(payment: Payment): Promise<VerifiedPayment | null>;
  // Records the result. becamePaid is true for exactly one call per booking (the database
  // decides under a row lock), so a webhook and a redirect arriving together text once.
  apply(input: { txRef: string; status: PaymentStatus; providerRef: string | null; amount: number; raw: unknown }): Promise<PaymentResultApplied>;
  notifyConfirmed(booking: Booking): Promise<void> | void;
  log?(message: string, detail?: unknown): void;
}

export type SettleOutcome =
  | { kind: "unknown" } // no such payment (or not one for this provider)
  | { kind: "abandoned"; booking: Booking } // the provider never saw a payment attempt
  | { kind: "pending"; booking: Booking }
  | { kind: "paid"; booking: Booking; justPaid: boolean }
  | { kind: "paid_late"; booking: Booking } // paid after the slot went to someone else: refund due
  | { kind: "failed"; booking: Booking }
  | { kind: "rejected"; booking: Booking; reason: string }; // the provider's answer didn't add up

// Reads the booking's state after (or instead of) applying a result.
export function describe(booking: Booking, justPaid: boolean): SettleOutcome {
  if (booking.paymentStatus === "paid") {
    return booking.status === "cancelled" ? { kind: "paid_late", booking } : { kind: "paid", booking, justPaid };
  }
  if (booking.paymentStatus === "failed") return { kind: "failed", booking };
  return { kind: "pending", booking };
}

export async function settle(txRef: string, deps: SettleDeps, opts: { provider?: string } = {}): Promise<SettleOutcome> {
  const log = deps.log ?? ((message: string, detail?: unknown) => console.warn(message, detail ?? ""));
  const payment = await deps.getPayment(txRef);
  if (!payment || (opts.provider && payment.provider !== opts.provider)) return { kind: "unknown" };
  const before = await deps.getBooking(payment.bookingId);
  if (!before) return { kind: "unknown" };

  // Settled already (webhooks repeat): nothing to ask, nothing to text.
  if (payment.status === "paid") return describe(before, false);

  const verified = await deps.verify(payment);
  if (!verified) return { kind: "abandoned", booking: before };
  if (verified.txRef !== txRef) {
    log(`Payment ${txRef}: provider answered for ${verified.txRef}`);
    return { kind: "rejected", booking: before, reason: "The provider answered about a different payment." };
  }
  if (verified.status === "paid" && verified.amount !== payment.amount) {
    log(`Payment ${txRef}: paid ${verified.amount}, expected ${payment.amount}. Not confirming; check it by hand.`);
    return { kind: "rejected", booking: before, reason: "The amount paid doesn't match the booking." };
  }
  if (verified.status === "pending" || verified.status === "unpaid") return { kind: "pending", booking: before };
  // Another attempt already paid for this booking: don't let this one's failure undo that.
  if (verified.status !== "paid" && before.paymentStatus === "paid") return describe(before, false);
  if (verified.status === "paid" && before.paymentStatus === "paid") {
    log(`Payment ${txRef}: booking ${before.ref} was already paid by another attempt. Refund one of them.`);
  }

  const { booking: after, becamePaid: justPaid } = await deps.apply({
    txRef,
    status: verified.status,
    providerRef: verified.providerRef ?? payment.providerRef,
    amount: verified.amount,
    raw: verified.raw,
  });

  if (justPaid) {
    try {
      await deps.notifyConfirmed(after);
    } catch (e) {
      log(`Payment ${txRef}: confirmation SMS failed`, e);
    }
  }
  return describe(after, justPaid);
}

// Where to send the customer afterwards. The booking page reads the real state; the flag
// only picks the message.
export function bookingPathFor(outcome: SettleOutcome): string {
  if (outcome.kind === "unknown") return "/bookings";
  const base = `/bookings/${encodeURIComponent(outcome.booking.id)}`;
  switch (outcome.kind) {
    case "paid":
    case "paid_late":
      return `${base}?paid=1`;
    case "failed":
    case "abandoned":
    case "rejected":
      return `${base}?failed=1`;
    case "pending":
      return `${base}?pending=1`;
  }
}
