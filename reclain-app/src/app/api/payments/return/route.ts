// GET /api/payments/return?tx_ref=…&status=…&transaction_id=…
// Flutterwave sends the customer here after checkout. The query is only a hint and never
// changes anything: we look our payment up by tx_ref, ask the provider what really happened,
// record it, text the confirmation if the booking has just been paid, then forward the
// customer to /bookings/[id] with ?paid=1, ?failed=1 or ?pending=1.

import { NextResponse, type NextRequest } from "next/server";
import { data } from "@/lib/data";
import { bookingPathFor, parseTxRef } from "../settle";
import { refreshBookingPages, settleWithProvider } from "../server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function go(request: NextRequest, path: string) {
  // 303: the browser follows with a plain GET, and nothing caches the hop.
  const res = NextResponse.redirect(new URL(path, request.url), 303);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const txRef = parseTxRef(sp.get("tx_ref") ?? sp.get("txRef"));
  if (!txRef) return go(request, "/bookings");

  try {
    const outcome = await settleWithProvider(txRef);
    if (outcome.kind !== "unknown") refreshBookingPages(outcome.booking);
    return go(request, bookingPathFor(outcome));
  } catch (e) {
    // Flutterwave didn't answer, or answered something odd. Nothing was recorded, and the
    // webhook will catch up, so show the booking as still waiting.
    console.error(`[payments] return: couldn't settle ${txRef}`, e);
    const payment = await data.server.getPaymentByTxRef(txRef).catch(() => null);
    return go(request, payment ? `/bookings/${encodeURIComponent(payment.bookingId)}?pending=1` : "/bookings");
  }
}
