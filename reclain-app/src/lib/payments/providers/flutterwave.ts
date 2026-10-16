// Flutterwave Standard checkout (API v3): MTN MoMo, Airtel Money and card in Uganda.
// start() asks Flutterwave for a hosted checkout link; verify() asks what really happened to a
// payment. Docs: https://developer.flutterwave.com/docs/collecting-payments/standard
//
// No "server-only" marker here so the unit tests can load it. It's only ever loaded through
// src/lib/payments/index.ts, which carries the marker, and the secret key is read from
// serverEnv (never inlined into a browser bundle).

import { site } from "../../../config/site";
import { serverEnv } from "../../env";
import { internationalMsisdn, normalizeMsisdn } from "../../phone";
import type { Booking, PaymentStatus } from "../../types";
import type { PaymentProvider, StartPaymentInput, StartPaymentResult, VerifiedPayment } from "../types";

export const FLW_API = "https://api.flutterwave.com/v3";
export const FLW_TIMEOUT_MS = 15_000;
const CURRENCY = "UGX";

export type FlutterwaveErrorCode = "config" | "network" | "api" | "not_found" | "mismatch";

// Every failure comes out as one of these. The messages are for logs and staff, not customers.
export class FlutterwaveError extends Error {
  constructor(
    message: string,
    public code: FlutterwaveErrorCode,
    public httpStatus: number | null = null,
  ) {
    super(message);
    this.name = "FlutterwaveError";
  }
}

// Flutterwave has no transaction for this tx_ref: the customer closed the checkout before paying.
export function isTransactionNotFound(e: unknown): boolean {
  return e instanceof FlutterwaveError && e.code === "not_found";
}

// Flutterwave insists on an email address. People who signed up by phone don't have one, so
// they get a harmless address on our own domain (receipts land in our inbox, not a stranger's).
export function placeholderEmail(booking: Pick<Booking, "ref">): string {
  const ref = booking.ref.toLowerCase().replace(/[^a-z0-9-]/g, "") || "booking";
  return `no-email+${ref}@${site.domain}`;
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 3).trimEnd()}...`;
}

// "Knotless braids, Boho braids at The Braid Republic" (what the checkout page says it's for)
export function describeBooking(booking: Pick<Booking, "items" | "business">): string {
  const services = booking.items.map(i => i.name).join(", ") || "Your booking";
  return clip(`${services} at ${booking.business.name}`, 100);
}

// How long the checkout stays open: what's left of the slot hold, at least 5 minutes.
export function sessionMinutes(booking: Pick<Booking, "expiresAt">, now: Date = new Date()): number {
  if (!booking.expiresAt) return site.pendingPaymentMinutes;
  const left = Math.ceil((new Date(booking.expiresAt).getTime() - now.getTime()) / 60_000);
  return Math.min(Math.max(left, 5), Math.max(site.pendingPaymentMinutes, 5));
}

// The body for POST /v3/payments.
export function checkoutBody(input: StartPaymentInput, now: Date = new Date()) {
  const { booking } = input;
  const msisdn = normalizeMsisdn(input.msisdn) ?? normalizeMsisdn(booking.customerPhone);
  const email = input.email?.trim() || placeholderEmail(booking);
  return {
    tx_ref: input.txRef,
    amount: booking.total,
    currency: CURRENCY,
    redirect_url: input.redirectUrl,
    payment_options: input.method === "card" ? "card" : "mobilemoneyuganda",
    customer: {
      email,
      ...(msisdn ? { phonenumber: internationalMsisdn(msisdn) } : {}),
      name: booking.customerName.trim() || `${site.shortName} customer`,
    },
    customizations: { title: site.name, description: describeBooking(booking) },
    meta: { booking_id: booking.id, booking_ref: booking.ref },
    configurations: { session_duration: sessionMinutes(booking, now), max_retry_attempt: 3 },
  };
}

// Flutterwave's word for a transaction -> ours.
export function mapStatus(status: unknown): PaymentStatus {
  const s = String(status ?? "").toLowerCase();
  if (s === "successful") return "paid";
  if (s === "failed" || s === "cancelled") return "failed";
  return "pending";
}

interface FlwEnvelope {
  status?: string;
  message?: string;
  data?: unknown;
}

type Fields = Record<string, unknown>;
const isObject = (v: unknown): v is Fields => typeof v === "object" && v !== null && !Array.isArray(v);

async function flw(path: string, secretKey: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<{ http: number; json: FlwEnvelope | null }> {
  if (!secretKey) throw new FlutterwaveError("FLW_SECRET_KEY isn't set. Add it in .env.local or Vercel, or set PAYMENT_PROVIDER=mock.", "config");
  let res: Response;
  try {
    res = await fetch(`${FLW_API}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(FLW_TIMEOUT_MS),
    });
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new FlutterwaveError(`Flutterwave didn't answer within ${FLW_TIMEOUT_MS / 1000} seconds.`, "network");
    }
    throw new FlutterwaveError(`Couldn't reach Flutterwave: ${e instanceof Error ? e.message : String(e)}`, "network");
  }
  let json: FlwEnvelope | null = null;
  try {
    const parsed: unknown = await res.json();
    json = isObject(parsed) ? (parsed as FlwEnvelope) : null;
  } catch {
    json = null;
  }
  return { http: res.status, json };
}

function apiError(what: string, http: number, json: FlwEnvelope | null): FlutterwaveError {
  const why = json?.message ? `: ${json.message}` : "";
  return new FlutterwaveError(`Flutterwave refused ${what} (HTTP ${http})${why}`, "api", http);
}

// Keep the useful parts of a transaction; leave out card details, IPs and the like.
function summarise(t: Fields): Fields {
  const keep = ["id", "tx_ref", "flw_ref", "amount", "charged_amount", "app_fee", "currency", "status", "payment_type", "processor_response", "created_at"];
  return Object.fromEntries(keep.filter(k => k in t).map(k => [k, t[k]]));
}

export function createFlutterwaveProvider(config: { secretKey?: string } = {}): PaymentProvider {
  const key = () => config.secretKey ?? serverEnv.flutterwaveSecretKey;

  return {
    name: "flutterwave",

    async start(input: StartPaymentInput): Promise<StartPaymentResult> {
      const { http, json } = await flw("/payments", key(), { method: "POST", body: checkoutBody(input) });
      const body = json?.data;
      const link = isObject(body) ? body.link : undefined;
      if (http >= 400 || json?.status !== "success" || typeof link !== "string") throw apiError("the checkout", http, json);
      if (!link.startsWith("https://")) throw new FlutterwaveError(`Flutterwave sent an unexpected checkout link: ${link}`, "api", http);
      return { checkoutUrl: link, providerRef: null };
    },

    async verify(txRef: string): Promise<VerifiedPayment> {
      const { http, json } = await flw(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`, key(), { method: "GET" });
      if (json?.status !== "success" || !isObject(json.data)) {
        if (http === 404 || /no transaction/i.test(json?.message ?? "")) {
          throw new FlutterwaveError(`Flutterwave has no transaction for ${txRef}.`, "not_found", http);
        }
        throw apiError(`to verify ${txRef}`, http, json);
      }
      const t = json.data;
      if (t.tx_ref !== txRef) {
        throw new FlutterwaveError(`Flutterwave answered for ${String(t.tx_ref)} when we asked about ${txRef}.`, "mismatch", http);
      }
      const status = mapStatus(t.status);
      const amount = Number(t.amount);
      // Money in the wrong currency, or no clear amount, is never treated as paid: a person
      // needs to look at it. The data layer also refuses a paid amount that isn't the booking's.
      if (status === "paid" && String(t.currency ?? "").toUpperCase() !== CURRENCY) {
        throw new FlutterwaveError(`Flutterwave reported ${txRef} in ${String(t.currency)}, not ${CURRENCY}.`, "mismatch", http);
      }
      if (status === "paid" && !Number.isFinite(amount)) {
        throw new FlutterwaveError(`Flutterwave reported no amount for ${txRef}.`, "mismatch", http);
      }
      return {
        txRef,
        status,
        amount: Number.isFinite(amount) ? amount : 0,
        providerRef: t.id !== undefined && t.id !== null ? String(t.id) : null,
        raw: summarise(t),
      };
    },
  };
}

export const flutterwaveProvider: PaymentProvider = createFlutterwaveProvider();
