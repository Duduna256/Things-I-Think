// Run: node --import tsx --test src/lib/sms/providers/africastalking.test.ts
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { AT_LIVE_URL, AT_SANDBOX_URL, buildRequest, createAfricasTalkingProvider, messagingUrl, parseResponse } from "./africastalking";

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
const realFetch = globalThis.fetch;

function mockFetch(respond: () => Response) {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return respond();
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  calls = [];
});

const success = {
  SMSMessageData: {
    Message: "Sent to 1/1 Total Cost: UGX 30.0000",
    Recipients: [{ statusCode: 101, number: "+256772123456", status: "Success", cost: "UGX 30.0000", messageId: "ATXid_abc123" }],
  },
};

test("the sandbox username goes to the sandbox, anything else to the live API", () => {
  assert.equal(messagingUrl("sandbox"), "https://api.sandbox.africastalking.com/version1/messaging");
  assert.equal(messagingUrl("reclain"), "https://api.africastalking.com/version1/messaging");
  assert.equal(AT_LIVE_URL, "https://api.africastalking.com/version1/messaging");
  assert.equal(AT_SANDBOX_URL, "https://api.sandbox.africastalking.com/version1/messaging");
});

test("the request is a form post with the key in the apiKey header", () => {
  const { url, init } = buildRequest({ username: "reclain", apiKey: "atsk_123", senderId: "RECLAIN" }, "+256772123456", "Booked: 10:00 & paid");
  assert.equal(url, AT_LIVE_URL);
  assert.equal(init.method, "POST");
  assert.deepEqual(init.headers, {
    apiKey: "atsk_123",
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  });
  const form = new URLSearchParams(String(init.body));
  assert.equal(form.get("username"), "reclain");
  assert.equal(form.get("to"), "+256772123456");
  assert.equal(form.get("message"), "Booked: 10:00 & paid");
  assert.equal(form.get("from"), "RECLAIN");
  assert.match(String(init.body), /to=%2B256772123456/, "the + is encoded");
});

test("from is left out when there's no sender ID", () => {
  const { init } = buildRequest({ username: "sandbox", apiKey: "k", senderId: "" }, "+256772123456", "Hi");
  assert.equal(new URLSearchParams(String(init.body)).has("from"), false);
});

test("a Success recipient means sent, with the messageId as the reference", () => {
  assert.deepEqual(parseResponse(201, success), { ok: true, providerRef: "ATXid_abc123" });
});

test("any other recipient status is a failure that says why", () => {
  const body = { SMSMessageData: { Message: "Sent to 0/1", Recipients: [{ statusCode: 405, number: "+256772123456", status: "InsufficientBalance", messageId: "None" }] } };
  const r = parseResponse(201, body);
  assert.equal(r.ok, false);
  assert.equal(r.providerRef, null);
  assert.match(r.error ?? "", /InsufficientBalance \(405\)/);
});

test("no recipients, or a plain-text error, still gives a useful message", () => {
  const r = parseResponse(201, { SMSMessageData: { Message: "InvalidSenderId", Recipients: [] } });
  assert.equal(r.ok, false);
  assert.match(r.error ?? "", /InvalidSenderId/);
  const t = parseResponse(401, null, "The supplied authentication is invalid");
  assert.match(t.error ?? "", /HTTP 401: The supplied authentication is invalid/);
});

test("send posts to Africa's Talking and reads the reply", async () => {
  mockFetch(() => new Response(JSON.stringify(success), { status: 201, headers: { "Content-Type": "application/json" } }));
  const at = createAfricasTalkingProvider({ username: "sandbox", apiKey: "atsk_test", senderId: "" });
  const r = await at.send("+256772123456", "See you tomorrow!");
  assert.deepEqual(r, { ok: true, providerRef: "ATXid_abc123" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, AT_SANDBOX_URL);
  assert.equal((calls[0].init.headers as Record<string, string>).apiKey, "atsk_test");
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.equal(new URLSearchParams(String(calls[0].init.body)).get("message"), "See you tomorrow!");
});

test("send reports a wrong key from the plain-text reply", async () => {
  mockFetch(() => new Response("The supplied authentication is invalid", { status: 401 }));
  const at = createAfricasTalkingProvider({ username: "reclain", apiKey: "wrong", senderId: "" });
  const r = await at.send("+256772123456", "Hi");
  assert.equal(r.ok, false);
  assert.match(r.error ?? "", /401/);
});

test("send never throws: missing keys and network failures come back as errors", async () => {
  mockFetch(() => new Response("{}"));
  const unset = createAfricasTalkingProvider({ username: "", apiKey: "", senderId: "" });
  const r = await unset.send("+256772123456", "Hi");
  assert.equal(r.ok, false);
  assert.match(r.error ?? "", /AT_USERNAME/);
  assert.equal(calls.length, 0);

  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  const down = await createAfricasTalkingProvider({ username: "reclain", apiKey: "k", senderId: "" }).send("+256772123456", "Hi");
  assert.equal(down.ok, false);
  assert.match(down.error ?? "", /Couldn't reach Africa's Talking/);
});
