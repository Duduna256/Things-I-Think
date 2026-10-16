// Run: node --import tsx --test src/lib/payments/providers/flutterwave.test.ts
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import type { Booking } from "@shared/lib/types";
import type { StartPaymentInput } from "../types";
import {
  checkoutBody,
  createFlutterwaveProvider,
  describeBooking,
  FLW_API,
  FlutterwaveError,
  isTransactionNotFound,
  mapStatus,
  placeholderEmail,
  sessionMinutes,
} from "./flutterwave";

const booking: Booking = {
  id: "0b5c8e0e-8a7f-4f3e-9b8e-1c2d3e4f5a6b",
  ref: "RCL-AB12CD",
  businessId: "biz-1",
  crewNames: [],
  customerId: "cust-1",
  staffId: null,
  staffName: null,
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
  paymentStatus: "unpaid",
  expiresAt: null,
  reminderSentAt: null,
  cancelledBy: null,
  createdAt: "2030-01-01T00:00:00.000Z",
  items: [
    { id: "i1", serviceId: "s1", name: "Knotless braids", price: 100000, durationMin: 330 },
    { id: "i2", serviceId: "s2", name: "Hot oil treatment", price: 20000, durationMin: 30 },
  ],
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
};

const input = (over: Partial<StartPaymentInput> = {}): StartPaymentInput => ({
  booking,
  method: "mtn",
  msisdn: "772123456",
  email: "grace@example.com",
  txRef: "RCL-AB12CD-1a2b3c4d",
  redirectUrl: "https://reclain.com/api/payments/return",
  ...over,
});

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
const realFetch = globalThis.fetch;

function mockFetch(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return respond(String(url), init ?? {});
  }) as typeof fetch;
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  globalThis.fetch = realFetch;
  calls = [];
});

const flw = createFlutterwaveProvider({ secretKey: "FLWSECK_TEST-abc" });

test("start posts a Standard checkout for mobile money and returns the hosted link", async () => {
  mockFetch(() => json(200, { status: "success", message: "Hosted Link", data: { link: "https://checkout.flutterwave.com/v3/hosted/pay/abc" } }));
  const result = await flw.start(input());
  assert.deepEqual(result, { checkoutUrl: "https://checkout.flutterwave.com/v3/hosted/pay/abc", providerRef: null });

  assert.equal(calls.length, 1);
  const [{ url, init }] = calls;
  assert.equal(url, `${FLW_API}/payments`);
  assert.equal(url, "https://api.flutterwave.com/v3/payments");
  assert.equal(init.method, "POST");
  const headers = init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer FLWSECK_TEST-abc");
  assert.equal(headers["Content-Type"], "application/json");
  assert.ok(init.signal instanceof AbortSignal, "requests carry a timeout signal");

  const body = JSON.parse(String(init.body));
  assert.equal(body.tx_ref, "RCL-AB12CD-1a2b3c4d");
  assert.equal(body.amount, 120000);
  assert.equal(body.currency, "UGX");
  assert.equal(body.redirect_url, "https://reclain.com/api/payments/return");
  assert.equal(body.payment_options, "mobilemoneyuganda");
  assert.deepEqual(body.customer, { email: "grace@example.com", phonenumber: "+256772123456", name: "Grace Nakato" });
  assert.equal(body.customizations.description, "Knotless braids, Hot oil treatment at The Braid Republic");
  assert.ok(body.customizations.title.length > 0);
  assert.deepEqual(body.meta, { booking_id: booking.id, booking_ref: "RCL-AB12CD" });
});

test("start asks for card checkout for card, and Airtel uses mobile money too", () => {
  assert.equal(checkoutBody(input({ method: "card", msisdn: null })).payment_options, "card");
  assert.equal(checkoutBody(input({ method: "airtel", msisdn: "0752 987 654" })).payment_options, "mobilemoneyuganda");
  assert.equal(checkoutBody(input({ method: "airtel", msisdn: "0752 987 654" })).customer.phonenumber, "+256752987654");
  // No MoMo number given: the booking's phone stands in.
  assert.equal(checkoutBody(input({ method: "card", msisdn: null })).customer.phonenumber, "+256772123456");
});

test("start falls back to a placeholder email on our domain", () => {
  const body = checkoutBody(input({ email: null }));
  assert.equal(body.customer.email, "no-email+rcl-ab12cd@reclain.com");
  assert.equal(checkoutBody(input({ email: "   " })).customer.email, placeholderEmail(booking));
  assert.match(placeholderEmail({ ref: "RCL-??" }), /^no-email\+rcl-@/);
});

test("start keeps the checkout open only as long as the slot is held", () => {
  const now = new Date("2030-01-01T10:00:00Z");
  assert.equal(sessionMinutes({ expiresAt: null }, now), 30);
  assert.equal(sessionMinutes({ expiresAt: "2030-01-01T10:12:30Z" }, now), 13);
  assert.equal(sessionMinutes({ expiresAt: "2030-01-01T09:00:00Z" }, now), 5, "never less than 5 minutes");
  assert.equal(sessionMinutes({ expiresAt: "2030-01-02T10:00:00Z" }, now), 30, "never more than the hold");
});

test("describeBooking stays short", () => {
  const many = { ...booking, items: Array.from({ length: 12 }, (_, i) => ({ ...booking.items[0], name: `Service number ${i}` })) };
  const text = describeBooking(many);
  assert.ok(text.length <= 100);
  assert.ok(text.endsWith("..."));
});

test("start turns API refusals into clear errors", async () => {
  mockFetch(() => json(401, { status: "error", message: "Invalid authorization key", data: null }));
  await assert.rejects(flw.start(input()), (e: unknown) => {
    assert.ok(e instanceof FlutterwaveError);
    assert.equal(e.code, "api");
    assert.equal(e.httpStatus, 401);
    assert.match(e.message, /Invalid authorization key/);
    return true;
  });
});

test("start refuses a success without a usable link", async () => {
  mockFetch(() => json(200, { status: "success", data: {} }));
  await assert.rejects(flw.start(input()), FlutterwaveError);
  mockFetch(() => json(200, { status: "success", data: { link: "http://evil.example/pay" } }));
  await assert.rejects(flw.start(input()), /unexpected checkout link/);
  mockFetch(() => new Response("<html>Bad gateway</html>", { status: 502 }));
  await assert.rejects(flw.start(input()), /HTTP 502/);
});

test("start without a secret key fails before calling Flutterwave", async () => {
  mockFetch(() => json(200, {}));
  const unset = createFlutterwaveProvider({ secretKey: "" });
  await assert.rejects(unset.start(input()), (e: unknown) => e instanceof FlutterwaveError && e.code === "config");
  assert.equal(calls.length, 0);
});

test("network failures and timeouts become network errors", async () => {
  mockFetch(() => {
    throw new TypeError("fetch failed");
  });
  await assert.rejects(flw.start(input()), (e: unknown) => e instanceof FlutterwaveError && e.code === "network" && /fetch failed/.test(e.message));
  mockFetch(() => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  });
  await assert.rejects(flw.verify("RCL-AB12CD-1a2b3c4d"), (e: unknown) => e instanceof FlutterwaveError && /15 seconds/.test(e.message));
});

const transaction = (over: Record<string, unknown> = {}) => ({
  id: 4975632,
  tx_ref: "RCL-AB12CD-1a2b3c4d",
  flw_ref: "FLW-MOCK-123",
  amount: 120000,
  charged_amount: 121400,
  app_fee: 1400,
  currency: "UGX",
  status: "successful",
  payment_type: "mobilemoneyug",
  customer: { email: "grace@example.com", phone_number: "+256772123456" },
  card: { first_6digits: "553188", last_4digits: "2950" },
  ip: "197.0.0.1",
  ...over,
});

test("verify asks by reference and maps a successful transaction to paid", async () => {
  mockFetch(() => json(200, { status: "success", message: "Transaction fetched successfully", data: transaction() }));
  const v = await flw.verify("RCL-AB12CD-1a2b3c4d");
  assert.equal(calls[0].url, "https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=RCL-AB12CD-1a2b3c4d");
  assert.equal(calls[0].init.method, "GET");
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer FLWSECK_TEST-abc");
  assert.equal(v.txRef, "RCL-AB12CD-1a2b3c4d");
  assert.equal(v.status, "paid");
  assert.equal(v.amount, 120000, "the amount asked for, not the amount including fees");
  assert.equal(v.providerRef, "4975632", "providerRef is the transaction id");
  const raw = v.raw as Record<string, unknown>;
  assert.equal(raw.flw_ref, "FLW-MOCK-123");
  assert.equal(raw.card, undefined, "card details aren't stored");
  assert.equal(raw.customer, undefined);
  assert.equal(raw.ip, undefined);
});

test("verify encodes the reference", async () => {
  mockFetch(() => json(200, { status: "success", data: transaction({ tx_ref: "a b&c" }) }));
  await flw.verify("a b&c");
  assert.ok(calls[0].url.endsWith("?tx_ref=a%20b%26c"));
});

test("verify maps failed and cancelled to failed, anything else to pending", async () => {
  for (const [status, want] of [
    ["failed", "failed"],
    ["cancelled", "failed"],
    ["pending", "pending"],
    ["new", "pending"],
  ] as const) {
    mockFetch(() => json(200, { status: "success", data: transaction({ status }) }));
    assert.equal((await flw.verify("RCL-AB12CD-1a2b3c4d")).status, want, status);
  }
  assert.equal(mapStatus("SUCCESSFUL"), "paid");
  assert.equal(mapStatus(undefined), "pending");
});

test("verify never calls a payment in another currency paid", async () => {
  mockFetch(() => json(200, { status: "success", data: transaction({ currency: "USD", amount: 32 }) }));
  await assert.rejects(flw.verify("RCL-AB12CD-1a2b3c4d"), (e: unknown) => e instanceof FlutterwaveError && e.code === "mismatch" && /USD/.test(e.message));
  // A failed one in another currency is still just failed.
  mockFetch(() => json(200, { status: "success", data: transaction({ currency: "USD", status: "failed" }) }));
  assert.equal((await flw.verify("RCL-AB12CD-1a2b3c4d")).status, "failed");
});

test("verify refuses an answer about a different payment", async () => {
  mockFetch(() => json(200, { status: "success", data: transaction({ tx_ref: "SOMEONE-ELSE" }) }));
  await assert.rejects(flw.verify("RCL-AB12CD-1a2b3c4d"), (e: unknown) => e instanceof FlutterwaveError && e.code === "mismatch");
});

test("verify says not found when the customer closed checkout before paying", async () => {
  mockFetch(() => json(400, { status: "error", message: "No transaction was found for this id", data: null }));
  const err = await flw.verify("RCL-AB12CD-1a2b3c4d").catch((e: unknown) => e);
  assert.ok(isTransactionNotFound(err));
  assert.equal(isTransactionNotFound(new Error("No transaction")), false);
  mockFetch(() => json(500, { status: "error", message: "Internal error" }));
  const other = await flw.verify("RCL-AB12CD-1a2b3c4d").catch((e: unknown) => e);
  assert.ok(other instanceof FlutterwaveError && other.code === "api");
});
