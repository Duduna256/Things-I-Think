import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemo } from "./env";
import { createClient } from "./supabase/server";
import type { SessionUser } from "./types";

// Demo mode has three pretend people. Pick one on the log-in page.
export const DEMO_COOKIE = "reclain_demo_user";
export const DEMO_USERS: Record<string, SessionUser> = {
  customer: { id: "demo-customer", email: "grace@demo.reclain.com", fullName: "Grace Nakato", phone: "772123456", isAdmin: false },
  provider: { id: "demo-provider", email: "aisha@demo.reclain.com", fullName: "Aisha Namuli", phone: "752987654", isAdmin: false },
  admin: { id: "demo-admin", email: "admin@demo.reclain.com", fullName: "Reclain Admin", phone: "700111222", isAdmin: true },
};

// The person making this request, or null. Cached for the length of one request.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (isDemo) {
    const key = (await cookies()).get(DEMO_COOKIE)?.value;
    return (key && DEMO_USERS[key]) || null;
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name, phone, is_admin").eq("id", claims.sub).maybeSingle();
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    fullName: profile?.full_name ?? (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null,
    phone: profile?.phone ?? null,
    isAdmin: profile?.is_admin ?? false,
  };
});

// Sends people to the log-in page (and back here afterwards) if they aren't logged in.
export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (!user.isAdmin) redirect("/");
  return user;
}
