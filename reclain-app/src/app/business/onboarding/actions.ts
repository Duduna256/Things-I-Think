"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { features } from "@/config/features";
import { site } from "@/config/site";
import { getSessionUser } from "@/lib/auth";
import { data, isDataError } from "@/lib/data";
import { parseBusinessForm } from "@/components/dashboard/schemas";
import type { FormResult } from "@/components/dashboard/types";
import { BUSINESS_COOKIE, BUSINESS_COOKIE_OPTIONS } from "../_lib/context";

// Enough for a busy owner; stops one account filling the approval queue.
const MAX_BUSINESSES = 5;

export async function createBusinessAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await getSessionUser();
  if (!user) return { message: "You've been logged out. Log in again and try once more." };

  let categoryIds: string[];
  let areaIds: string[];
  try {
    const [categories, areas, mine] = await Promise.all([data.listCategories(), data.listAreas(), data.getMyBusinesses()]);
    if (mine.length >= MAX_BUSINESSES) {
      return { message: `You already run ${MAX_BUSINESSES} businesses on ${site.shortName}. Email ${site.email} if you need more.` };
    }
    categoryIds = categories.map(c => c.id);
    areaIds = areas.map(a => a.id);
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    throw e;
  }

  const parsed = parseBusinessForm(formData, {
    mode: "create",
    categoryIds,
    areaIds,
    cashEnabled: features.cashPayments,
    defaultHomeVisitFee: site.defaultHomeVisitFee,
  });
  if (!parsed.ok) return { message: "Check the highlighted fields and try again.", errors: parsed.errors };

  let id: string;
  try {
    // The owner becomes the first team member, so bookings have someone to go to.
    const business = await data.createBusiness(parsed.value, user.fullName?.trim() || "Owner");
    id = business.id;
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("createBusiness failed", e);
    return { message: "We couldn't create your business just now. Try again in a minute." };
  }
  // Manage the new business straight away, even if you run others.
  (await cookies()).set(BUSINESS_COOKIE, id, BUSINESS_COOKIE_OPTIONS);
  // The nav swaps "List your business" for "Dashboard" everywhere.
  revalidatePath("/", "layout");
  redirect("/business?welcome=1");
}
