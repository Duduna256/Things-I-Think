import "server-only";
import { cache } from "react";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, requireUser } from "@/lib/auth";
import { data, isDataError } from "@/lib/data";
import type { Business, BusinessDetail, SessionUser } from "@/lib/types";
import { parseId } from "@/components/dashboard/schemas";

// Which of your businesses the dashboard shows, when you run more than one.
export const BUSINESS_COOKIE = "reclain_business";
export const BUSINESS_COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, path: "/business", maxAge: 60 * 60 * 24 * 365 };

export interface Dashboard {
  user: SessionUser;
  businesses: Business[];
  business: Business; // the one being managed
}

// The logged-in owner and the business they're managing. Sends people without a business to
// onboarding. Cached for one request, so the layout and the page share one lookup.
// Pages call this themselves too: layouts don't re-run on navigation, so they can't guard alone.
export const getDashboard = cache(async (): Promise<Dashboard> => {
  const user = await requireUser("/business");
  const businesses = await data.getMyBusinesses();
  if (!businesses.length) redirect("/business/onboarding");
  const picked = (await cookies()).get(BUSINESS_COOKIE)?.value;
  const business = businesses.find(b => b.id === picked) ?? businesses[0];
  return { user, businesses, business };
});

// The current business with its services and team (hidden ones included).
export const getDashboardDetail = cache(async (): Promise<Dashboard & { detail: BusinessDetail }> => {
  const dash = await getDashboard();
  const detail = await data.getMyBusiness(dash.business.id);
  // It was in getMyBusinesses() a moment ago, so this only happens if it was just removed.
  if (!detail) redirect("/business");
  return { ...dash, detail };
});

export type Owned = { ok: true; user: SessionUser; business: BusinessDetail } | { ok: false; error: string };

// For Server Actions: the logged-in person's own business with this id, or a reason why not.
// Never trust a business id from a form without this check.
export async function ownedBusiness(rawId: unknown): Promise<Owned> {
  const id = parseId(rawId);
  if (!id) return { ok: false, error: "We couldn't tell which business that was for. Refresh the page and try again." };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "You've been logged out. Log in again and try once more." };
  try {
    const business = await data.getMyBusiness(id);
    if (!business || business.ownerId !== user.id) return { ok: false, error: "We couldn't find that business on your account." };
    return { ok: true, user, business };
  } catch (e) {
    if (isDataError(e)) return { ok: false, error: e.message };
    throw e;
  }
}

// After a change: refresh the dashboard, and the public pages when they show what changed.
export function refreshBusiness(slug?: string) {
  revalidatePath("/business", "layout");
  if (slug) {
    revalidatePath(`/v/${slug}`);
    revalidatePath(`/book/${slug}`);
    revalidatePath("/search");
    revalidatePath("/");
  }
}
