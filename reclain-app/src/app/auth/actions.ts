"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { features } from "@/config/features";
import { site } from "@/config/site";
import { DEMO_COOKIE, DEMO_USERS } from "@/lib/auth";
import { env, isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage, callbackUrl, cleanNext, isSafePath, type AuthField, type AuthFormState } from "@/components/auth/logic";
import { firstIssue, formText, linkSchema, loginSchema, signupSchema, typed } from "@/components/auth/schemas";

// Only allow redirects to pages on this site: "//evil.com", "/\evil.com" and anything with
// control characters in it become "/".
export async function safeNext(next: FormDataEntryValue | string | null | undefined): Promise<string> {
  return isSafePath(next) ? next : "/";
}

export async function signOut() {
  if (isDemo) {
    (await cookies()).delete(DEMO_COOKIE);
  } else {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

// Demo mode only: log in as one of the pretend people.
export async function demoSignIn(formData: FormData) {
  if (!isDemo) redirect("/login");
  const role = String(formData.get("role") ?? "");
  if (!DEMO_USERS[role]) redirect("/login");
  (await cookies()).set(DEMO_COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  redirect(await safeNext(formData.get("next")));
}

// ---------------------------------------------------------------------------------------
// Real log-in (Supabase). Each action checks its feature flag on the server too, so a
// switched-off method stays off even if someone posts the form by hand.
// ---------------------------------------------------------------------------------------

function refused(enabled: boolean): AuthFormState | null {
  if (isDemo) return { status: "error", message: "Demo mode uses pretend people. Pick one of them on the log-in page." };
  if (!enabled) return { status: "error", message: "That way of logging in is switched off. Try another one." };
  return null;
}

async function nextFrom(formData: FormData): Promise<string> {
  return safeNext(cleanNext(formText(formData, "next"), [site.url]));
}

// "Email me a link": works for new and returning people alike.
export async function emailLinkSignIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const blocked = refused(features.emailLinkLogin);
  if (blocked) return blocked;
  const values = { email: typed(formData, "email"), name: typed(formData, "name") };
  const parsed = linkSchema.safeParse(values);
  if (!parsed.success) {
    const { field, message } = firstIssue(parsed.error);
    return { status: "error", message, field: field as AuthField, values, at: Date.now() };
  }
  const { email, name } = parsed.data;
  const next = await nextFrom(formData);
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl(site.url, next),
        shouldCreateUser: true,
        ...(name ? { data: { full_name: name } } : {}),
      },
    });
    if (error) return { status: "error", message: authErrorMessage(error, "link"), field: "email", values, at: Date.now() };
  } catch (e) {
    console.error("signInWithOtp failed", e);
    return { status: "error", message: authErrorMessage(null, "link"), values, at: Date.now() };
  }
  return { status: "sent", values: { email, name }, at: Date.now() };
}

// Email and password: log in.
export async function passwordSignIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const blocked = refused(features.passwordLogin);
  if (blocked) return blocked;
  const values = { email: typed(formData, "email") };
  const parsed = loginSchema.safeParse({ email: values.email, password: formText(formData, "password") });
  if (!parsed.success) {
    const { field, message } = firstIssue(parsed.error);
    return { status: "error", message, field: field as AuthField, values, at: Date.now() };
  }
  const next = await nextFrom(formData);
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      const field: AuthField = error.code === "invalid_credentials" ? "password" : "email";
      return { status: "error", message: authErrorMessage(error, "login"), field, values, at: Date.now() };
    }
  } catch (e) {
    console.error("signInWithPassword failed", e);
    return { status: "error", message: authErrorMessage(null, "login"), values, at: Date.now() };
  }
  revalidatePath("/", "layout");
  redirect(next);
}

// Email and password: create an account. Name and phone go into the user's metadata, which
// the database copies into their profile (supabase/migrations: handle_new_user).
export async function passwordSignUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const blocked = refused(features.passwordLogin);
  if (blocked) return blocked;
  const values = {
    name: typed(formData, "name"),
    phone: typed(formData, "phone"),
    email: typed(formData, "email"),
  };
  const parsed = signupSchema.safeParse({ ...values, password: formText(formData, "password") });
  if (!parsed.success) {
    const { field, message } = firstIssue(parsed.error);
    return { status: "error", message, field: field as AuthField, values, at: Date.now() };
  }
  const { name, phone, email, password } = parsed.data;
  const next = await nextFrom(formData);
  let loggedIn = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl(site.url, next), data: { full_name: name, phone } },
    });
    if (error) {
      const field: AuthField = error.code === "weak_password" ? "password" : "email";
      return { status: "error", message: authErrorMessage(error, "signup"), field, values, at: Date.now() };
    }
    // With email confirmation switched off in Supabase, people are logged in straight away.
    loggedIn = !!data.session;
  } catch (e) {
    console.error("signUp failed", e);
    return { status: "error", message: authErrorMessage(null, "signup"), values, at: Date.now() };
  }
  if (loggedIn) {
    revalidatePath("/", "layout");
    redirect(next);
  }
  return { status: "confirm", values: { email, name }, at: Date.now() };
}

// "Continue with Google": Supabase gives us Google's address, and we send the browser there.
export async function googleSignIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const blocked = refused(features.googleLogin);
  if (blocked) return blocked;
  const next = await nextFrom(formData);
  let url: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(site.url, next), queryParams: { prompt: "select_account" } },
    });
    if (error) return { status: "error", message: authErrorMessage(error, "google"), at: Date.now() };
    url = data.url;
  } catch (e) {
    console.error("signInWithOAuth failed", e);
  }
  // Only ever follow an address on our own Supabase project.
  if (!url || !url.startsWith(`${env.supabaseUrl.replace(/\/+$/, "")}/`)) {
    return { status: "error", message: authErrorMessage(null, "google"), at: Date.now() };
  }
  redirect(url);
}
