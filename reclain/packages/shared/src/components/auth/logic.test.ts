import assert from "node:assert/strict";
import { test } from "node:test";
import {
  authErrorMessage,
  callbackReason,
  callbackUrl,
  cleanNext,
  errorHref,
  isSafePath,
  loginContext,
  loginHref,
  parseReason,
  parseView,
  personaNext,
} from "./logic";

const SITE = "http://localhost:3000";

test("same-site paths survive exactly, query string and all", () => {
  const next = "/book/braid-republic?service=svc_1,svc_2&staff=any&date=2026-10-14&slot=2026-10-14T07%3A00%3A00.000Z&step=confirm";
  assert.equal(cleanNext(next), next);
  assert.equal(cleanNext("/bookings"), "/bookings");
  assert.equal(cleanNext("/v/fade-kings#reviews"), "/v/fade-kings#reviews");
  assert.equal(cleanNext(["/account", "/admin"]), "/account");
});

test("the booking flow's encoded next decodes once and comes back unchanged", () => {
  // What src/components/booking/flow-state.ts loginHref() builds, read back by searchParams.
  const original = "/book/braid-republic?service=a&step=confirm";
  const href = `/login?next=${encodeURIComponent(original)}`;
  const fromSearchParams = new URL(href, SITE).searchParams.get("next");
  assert.equal(cleanNext(fromSearchParams), original);
  // And through the Supabase round trip: callback URL, then ?code= added on the way back.
  const back = new URL(callbackUrl(SITE, original));
  back.searchParams.set("code", "abc");
  assert.equal(cleanNext(back.searchParams.get("next")), original);
});

test("anything that could leave the site becomes /", () => {
  for (const bad of [
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "https://evil.com/book/x",
    "http://localhost:3000@evil.com/",
    "javascript:alert(1)",
    "evil.com",
    "/ok\nLocation: https://evil.com",
    "/tab\there",
    "",
    "   ",
    null,
    undefined,
    42,
    { next: "/" },
    "/" + "a".repeat(3000),
  ]) {
    assert.equal(cleanNext(bad, [SITE]), "/", String(bad));
  }
});

test("isSafePath (behind safeNext) lets through paths on this site and nothing else", () => {
  for (const ok of ["/", "/bookings", "/book/x?service=a&step=confirm", "/v/fade-kings#reviews", "/search?q=braids%20and%20twists"]) {
    assert.equal(isSafePath(ok), true, ok);
  }
  for (const bad of [
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "/ok\\..\\evil",
    "\\\\evil.com",
    "/ok\nLocation: https://evil.com",
    "/ok\r\nSet-Cookie: x=1",
    "/tab\there",
    "/nul\u0000",
    "/del\u007f",
    "https://evil.com",
    "evil.com",
    "",
    null,
    undefined,
    42,
  ]) {
    assert.equal(isSafePath(bad), false, JSON.stringify(bad));
  }
});

test("our own full addresses become paths; other origins don't", () => {
  assert.equal(cleanNext("http://localhost:3000/bookings?x=1", [SITE]), "/bookings?x=1");
  assert.equal(cleanNext("http://localhost:3000", [SITE]), "/");
  assert.equal(cleanNext("http://localhost:3000/bookings", []), "/");
  assert.equal(cleanNext("http://localhost:3001/bookings", [SITE]), "/");
  assert.equal(cleanNext("https://user:pw@localhost:3000/bookings", ["https://localhost:3000"]), "/");
});

test("log-in and auth pages never loop: their own next is used", () => {
  assert.equal(cleanNext("/login"), "/");
  assert.equal(cleanNext("/login?next=%2Fbookings"), "/bookings");
  assert.equal(cleanNext("/auth/callback?next=%2Fbook%2Fx%3Fservice%3Da%26step%3Dconfirm"), "/book/x?service=a&step=confirm");
  assert.equal(cleanNext("/auth/error?reason=expired"), "/");
  assert.equal(cleanNext("/auth/confirm"), "/");
  assert.equal(cleanNext("/login?next=/login?next=/login?next=/login?next=/bookings"), "/");
  assert.equal(cleanNext("/login?next=%2F%2Fevil.com"), "/");
});

test("an email template that pastes {{ .RedirectTo }} unencoded still lands in the right place", () => {
  const redirectTo = callbackUrl(SITE, "/book/x?service=a&step=confirm");
  const link = `${SITE}/auth/confirm?token_hash=abc&type=email&next=${redirectTo}`;
  const raw = new URL(link).searchParams.get("next");
  assert.equal(cleanNext(raw, [SITE]), "/book/x?service=a&step=confirm");
  // Properly encoded, too.
  const encoded = `${SITE}/auth/confirm?token_hash=abc&type=email&next=${encodeURIComponent(redirectTo)}`;
  assert.equal(cleanNext(new URL(encoded).searchParams.get("next"), [SITE]), "/book/x?service=a&step=confirm");
  // The template's default (the Site URL itself) means the homepage.
  assert.equal(cleanNext(SITE, [SITE]), "/");
});

test("callbackUrl always carries next and trims slashes", () => {
  assert.equal(callbackUrl("https://reclain.com/", "/"), "https://reclain.com/auth/callback?next=%2F");
  assert.equal(callbackUrl("https://reclain.com", "/bookings?x=1"), "https://reclain.com/auth/callback?next=%2Fbookings%3Fx%3D1");
});

test("loginHref keeps next and the chosen form", () => {
  assert.equal(loginHref("/"), "/login");
  assert.equal(loginHref("/bookings"), "/login?next=%2Fbookings");
  assert.equal(loginHref("/", "signup"), "/login?mode=signup");
  assert.equal(loginHref("/", "link"), "/login");
  const href = loginHref("/book/x?service=a&step=confirm", "login");
  assert.equal(new URL(href, SITE).searchParams.get("next"), "/book/x?service=a&step=confirm");
  assert.equal(new URL(href, SITE).searchParams.get("mode"), "login");
});

test("parseView accepts only the three forms", () => {
  assert.equal(parseView("signup"), "signup");
  assert.equal(parseView(["login"]), "login");
  assert.equal(parseView("admin"), null);
  assert.equal(parseView(undefined), null);
});

test("the log-in page says why you're there", () => {
  assert.match(loginContext("/book/x?step=confirm"), /finish your booking/);
  assert.match(loginContext("/bookings/abc?new=1"), /your bookings/);
  assert.match(loginContext("/business/onboarding"), /list your business/);
  assert.match(loginContext("/business/services"), /run your business/);
  assert.match(loginContext("/admin"), /Admins only/);
  assert.match(loginContext("/pay/mock/tx_1"), /paying/);
  assert.match(loginContext("/"), /One account/);
  // Never "Welcome back": plenty of people here are new.
  assert.doesNotMatch(loginContext("/"), /welcome back/i);
});

test("demo people land somewhere useful when there's nowhere to go", () => {
  assert.equal(personaNext("provider", "/"), "/business");
  assert.equal(personaNext("admin", "/"), "/admin");
  assert.equal(personaNext("customer", "/"), "/");
  assert.equal(personaNext("provider", "/book/x?step=confirm"), "/book/x?step=confirm");
});

test("Supabase errors become plain sentences", () => {
  assert.match(authErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" }, "login"), /don't match/);
  assert.match(authErrorMessage({ message: "Invalid login credentials", status: 400 }, "login"), /don't match/);
  assert.match(authErrorMessage({ code: "email_not_confirmed" }, "login"), /Confirm your email/);
  assert.match(authErrorMessage({ code: "over_email_send_rate_limit", message: "For security purposes, you can only request this after 45 seconds." }, "link"), /Give it a minute/);
  assert.match(authErrorMessage({ status: 429, message: "Too many" }, "login"), /lot of tries/);
  assert.match(authErrorMessage({ code: "user_already_exists" }, "signup"), /already an account/);
  assert.match(authErrorMessage({ code: "weak_password" }, "signup"), /stronger password/);
  assert.match(authErrorMessage({ code: "email_address_invalid" }, "link"), /doesn't look right/);
  assert.match(authErrorMessage({ code: "provider_disabled" }, "google"), /Google log-in isn't switched on/);
  assert.match(authErrorMessage({ name: "AuthRetryableFetchError", status: 0 }, "login"), /couldn't reach/);
  assert.match(authErrorMessage({ code: "something_new" }, "google"), /couldn't open Google/);
  assert.match(authErrorMessage(null, "link"), /couldn't send your link/);
  assert.match(authErrorMessage({ code: "signup_disabled" }, "signup"), /sign-ups are paused/);
});

test("error copy follows the house style", () => {
  const all = [
    "invalid_credentials",
    "email_not_confirmed",
    "over_email_send_rate_limit",
    "over_request_rate_limit",
    "user_already_exists",
    "weak_password",
    "email_address_invalid",
    "signup_disabled",
    "user_banned",
    "provider_disabled",
  ].map(code => authErrorMessage({ code }, "login"));
  for (const text of all) {
    assert.doesNotMatch(text, /—/, text);
    assert.match(text, /[.]$/, text);
  }
});

test("callbackReason explains what went wrong with a link", () => {
  assert.equal(callbackReason({ error: "access_denied", errorCode: "otp_expired", description: "Email link is invalid or has expired", hadToken: false }), "expired");
  assert.equal(callbackReason({ failure: { code: "pkce_code_verifier_not_found" }, hadToken: true }), "device");
  assert.equal(callbackReason({ failure: { code: "flow_state_not_found" }, hadToken: true }), "device");
  assert.equal(callbackReason({ error: "access_denied", hadToken: false }), "denied");
  assert.equal(callbackReason({ hadToken: false }), "missing");
  assert.equal(callbackReason({ failure: { code: "unexpected_failure" }, hadToken: true }), "failed");
});

test("parseReason and errorHref", () => {
  assert.equal(parseReason("expired"), "expired");
  assert.equal(parseReason("<script>"), "failed");
  assert.equal(parseReason(undefined), "failed");
  assert.equal(errorHref("expired", "/"), "/auth/error?reason=expired");
  assert.equal(errorHref("device", "/bookings"), "/auth/error?reason=device&next=%2Fbookings");
});
