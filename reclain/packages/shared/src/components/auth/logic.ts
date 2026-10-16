// Pure helpers for logging in: where to send people afterwards, what to say on the way, and
// what to tell them when something goes wrong. No server-only imports, so the node tests and
// client components can use them too.

import { site } from "../../config/site";

// ---------- Form states shared by the Server Actions and the forms ----------

export type AuthField = "email" | "password" | "name" | "phone";

export interface AuthFormState {
  status: "idle" | "error" | "sent" | "confirm";
  message?: string;
  // The field the message is about, so the form can mark and focus it.
  field?: AuthField;
  // What the person typed (never the password), so a failed attempt doesn't wipe the form.
  values?: { email?: string; name?: string; phone?: string };
  // When this result was made. Lets a form tell one "sent" from the next.
  at?: number;
}

export interface ProfileFormState {
  status: "idle" | "ok" | "error";
  message?: string;
  field?: "fullName" | "phone";
  values?: { fullName: string; phone: string };
  at?: number;
}

export type LoginView = "link" | "login" | "signup";

// ---------- Where to go after logging in ----------

// Pages that would bounce straight back to the log-in page if we sent people there.
const UNWRAP = new Set(["/login", "/auth/callback", "/auth/confirm"]);
const SCRATCH = "http://reclain.invalid";

// A path on this site that's safe to send people to: one leading "/", never "//", and no
// backslashes or control characters (browsers read "/\evil.com" as "//evil.com", another site).
export function isSafePath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !/[\\\u0000-\u001f\u007f]/.test(value);
}

// The `next` value inside a /login or /auth/callback address, read from the raw text.
// When the outer address has already been decoded once (Supabase email templates do this
// with {{ .RedirectTo }}), the inner value is a plain path and is kept whole, query and all.
function innerNext(path: string): string | null {
  const q = path.indexOf("?");
  if (q < 0) return null;
  const query = path.slice(q + 1).split("#")[0];
  const m = /(?:^|&)next=/.exec(query);
  if (!m) return null;
  const rest = query.slice(m.index + m[0].length);
  if (rest.startsWith("/")) return rest;
  const end = rest.indexOf("&");
  try {
    return decodeURIComponent((end < 0 ? rest : rest.slice(0, end)).replace(/\+/g, " "));
  } catch {
    return null;
  }
}

/**
 * Turns whatever arrived as `?next=` into a path on this site, or "/".
 * - Only same-site paths survive ("/book/x?service=y&step=confirm" comes back exactly as given).
 * - Full addresses are accepted only for the origins listed (our own), and become paths.
 * - "//evil.com", "/\evil.com", control characters and over-long values become "/".
 * - /login and /auth/* would loop, so their own `next` is used instead (or "/").
 * Call sites still pass the result through safeNext() from src/app/auth/actions.ts.
 */
export function cleanNext(raw: unknown, origins: readonly string[] = [], depth = 0): string {
  let value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return "/";
  value = value.trim();
  if (!value || value.length > 2048) return "/";

  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return "/";
    }
    if (url.username || url.password) return "/";
    const allowed = origins.some(o => {
      try {
        return new URL(o).origin === url.origin;
      } catch {
        return false;
      }
    });
    if (!allowed) return "/";
    value = value.replace(/^https?:\/\/[^/?#]*/i, "") || "/";
    if (!value.startsWith("/")) value = `/${value}`;
  }

  if (!isSafePath(value)) return "/";
  let parsed: URL;
  try {
    parsed = new URL(value, SCRATCH);
  } catch {
    return "/";
  }
  if (parsed.origin !== SCRATCH) return "/";

  const path = parsed.pathname;
  if (UNWRAP.has(path)) {
    if (depth >= 3) return "/";
    return cleanNext(innerNext(value), origins, depth + 1);
  }
  if (path === "/auth" || path.startsWith("/auth/")) return "/";
  return value;
}

// Where Supabase sends people back to after an email link or Google. `next` is always
// included, even when it's "/", so the address always has a query string.
export function callbackUrl(base: string, next: string): string {
  return `${base.replace(/\/+$/, "")}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function loginHref(next: string, view?: LoginView): string {
  const params = new URLSearchParams();
  if (next !== "/") params.set("next", next);
  if (view && view !== "link") params.set("mode", view);
  const q = params.toString();
  return q ? `/login?${q}` : "/login";
}

export function parseView(raw: unknown): LoginView | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "link" || v === "login" || v === "signup" ? v : null;
}

// The line under the log-in heading, so people know why they're here.
export function loginContext(next: string): string {
  const path = next.split(/[?#]/)[0];
  if (path.startsWith("/book/")) return "Log in to finish your booking. Your services and time are saved.";
  if (path.startsWith("/pay/")) return "Log in to finish paying for your booking.";
  if (path === "/bookings" || path.startsWith("/bookings/")) return "Log in to see your bookings.";
  if (path === "/business/onboarding") return "Log in to list your business. It's free to join.";
  if (path === "/business" || path.startsWith("/business/")) return "Log in to run your business.";
  if (path === "/admin" || path.startsWith("/admin/")) return "Admins only. Log in to carry on.";
  if (path === "/account") return "Log in to see your account.";
  return "One account to book, pay and, if you run a business, keep it running.";
}

// Demo mode: with nowhere particular to go, each pretend person lands somewhere useful.
export function personaNext(role: string, next: string): string {
  if (next !== "/") return next;
  if (role === "provider") return "/business";
  if (role === "admin") return "/admin";
  return "/";
}

// ---------- What went wrong ----------

export interface AuthErrorLike {
  code?: string | null;
  status?: number | null;
  message?: string | null;
  name?: string | null;
}

export type AuthAction = "link" | "login" | "signup" | "google";

// Supabase's errors are written for developers. These are written for people.
export function authErrorMessage(error: AuthErrorLike | null | undefined, action: AuthAction): string {
  const code = error?.code ?? "";
  const msg = error?.message ?? "";
  const status = error?.status ?? 0;
  const is = (codes: string[], pattern?: RegExp) => codes.includes(code) || (!!pattern && pattern.test(msg));

  if (is(["invalid_credentials"], /invalid login credentials/i)) {
    return "That email and password don't match. Check for typos. If you usually log in with a link or Google, use that instead.";
  }
  if (is(["email_not_confirmed"], /email not confirmed/i)) {
    return "Confirm your email first. Tap the link we sent when you signed up, or get a fresh log-in link by email.";
  }
  if (is(["over_email_send_rate_limit"], /only request this after|email rate limit/i)) {
    return "We've just sent an email to that address. Give it a minute, check your spam folder, then try again.";
  }
  if (is(["over_request_rate_limit"], /rate limit/i) || status === 429) {
    return "That's a lot of tries in a row. Take a breather and try again in a few minutes.";
  }
  if (is(["user_already_exists", "email_exists", "identity_already_exists"], /already registered|already exists/i)) {
    return "There's already an account with that email. Log in instead, or get a log-in link by email.";
  }
  if (is(["weak_password"], /password should|weak password/i)) {
    return "Pick a stronger password: at least 8 characters, with a mix of letters and numbers.";
  }
  if (is(["email_address_invalid", "validation_failed"], /invalid format|unable to validate email/i)) {
    return "That email address doesn't look right. Check it and try again.";
  }
  if (is(["email_address_not_authorized"])) {
    return "We can't send emails to that address yet. Try another email, or Continue with Google.";
  }
  if (is(["signup_disabled"], /signups not allowed/i)) {
    return action === "link"
      ? "We couldn't find an account with that email, and new sign-ups are paused. Check the address or try again later."
      : `New sign-ups are paused for now. Try again later, or email ${site.email}.`;
  }
  if (is(["user_banned"])) {
    return `This account is switched off. If you think that's a mistake, email ${site.email}.`;
  }
  if (is(["provider_disabled", "oauth_provider_not_supported"], /provider is not enabled|unsupported provider/i)) {
    return "Google log-in isn't switched on yet. Use your email instead.";
  }
  if (is(["email_provider_disabled", "otp_disabled"])) {
    return "Logging in by email is switched off right now. Try another way, or email us.";
  }
  if (is(["captcha_failed"])) {
    return "We couldn't check you're human. Refresh the page and try again.";
  }
  if (is(["request_timeout"]) || error?.name === "AuthRetryableFetchError" || status >= 500) {
    return "We couldn't reach the log-in service. Check your connection and try again.";
  }
  if (action === "google") return "We couldn't open Google just now. Try again, or use your email.";
  if (action === "link") return "We couldn't send your link just now. Try again in a minute.";
  return "Something went wrong logging you in. Try again in a minute.";
}

// Why an email link or the trip to Google didn't log someone in.
export type CallbackReason = "expired" | "device" | "denied" | "missing" | "failed";
const REASONS: CallbackReason[] = ["expired", "device", "denied", "missing", "failed"];

export function callbackReason(input: {
  error?: string | null; // ?error= from Supabase or Google
  errorCode?: string | null; // ?error_code= from Supabase
  description?: string | null; // ?error_description=
  failure?: AuthErrorLike | null; // what exchangeCodeForSession / verifyOtp returned
  hadToken: boolean; // was there a ?code= or ?token_hash= at all
}): CallbackReason {
  const code = input.failure?.code ?? input.errorCode ?? "";
  const text = `${input.description ?? ""} ${input.failure?.message ?? ""}`;
  if (["otp_expired", "flow_state_expired"].includes(code) || /expired|invalid or has expired/i.test(text)) return "expired";
  if (["pkce_code_verifier_not_found", "bad_code_verifier", "flow_state_not_found"].includes(code) || /code verifier/i.test(text)) {
    return "device";
  }
  if (input.error === "access_denied") return "denied";
  if (!input.hadToken && !input.error) return "missing";
  return "failed";
}

export function parseReason(raw: unknown): CallbackReason {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return REASONS.includes(v as CallbackReason) ? (v as CallbackReason) : "failed";
}

export function errorHref(reason: CallbackReason, next: string): string {
  return `/auth/error?reason=${reason}${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;
}

export const REASON_COPY: Record<CallbackReason, { title: string; body: string }> = {
  expired: {
    title: "That link has expired",
    body: "Log-in links work once and only for a short while. Ask for a fresh one and you'll be in.",
  },
  device: {
    title: "That link opened somewhere new",
    body: "Open the link on the same phone or computer you asked for it on. Or ask for a new link here.",
  },
  denied: {
    title: "Google said no",
    body: "That usually means Cancel got tapped on the Google screen. Try again, or log in with your email.",
  },
  missing: {
    title: "That link is missing a bit",
    body: "Part of the address got lost on the way, which happens when links are copied by hand. Ask for a new one.",
  },
  failed: {
    title: "We couldn't log you in",
    body: "Something went wrong on the way back to us. Ask for a new link, or try another way to log in.",
  },
};
