// A tiny in-memory payments store for the settle() and webhook tests. apply() follows
// record_payment_result() in supabase/migrations: paid is final, a paid amount must match, a
// failed attempt never undoes a paid one, paying never revives a booking someone cancelled, and a
// late payment for a slot someone else took leaves the booking cancelled.
// (Named *.test-helper.ts so the test runner's *.test.ts glob doesn't run it on its own.)

import type { Booking, Payment, PaymentStatus } from "../../../lib/types";
import type { VerifiedPayment } from "../../../lib/payments/types";
import type { SettleDeps } from "./settle";

export function makeBooking(over: Partial<Booking> = {}): Booking {
  return {
    id: "bk-1",
    ref: "RCL-AB12CD",
    businessId: "biz-1",
    customerId: "cust-1",
    staffId: "staff-1",
    staffName: "Aisha",
    startsAt: "2030-01-08T07:00:00.000Z",
    endsAt: "2030-01-08T12:30:00.000Z",
    location: "venue",
    address: "",
    notes: "",
    customerName: "Grace Nakato",
    customerPhone: "772123456",
    subtotal: 120000,
    homeFee: 0,
    total: 120000,
    currency: "UGX",
    status: "pending_payment",
    paymentMethod: "mtn",
    paymentStatus: "pending",
    expiresAt: "2030-01-01T00:30:00.000Z",
    reminderSentAt: null,
    cancelledBy: null,
    createdAt: "2030-01-01T00:00:00.000Z",
    items: [{ id: "i1", serviceId: "s1", name: "Knotless braids", price: 120000, durationMin: 330 }],
    business: {
      id: "biz-1",
      slug: "braid-republic",
      name: "The Braid Republic",
      areaId: "kololo",
      categoryId: "braids",
      coverWord: "braids",
      palette: ["#1a1030", "#6a43e0", "#d9ccff"],
      address: "",
      phone: "752987654",
    },
    hasReview: false,
    ...over,
  };
}

export function makePayment(over: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    bookingId: "bk-1",
    provider: "flutterwave",
    method: "mtn",
    amount: 120000,
    currency: "UGX",
    msisdn: "772123456",
    status: "pending",
    txRef: "RCL-AB12CD-1a2b3c4d",
    providerRef: null,
    checkoutUrl: "https://checkout.flutterwave.com/v3/hosted/pay/abc",
    createdAt: "2030-01-01T00:00:00.000Z",
    ...over,
  };
}

export interface FakeStore {
  payments: Map<string, Payment>;
  bookings: Map<string, Booking>;
  calls: { verify: number; apply: number; notified: string[] };
  // What the provider says next. Change it between calls to simulate a payment progressing.
  answer: (p: Payment) => VerifiedPayment | null;
  // The slot went to someone else (apply_payment_result's exclusion_violation branch).
  slotTaken: boolean;
  deps: SettleDeps;
}

export const paidAnswer = (p: Payment): VerifiedPayment => ({ txRef: p.txRef, status: "paid", amount: p.amount, providerRef: "4975632", raw: {} });
export const answerWith =
  (status: PaymentStatus, over: Partial<VerifiedPayment> = {}) =>
  (p: Payment): VerifiedPayment => ({ txRef: p.txRef, status, amount: p.amount, providerRef: "4975632", raw: {}, ...over });

export function fakeStore(opts: { booking?: Partial<Booking>; payments?: Partial<Payment>[] } = {}): FakeStore {
  const booking = makeBooking(opts.booking);
  const list = (opts.payments ?? [{}]).map(makePayment);
  const store: FakeStore = {
    payments: new Map(list.map(p => [p.txRef, p])),
    bookings: new Map([[booking.id, booking]]),
    calls: { verify: 0, apply: 0, notified: [] },
    answer: paidAnswer,
    slotTaken: false,
    deps: undefined as unknown as SettleDeps,
  };
  // A small pause in every call, so parallel settles really do interleave.
  const tick = () => new Promise(r => setTimeout(r, 1));
  store.deps = {
    async getPayment(txRef) {
      await tick();
      const p = store.payments.get(txRef);
      return p ? { ...p } : null;
    },
    async getBooking(id) {
      await tick();
      const b = store.bookings.get(id);
      return b ? { ...b } : null;
    },
    async verify(p) {
      store.calls.verify += 1;
      await tick();
      return store.answer(p);
    },
    async apply(input) {
      store.calls.apply += 1;
      await tick();
      const p = store.payments.get(input.txRef);
      if (!p) throw new Error("Unknown payment reference.");
      if (input.status === "paid" && input.amount !== p.amount) throw new Error("Paid amount does not match the booking.");
      const b = store.bookings.get(p.bookingId)!;
      if (p.status === "paid") return { booking: { ...b }, becamePaid: false };
      const wasPaid = b.paymentStatus === "paid";
      p.status = input.status;
      p.providerRef = input.providerRef ?? p.providerRef;
      if (!wasPaid) b.paymentStatus = input.status;
      const revivable = b.status === "pending_payment" || (b.status === "cancelled" && b.cancelledBy === "expired");
      if (input.status === "paid" && revivable && !store.slotTaken) {
        b.status = "confirmed";
        b.expiresAt = null;
        if (b.cancelledBy === "expired") b.cancelledBy = null;
      }
      return { booking: { ...b }, becamePaid: input.status === "paid" && !wasPaid && b.status === "confirmed" };
    },
    async notifyConfirmed(b) {
      store.calls.notified.push(b.id);
    },
    log: () => undefined,
  };
  return store;
}
