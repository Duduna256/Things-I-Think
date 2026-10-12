// Run: node --import tsx --test src/app/api/webhooks/flutterwave/handle.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClaims, settle, type SettleOutcome } from "../../payments/settle";
import { answerWith, fakeStore } from "../../payments/fake-store.test-helper";
import { handleFlutterwaveWebhook, hashMatches, txRefFromPayload } from "./handle";

const HASH = "a-long-random-secret-hash-from-flutterwave-settings";
const TX = "RCL-AB12CD-1a2b3c4d";

const v3Body = (txRef = TX, status = "successful") =>
  JSON.stringify({
    event: "charge.completed",
    data: { id: 4975632, tx_ref: txRef, flw_ref: "FLW-MOCK-123", amount: 120000, currency: "UGX", status },
  });

function input(over: { hash?: string | null; expectedHash?: string; body?: string } = {}) {
  let reads = 0;
  return {
    reads: () => reads,
    value: {
      hash: over.hash === undefined ? HASH : over.hash,
      expectedHash: over.expectedHash ?? HASH,
      readBody: async () => {
        reads += 1;
        return over.body ?? v3Body();
      },
    },
  };
}

const neverSettle = {
  settle: async (): Promise<SettleOutcome> => {
    throw new Error("settle should not be called");
  },
  log: () => undefined,
};

test("hashMatches only accepts the exact secret", () => {
  assert.equal(hashMatches(HASH, HASH), true);
  assert.equal(hashMatches(`${HASH} `, HASH), false);
  assert.equal(hashMatches(HASH.slice(0, -1), HASH), false);
  assert.equal(hashMatches("short", HASH), false, "different lengths don't throw");
  assert.equal(hashMatches("", HASH), false);
  assert.equal(hashMatches(null, HASH), false);
  assert.equal(hashMatches(undefined, HASH), false);
  assert.equal(hashMatches("", ""), false, "an unset secret never matches");
  assert.equal(hashMatches("anything", ""), false);
});

test("a missing or wrong verif-hash gets a 401 and the body is never read", async () => {
  for (const hash of [null, "", "wrong", HASH.toUpperCase()]) {
    const i = input({ hash });
    const r = await handleFlutterwaveWebhook(i.value, neverSettle);
    assert.equal(r.status, 401, String(hash));
    assert.equal(i.reads(), 0);
  }
});

test("with no FLW_WEBHOOK_HASH configured, every webhook is refused", async () => {
  const i = input({ hash: "", expectedHash: "" });
  const r = await handleFlutterwaveWebhook(i.value, neverSettle);
  assert.equal(r.status, 401);
  assert.equal(i.reads(), 0);
});

test("a body that isn't JSON is a 400", async () => {
  const r = await handleFlutterwaveWebhook(input({ body: "event=charge.completed" }).value, neverSettle);
  assert.equal(r.status, 400);
});

test("events without a tx_ref (transfers and the like) get a polite 200", async () => {
  const body = JSON.stringify({ event: "transfer.completed", data: { id: 1, reference: "payout-1" } });
  const r = await handleFlutterwaveWebhook(input({ body }).value, neverSettle);
  assert.equal(r.status, 200);
  assert.ok(r.body.ignored);
});

test("txRefFromPayload reads v3 and older payloads, and only well-formed references", () => {
  assert.equal(txRefFromPayload(JSON.parse(v3Body())), TX);
  assert.equal(txRefFromPayload({ txRef: TX, status: "successful" }), TX);
  assert.equal(txRefFromPayload({ data: { txRef: TX } }), TX);
  assert.equal(txRefFromPayload({ data: { tx_ref: "<script>" } }), null);
  assert.equal(txRefFromPayload([TX]), null);
  assert.equal(txRefFromPayload(null), null);
});

test("a good webhook settles the payment and texts the customer once, however often it repeats", async () => {
  const s = fakeStore({ claim: createClaims() });
  const deps = { settle: (txRef: string) => settle(txRef, s.deps, { provider: "flutterwave" }), log: () => undefined };

  const first = await handleFlutterwaveWebhook(input().value, deps);
  assert.equal(first.status, 200);
  assert.equal(first.body.result, "paid");
  assert.equal(s.bookings.get("bk-1")!.status, "confirmed");

  // Flutterwave retries, sometimes several at once.
  const repeats = await Promise.all([1, 2, 3].map(() => handleFlutterwaveWebhook(input().value, deps)));
  for (const r of repeats) {
    assert.equal(r.status, 200);
    assert.equal(r.body.result, "paid");
  }
  assert.deepEqual(s.calls.notified, ["bk-1"]);
  assert.equal(s.calls.verify, 1, "settled payments aren't verified again");
});

test("simultaneous first deliveries still text once", async () => {
  const s = fakeStore({ claim: createClaims() });
  const deps = { settle: (txRef: string) => settle(txRef, s.deps, { provider: "flutterwave" }), log: () => undefined };
  const results = await Promise.all([1, 2, 3].map(() => handleFlutterwaveWebhook(input().value, deps)));
  assert.ok(results.every(r => r.status === 200 && r.body.result === "paid"));
  assert.deepEqual(s.calls.notified, ["bk-1"]);
});

test("the body is only a hint: a 'successful' webhook for a failed payment records it as failed", async () => {
  const s = fakeStore();
  s.answer = answerWith("failed");
  const r = await handleFlutterwaveWebhook(input({ body: v3Body(TX, "successful") }).value, {
    settle: txRef => settle(txRef, s.deps, { provider: "flutterwave" }),
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.result, "failed");
  assert.equal(s.bookings.get("bk-1")!.status, "pending_payment");
  assert.deepEqual(s.calls.notified, []);
});

test("unknown references, or mock payments, are acknowledged and ignored", async () => {
  const s = fakeStore({ payments: [{ provider: "mock" }] });
  const deps = { settle: (txRef: string) => settle(txRef, s.deps, { provider: "flutterwave" }) };
  const mock = await handleFlutterwaveWebhook(input().value, deps);
  assert.equal(mock.status, 200);
  assert.ok(mock.body.ignored);
  const unknown = await handleFlutterwaveWebhook(input({ body: v3Body("RCL-NOPE-00000000") }).value, deps);
  assert.equal(unknown.status, 200);
  assert.ok(unknown.body.ignored);
  assert.equal(s.calls.verify, 0);
});

test("when Flutterwave can't be reached, answer 500 so the webhook is retried", async () => {
  const r = await handleFlutterwaveWebhook(input().value, {
    settle: async () => {
      throw new Error("Flutterwave didn't answer within 15 seconds.");
    },
    log: () => undefined,
  });
  assert.equal(r.status, 500);
  assert.equal(JSON.stringify(r.body).includes("15 seconds"), false, "internal errors stay in the logs");
});
