"use server";

import { data, isDataError } from "@shared/lib/data";
import { parseId } from "@/components/dashboard/schemas";
import type { FormResult } from "@/components/dashboard/types";
import { ownedBusiness, refreshBusiness } from "../../_lib/context";
import { parseResourceForm } from "./schemas";

const MAX_RESOURCES = 100;

// Add an item of equipment or a vehicle, or edit one (when the form carries a resourceId).
export async function saveResourceAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const owned = await ownedBusiness(formData.get("businessId"));
  if (!owned.ok) return { message: owned.error };
  const { business } = owned;

  let existing;
  let count = 0;
  try {
    const list = await data.capacity.listResources(business.id);
    count = list.length;
    const rawId = formData.get("resourceId");
    const resourceId = rawId ? parseId(rawId) : null;
    existing = resourceId ? list.find(r => r.id === resourceId) : undefined;
    if (rawId && !existing) return { message: "That item isn't on your list any more. Refresh the page and try again." };
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    throw e;
  }
  if (!existing && count >= MAX_RESOURCES) {
    return { message: `Your list already has ${MAX_RESOURCES} items. Remove or reuse one before adding more.` };
  }

  const parsed = parseResourceForm(formData);
  if (!parsed.ok) return { message: "Check the highlighted fields and try again.", errors: parsed.errors };

  // New items go to the end of the list.
  const sort = existing ? existing.sort : count;
  try {
    await data.capacity.upsertResource(business.id, { ...parsed.value, id: existing?.id, sort });
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("upsertResource failed", e);
    return { message: "We couldn't save that just now. Try again in a minute." };
  }
  refreshBusiness(business.slug);
  return { ok: true, message: existing ? `Saved ${parsed.value.name}.` : `Added ${parsed.value.name}.` };
}

export async function deleteResourceAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const owned = await ownedBusiness(formData.get("businessId"));
  if (!owned.ok) return { message: owned.error };
  const { business } = owned;
  const id = parseId(formData.get("resourceId"));
  try {
    const item = id ? (await data.capacity.listResources(business.id)).find(r => r.id === id) : undefined;
    if (!item) return { message: "That item isn't on your list any more. Refresh the page to see the latest." };
    await data.capacity.deleteResource(item.id);
    refreshBusiness(business.slug);
    return { ok: true, message: `Removed ${item.name}. Services that used it no longer need it.` };
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("deleteResource failed", e);
    return { message: "We couldn't remove that just now. Try again in a minute." };
  }
}
