import "server-only";
// Crew and equipment (supabase back end): the resources and service_resources tables (RLS
// limits writes to the owner) and the service_needs and busy_resources functions.

import { createClient } from "../supabase/server";
import { fromPostgrest } from "./errors";
import type { CapacitySource } from "./source";
import type { Resource, ServiceNeed } from "../types";
import { Row, must, uid } from "./supabase-core";

export function mapResource(r: Row): Resource {
  return {
    id: r.id,
    businessId: r.business_id,
    kind: r.kind,
    name: r.name,
    quantity: r.quantity,
    notes: r.notes ?? "",
    active: r.active,
    sort: r.sort,
  };
}

export const supabaseCapacity: CapacitySource = {
  async listResources(businessId) {
    await uid();
    const sb = await createClient();
    const rows = await must(sb.from("resources").select("*").eq("business_id", businessId).order("sort").order("name"));
    return (rows as Row[]).map(mapResource);
  },

  async upsertResource(businessId, input) {
    await uid();
    const sb = await createClient();
    const row = {
      business_id: businessId,
      kind: input.kind,
      name: input.name.trim(),
      quantity: input.quantity,
      notes: input.notes.trim(),
      active: input.active,
      ...(input.sort !== undefined ? { sort: input.sort } : {}),
    };
    const q = input.id
      ? sb.from("resources").update(row).eq("id", input.id).eq("business_id", businessId).select().single()
      : sb.from("resources").insert(row).select().single();
    return mapResource(await must(q, "We couldn't save that item."));
  },

  async deleteResource(id) {
    await uid();
    const sb = await createClient();
    // Cascades: services stop needing it, and old reservations of it go too.
    const { error } = await sb.from("resources").delete().eq("id", id);
    if (error) throw fromPostgrest(error, "We couldn't remove that item.");
  },

  async getServiceNeeds(businessId, serviceIds) {
    if (!serviceIds.length) return [];
    const sb = await createClient();
    const rows = (await must(sb.rpc("service_needs", { p_business: businessId, p_service_ids: serviceIds }))) as Row[];
    // One row per service and resource; a service with no equipment gives one row with no resource.
    const byService = new Map<string, ServiceNeed>();
    for (const r of rows) {
      let need = byService.get(r.service_id);
      if (!need) byService.set(r.service_id, (need = { serviceId: r.service_id, peopleNeeded: r.people_needed ?? 1, resources: [] }));
      if (r.resource_id) {
        need.resources.push({ resourceId: r.resource_id, name: r.resource_name, kind: r.resource_kind, stock: r.resource_quantity ?? 0, needed: r.needed ?? 1 });
      }
    }
    return [...byService.values()];
  },

  async getBusyResources(businessId, fromIso, toIso) {
    const sb = await createClient();
    const rows = (await must(sb.rpc("busy_resources", { p_business: businessId, p_from: fromIso, p_to: toIso }))) as Row[];
    return rows.map(r => ({ resourceId: r.resource_id, startsAt: r.starts_at, endsAt: r.ends_at, quantity: r.quantity }));
  },
};
