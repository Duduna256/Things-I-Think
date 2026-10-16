import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { site } from "../config/site";
import { isDemo } from "./env";
import { PATH_HEADER } from "./request-path";
import { createClient } from "./supabase/server";
import type { SessionUser } from "./types";

// Demo mode has three pretend people. Pick one on the log-in page.
export const DEMO_COOKIE = "reclain_demo_user";
export const DEMO_USERS: Record<string, SessionUser> = {
  customer: { id: "demo-customer", email: "grace@demo.reclain.com", fullName: "Grace Nakato", phone: "772123456", isAdmin: false },
  provider: { id: "demo-provider", email: "aisha@demo.reclain.com", fullName: "Aisha Namuli", phone: "752987654", isAdmin: false },
  admin: { id: "demo-admin", email: "admin@demo.reclain.com", fullName: `Admin at ${site.shortName}`, phone: "700111222", isAdmin: true },
};

// Demo mode only: name and phone changes saved on /account, so the nav shows them too.
type DemoProfile = Pick<SessionUser, "fullName" | "phone">;
const demoStore = globalThis as unknown as { __reclainDemoProfiles?: Record<string, DemoProfile> };
const demoProfiles = () => (demoStore.__reclainDemoProfiles ??= {});

export function setDemoProfile(id: string, profile: DemoProfile) {
  demoProfiles()[id] = profile;
}

// The person making this request, or null. Cached for the length of one request.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (isDemo) {
    const key = (await cookies()).get(DEMO_COOKIE)?.value;
    const user = key ? DEMO_USERS[key] : undefined;
    return user ? { ...user, ...demoProfiles()[user.id] } : null;
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

// Sends people to the log-in page (and back here afterwards) if they aren't logged in. nextPath
// is the section; the exact page asked for (from the proxy) wins when it's inside that section,
// so a layout guarding /business still brings people back to /business/bookings.
export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(await returnPath(nextPath))}`);
  return user;
}

async function returnPath(section: string): Promise<string> {
  const asked = (await headers()).get(PATH_HEADER);
  if (!asked || !asked.startsWith("/") || asked.startsWith("//")) return section;
  // A section of "/" (the business app's dashboard) covers every page.
  const inside = section === "/" || asked === section || asked.startsWith(`${section}/`) || asked.startsWith(`${section}?`);
  return inside ? asked : section;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (!user.isAdmin) redirect("/");
  return user;
}
