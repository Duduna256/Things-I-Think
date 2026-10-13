// Run: node --import tsx --test src/app/api/payments/settle.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingPathFor, describe, parseTxRef, settle } from "./settle";
import { answerWith, fakeStore, makeBooking } from "./fake-store.test-helper";

const TX = "RCL-AB12CD-1a2b3c4d";

test("a verified payment confirms the booking and texts once", async () => {
  const s = fakeStore();
  const outcome = await settle(TX, s.deps);
  assert.equal(outcome.kind, "paid");
  assert.ok(outcome.kind === "paid" && outcome.justPaid);
  assert.equal(s.bookings.get("bk-1")!.status, "confirmed");
  assert.equal(s.payments.get(TX)!.providerRef, "4975632");
  assert.deepEqual(s.calls.notified, ["bk-1"]);
  assert.equal(bookingPathFor(outcome), "/bookings/bk-1?paid=1");
});

test("repeats are harmless: no second provider call, no second text", async () => {
  const s = fakeStore();
  await settle(TX, s.deps);
  const again = await settle(TX, s.deps);
  const third = await settle(TX, s.deps);
  assert.equal(again.kind, "paid");
  assert.ok(again.kind === "paid" && !again.justPaid);
  assert.equal(third.kind, "paid");
  assert.equal(s.calls.verify, 1);
  assert.equal(s.calls.apply, 1);
  assert.deepEqual(s.calls.notified, ["bk-1"]);
});

test("a webhook and a redirect landing together text once", async () => {
  const s = fakeStore();
  const [a, b] = await Promise.all([settle(TX, s.deps), settle(TX, s.deps)]);
  assert.equal(a.kind, "paid");
  assert.equal(b.kind, "paid");
  assert.deepEqual(s.calls.notified, ["bk-1"]);
});

test("a declined payment is recorded as failed and nobody gets a text", async () => {
  const s = fakeStore();
  s.answer = answerWith("failed");
  const outcome = await settle(TX, s.deps);
  assert.equal(outcome.kind, "failed");
  assert.equal(s.bookings.get("bk-1")!.paymentStatus, "failed");
  assert.equal(s.bookings.get("bk-1")!.status, "pending_payment", "the slot is still held");
  assert.deepEqual(s.calls.notified, []);
  assert.equal(bookingPathFor(outcome), "/bookings/bk-1?failed=1");
});

test("a failed attempt can still turn into a paid one (the customer retried in checkout)", async () => {
  const s = fakeStore();
  s.answer = answerWith("failed");
  await settle(TX, s.deps);
  s.answer = answerWith("paid");
  const outcome = await settle(TX, s.deps);
  assert.ok(outcome.kind === "paid" && outcome.justPaid);
  assert.deepEqual(s.calls.notified, ["bk-1"]);
});

test("still pending: nothing is written", async () => {
  const s = fakeStore();
  s.answer = answerWith("pending");
  const outcome = await settle(TX, s.deps);
  assert.equal(outcome.kind, "pending");
  assert.equal(s.calls.apply, 0);
  assert.equal(bookingPathFor(outcome), "/bookings/bk-1?pending=1");
});

test("checkout closed before paying: nothing is written, the customer sees it didn't go through", async () => {
  const s = fakeStore();
  s.answer = () => null;
  const outcome = await settle(TX, s.deps);
  assert.equal(outcome.kind, "abandoned");
  assert.equal(s.calls.apply, 0);
  assert.equal(bookingPathFor(outcome), "/bookings/bk-1?failed=1");
});

test("the wrong amount, or an answer about another payment, is refused", async () => {
  const s = fakeStore();
  s.answer = answerWith("paid", { amount: 1000 });
  const short = await settle(TX, s.deps);
  assert.equal(short.kind, "rejected");
  assert.equal(s.calls.apply, 0);
  assert.equal(s.bookings.get("bk-1")!.status, "pending_payment");

  s.answer = answerWith("paid", { txRef: "SOMEONE-ELSE" });
  assert.equal((await settle(TX, s.deps)).kind, "rejected");
  assert.equal(s.calls.apply, 0);
  assert.deepEqual(s.calls.notified, []);
});

test("a failed attempt never undoes a booking another attempt already paid", async () => {
  const s = fakeStore({
    booking: { status: "confirmed", paymentStatus: "paid", expiresAt: null },
    payments: [{ txRef: "OLD-1", status: "pending" }, { txRef: "NEW-1", status: "paid" }],
  });
  s.answer = answerWith("failed");
  const outcome = await settle("OLD-1", s.deps);
  assert.ok(outcome.kind === "paid" && !outcome.justPaid);
  assert.equal(s.calls.apply, 0);
  assert.equal(s.bookings.get("bk-1")!.paymentStatus, "paid");
});

test("paid after the slot went to someone else: recorded for a refund, no 'you're booked' text", async () => {
  const s = fakeStore({ booking: { status: "cancelled", cancelledBy: "expired" } });
  s.slotTaken = true;
  const outcome = await settle(TX, s.deps);
  assert.equal(outcome.kind, "paid_late");
  assert.equal(s.bookings.get("bk-1")!.paymentStatus, "paid");
  assert.deepEqual(s.calls.notified, []);
  assert.equal(bookingPathFor(outcome), "/bookings/bk-1?paid=1");
});

test("paid after the hold ran out but with the slot still free: booked after all", async () => {
  const s = fakeStore({ booking: { status: "cancelled", cancelledBy: "expired" } });
  const outcome = await settle(TX, s.deps);
  assert.ok(outcome.kind === "paid" && outcome.justPaid);
  assert.equal(s.bookings.get("bk-1")!.cancelledBy, null);
  assert.deepEqual(s.calls.notified, ["bk-1"]);
});

test("paid after the customer cancelled: it stays cancelled and is flagged for a refund", async () => {
  const s = fakeStore({ booking: { status: "cancelled", cancelledBy: "customer" } });
  const outcome = await settle(TX, s.deps);
  assert.equal(outcome.kind, "paid_late");
  assert.equal(s.bookings.get("bk-1")!.status, "cancelled");
  assert.deepEqual(s.calls.notified, []);
});

test("a second attempt that also pays doesn't text twice", async () => {
  const s = fakeStore({ payments: [{ txRef: "A-1" }, { txRef: "B-1" }] });
  await settle("A-1", s.deps);
  const second = await settle("B-1", s.deps);
  assert.ok(second.kind === "paid" && !second.justPaid);
  assert.equal(s.payments.get("B-1")!.status, "paid", "recorded, so it can be refunded");
  assert.deepEqual(s.calls.notified, ["bk-1"]);
});

test("unknown references, and other providers' payments, are left alone", async () => {
  const s = fakeStore({ payments: [{ provider: "mock" }] });
  const unknown = await settle("NOPE-1", s.deps);
  assert.equal(unknown.kind, "unknown");
  assert.equal(bookingPathFor(unknown), "/bookings");
  assert.equal((await settle(TX, s.deps, { provider: "flutterwave" })).kind, "unknown");
  assert.equal(s.calls.verify, 0);
});

test("a confirmation text that throws doesn't break settling", async () => {
  const s = fakeStore();
  s.deps.notifyConfirmed = async () => {
    throw new Error("SMS gateway down");
  };
  const outcome = await settle(TX, s.deps);
  assert.equal(outcome.kind, "paid");
});

test("provider errors reach the caller (so a webhook can ask to be retried)", async () => {
  const s = fakeStore();
  s.deps.verify = async () => {
    throw new Error("timeout");
  };
  await assert.rejects(settle(TX, s.deps), /timeout/);
  assert.equal(s.calls.apply, 0);
});

test("describe reads the booking's payment state", () => {
  assert.equal(describe(makeBooking({ paymentStatus: "paid", status: "confirmed" }), false).kind, "paid");
  assert.equal(describe(makeBooking({ paymentStatus: "paid", status: "cancelled" }), false).kind, "paid_late");
  assert.equal(describe(makeBooking({ paymentStatus: "failed" }), false).kind, "failed");
  assert.equal(describe(makeBooking({ paymentStatus: "pending" }), false).kind, "pending");
});

test("bookingPathFor encodes the id", () => {
  assert.equal(bookingPathFor({ kind: "pending", booking: makeBooking({ id: "a/b" }) }), "/bookings/a%2Fb?pending=1");
});

test("parseTxRef accepts our references and nothing else", () => {
  assert.equal(parseTxRef("RCL-AB12CD-1a2b3c4d"), "RCL-AB12CD-1a2b3c4d");
  assert.equal(parseTxRef("  RCL-AB12CD-1a2b3c4d "), "RCL-AB12CD-1a2b3c4d");
  for (const bad of ["", "a b", "x".repeat(101), "../etc", "RCL;drop", null, undefined, 42]) {
    assert.equal(parseTxRef(bad), null, String(bad));
  }
});

test("a provider record that doesn't match settles as 'rejected' for a person to check", async () => {
  const s = fakeStore();
  const mismatch = new Error("currency USD");
  s.deps.verify = async () => {
    throw mismatch;
  };
  s.deps.isMismatch = e => e === mismatch;
  const outcome = await settle(TX, s.deps);
  assert.equal(outcome.kind, "rejected");
  assert.equal(bookingPathFor(outcome), "/bookings/bk-1?review=1");
  assert.equal(s.calls.apply, 0, "nothing is recorded as paid or failed");
  assert.deepEqual(s.calls.notified, []);
  // Any other error still throws, so the webhook asks Flutterwave to retry.
  s.deps.isMismatch = () => false;
  await assert.rejects(settle(TX, s.deps));
});
