// POST /api/webhooks/flutterwave
// Flutterwave calls this when a payment succeeds or fails. We never trust the body: it only
// tells us which tx_ref to ask Flutterwave about. Set the URL and a secret hash in
// Flutterwave → Settings → Webhooks, and the same hash in FLW_WEBHOOK_HASH.
// The proxy skips this path (src/proxy.ts), since there's no login here.

import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@shared/lib/env";
import { refreshBookingPages, settleWithProvider } from "../../payments/server";
import { handleFlutterwaveWebhook } from "./handle";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BODY_BYTES = 256 * 1024;

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return json({ ok: false, error: "Body too large." }, 413);

  const result = await handleFlutterwaveWebhook(
    {
      hash: request.headers.get("verif-hash"),
      expectedHash: serverEnv.flutterwaveWebhookHash,
      readBody: async () => {
        const text = await request.text();
        if (text.length > MAX_BODY_BYTES) throw new Error("Body too large");
        return text;
      },
    },
    {
      async settle(txRef) {
        // Only Flutterwave's own payments: a mock tx_ref sent here is ignored.
        const outcome = await settleWithProvider(txRef, { provider: "flutterwave" });
        if (outcome.kind !== "unknown") refreshBookingPages(outcome.booking);
        return outcome;
      },
      log: (message, detail) => console.error(`[payments] ${message}`, detail ?? ""),
    },
  );
  return json(result.body, result.status);
}
