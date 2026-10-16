// The Flutterwave webhook, minus the plumbing: check the secret hash, find the tx_ref, settle
// the payment. Pure (the route passes in what it needs), so it's unit-tested in handle.test.ts.
// Relative imports only, for the tests.
//
// Flutterwave repeats webhooks, and the customer's redirect often lands at the same moment.
// settle() makes repeats harmless: a payment already marked paid is left alone and the
// confirmation SMS only goes out on the change to paid.

import { createHash, timingSafeEqual } from "node:crypto";
import { parseTxRef, type SettleOutcome } from "../../payments/settle";

export interface WebhookResult {
  status: number;
  body: Record<string, unknown>;
}

// Constant-time comparison of the "verif-hash" header with FLW_WEBHOOK_HASH. Hashing both sides
// first makes the lengths equal, so the comparison doesn't leak the secret's length either.
export function hashMatches(received: string | null | undefined, expected: string): boolean {
  if (!expected || !received) return false;
  const a = createHash("sha256").update(received, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

type Fields = Record<string, unknown>;
const isObject = (v: unknown): v is Fields => typeof v === "object" && v !== null && !Array.isArray(v);

// v3 webhooks: { event: "charge.completed", data: { tx_ref } }. Older ones: { txRef } at the top.
export function txRefFromPayload(body: unknown): string | null {
  if (!isObject(body)) return null;
  const d = isObject(body.data) ? body.data : {};
  return parseTxRef(d.tx_ref ?? d.txRef ?? body.tx_ref ?? body.txRef);
}

export interface WebhookInput {
  hash: string | null; // the "verif-hash" header
  expectedHash: string; // FLW_WEBHOOK_HASH
  readBody(): Promise<string>; // only read once the hash checks out
}

export interface WebhookDeps {
  settle(txRef: string): Promise<SettleOutcome>;
  log?(message: string, detail?: unknown): void;
}

export async function handleFlutterwaveWebhook(input: WebhookInput, deps: WebhookDeps): Promise<WebhookResult> {
  const log = deps.log ?? ((message: string, detail?: unknown) => console.warn(message, detail ?? ""));
  if (!input.expectedHash) {
    log("Flutterwave webhook refused: FLW_WEBHOOK_HASH isn't set.");
    return { status: 401, body: { ok: false, error: "Webhook secret isn't configured." } };
  }
  if (!hashMatches(input.hash, input.expectedHash)) {
    return { status: 401, body: { ok: false, error: "The verif-hash header is missing or wrong." } };
  }

  let body: unknown;
  try {
    body = JSON.parse(await input.readBody());
  } catch {
    return { status: 400, body: { ok: false, error: "The body isn't JSON." } };
  }

  const txRef = txRefFromPayload(body);
  // Not a payment of ours (a transfer, say): say thanks so Flutterwave stops retrying.
  if (!txRef) return { status: 200, body: { ok: true, ignored: "No tx_ref we recognise." } };

  try {
    const outcome = await deps.settle(txRef);
    if (outcome.kind === "unknown") return { status: 200, body: { ok: true, txRef, ignored: "Unknown tx_ref." } };
    return { status: 200, body: { ok: true, txRef, result: outcome.kind } };
  } catch (e) {
    // Usually Flutterwave's verify endpoint timing out. A 500 asks Flutterwave to try again later.
    log(`Flutterwave webhook: couldn't settle ${txRef}`, e);
    return { status: 500, body: { ok: false, txRef, error: "Couldn't verify the payment yet. Try again later." } };
  }
}
