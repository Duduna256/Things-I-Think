import "server-only";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { site } from "../config/site";
import { safeNext } from "./actions";
import { isDemo } from "../lib/env";
import { createClient } from "../lib/supabase/server";
import { callbackReason, cleanNext, errorHref, loginHref, type AuthErrorLike } from "../components/auth/logic";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

function isOtpType(value: string | null): value is EmailOtpType {
  return !!value && (OTP_TYPES as readonly string[]).includes(value);
}

// Shared by GET /auth/callback (Supabase's default links and Google: ?code=) and GET
// /auth/confirm (custom email templates: ?token_hash=&type=). Each understands both, so a
// template pointed at either one still works. The session cookies set by the Supabase client
// travel with the redirect.
export async function finishLogin(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const params = url.searchParams;
  const next = await safeNext(cleanNext(params.get("next"), [url.origin, site.url]));
  const go = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  if (isDemo) return go(loginHref(next));

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const providerError = params.get("error");
  let failure: AuthErrorLike | null = null;

  if (!providerError && (code || (tokenHash && isOtpType(type)))) {
    try {
      const supabase = await createClient();
      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type as EmailOtpType });
      if (!error) return go(next);
      failure = error;
    } catch (e) {
      console.error("Finishing log-in failed", e);
      failure = { message: e instanceof Error ? e.message : String(e) };
    }
  }

  const reason = callbackReason({
    error: providerError,
    errorCode: params.get("error_code"),
    description: params.get("error_description"),
    failure,
    hadToken: !!(code || tokenHash),
  });
  return go(errorHref(reason, next));
}
