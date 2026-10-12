"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE, DEMO_USERS } from "@/lib/auth";
import { isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Only allow redirects to pages on this site.
export async function safeNext(next: FormDataEntryValue | string | null | undefined): Promise<string> {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
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
