"use server";

import { features } from "@/config/features";
import { site } from "@/config/site";
import { data, isDataError } from "@/lib/data";
import { parseBusinessForm } from "@/components/dashboard/schemas";
import type { FormResult } from "@/components/dashboard/types";
import { ownedBusiness, refreshBusiness } from "../../_lib/context";

export async function saveSettingsAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const owned = await ownedBusiness(formData.get("businessId"));
  if (!owned.ok) return { message: owned.error };
  const { business } = owned;

  let categoryIds: string[];
  let areaIds: string[];
  try {
    const [categories, areas] = await Promise.all([data.listCategories(), data.listAreas()]);
    categoryIds = categories.map(c => c.id);
    areaIds = areas.map(a => a.id);
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    throw e;
  }

  const parsed = parseBusinessForm(formData, {
    mode: "update",
    categoryIds,
    areaIds,
    current: business,
    cashEnabled: features.cashPayments,
    defaultHomeVisitFee: site.defaultHomeVisitFee,
  });
  if (!parsed.ok) return { message: "Check the highlighted fields and try again.", errors: parsed.errors };

  let updated;
  try {
    updated = await data.updateBusiness(business.id, parsed.value);
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("updateBusiness failed", e);
    return { message: "We couldn't save those changes just now. Try again in a minute." };
  }
  refreshBusiness(business.slug);
  if (business.status === "published" && updated.status === "pending") {
    return { ok: true, message: "Saved. Security businesses are checked before they go live, so your page is with our team for a quick look." };
  }
  return { ok: true, message: business.status === "published" ? "Saved. Your public page is up to date." : "Saved." };
}
