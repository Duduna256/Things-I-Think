"use server";

import { data, isDataError } from "@shared/lib/data";
import { parseId, parseServiceForm } from "@/components/dashboard/schemas";
import type { FormResult } from "@/components/dashboard/types";
import { ownedBusiness, refreshBusiness } from "../../_lib/context";

const MAX_SERVICES = 200;

// Add a service, or edit one (when the form carries a serviceId).
export async function saveServiceAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const owned = await ownedBusiness(formData.get("businessId"));
  if (!owned.ok) return { message: owned.error };
  const { business } = owned;

  const rawId = formData.get("serviceId");
  const serviceId = rawId ? parseId(rawId) : null;
  const existing = serviceId ? business.services.find(s => s.id === serviceId) : undefined;
  if (rawId && !existing) return { message: "That service isn't on your menu any more. Refresh the page and try again." };
  if (!existing && business.services.length >= MAX_SERVICES) {
    return { message: `Your menu already has ${MAX_SERVICES} services. Delete or reuse one before adding more.` };
  }

  // What the service may say it uses: this business's own equipment and vehicles, nothing else.
  let resources;
  try {
    resources = await data.capacity.listResources(business.id);
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    throw e;
  }
  const parsed = parseServiceForm(formData, business, resources);
  if (!parsed.ok) return { message: "Check the highlighted fields and try again.", errors: parsed.errors };

  // New services go to the end of the menu.
  const sort = existing ? existing.sort : business.services.reduce((max, s) => Math.max(max, s.sort), -1) + 1;
  try {
    await data.upsertService(business.id, { ...parsed.value, id: existing?.id, sort });
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("upsertService failed", e);
    return { message: "We couldn't save that service just now. Try again in a minute." };
  }
  refreshBusiness(business.slug);
  return { ok: true, message: existing ? `Saved ${parsed.value.name}.` : `Added ${parsed.value.name} to your menu.` };
}

export async function deleteServiceAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const owned = await ownedBusiness(formData.get("businessId"));
  if (!owned.ok) return { message: owned.error };
  const { business } = owned;
  const id = parseId(formData.get("serviceId"));
  const service = id ? business.services.find(s => s.id === id) : undefined;
  if (!service) return { message: "That service isn't on your menu any more. Refresh the page to see the latest." };
  try {
    await data.deleteService(service.id);
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("deleteService failed", e);
    return { message: "We couldn't delete that service just now. Try again in a minute." };
  }
  refreshBusiness(business.slug);
  return { ok: true, message: `Deleted ${service.name}. Past bookings keep their details.` };
}
