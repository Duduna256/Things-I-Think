import "server-only";
// Crew and equipment (demo back end). Follows the same rules as the resources tables and the
// service_needs and busy_resources functions in the database (migration 10).

import { getSessionUser } from "../auth";
import { DataError } from "./errors";
import { db, liveBookingsIn, me, newId, owns } from "./demo-store";
import type { CapacitySource } from "./source";
import type { Resource, ServiceNeed } from "../types";

export const RESOURCE_NAME_MIN = 2;
export const RESOURCE_NAME_MAX = 60;
export const RESOURCE_NOTES_MAX = 200;
export const RESOURCE_QUANTITY_MAX = 999;

// Public data about a business is only public once it's live; its owner and admins always see it.
async function canSee(businessId: string): Promise<boolean> {
  const b = db().businesses.find(x => x.id === businessId);
  if (!b) return false;
  if (b.status === "published") return true;
  const user = await getSessionUser();
  return !!user && owns(user, businessId);
}

export const demoCapacity: CapacitySource = {
  async listResources(businessId) {
    const user = await me();
    if (!owns(user, businessId)) throw new DataError("forbidden", "You don't have access to that.");
    return db()
      .resources.filter(r => r.businessId === businessId)
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  },

  async upsertResource(businessId, input) {
    const user = await me();
    if (!owns(user, businessId)) throw new DataError("forbidden", "You don't have access to that.");
    const name = input.name.trim();
    if (name.length < RESOURCE_NAME_MIN || name.length > RESOURCE_NAME_MAX) {
      throw new DataError("invalid", `Give it a name of ${RESOURCE_NAME_MIN} to ${RESOURCE_NAME_MAX} characters.`);
    }
    if (input.kind !== "equipment" && input.kind !== "vehicle") throw new DataError("invalid", "Say whether it's equipment or a vehicle.");
    if (!Number.isInteger(input.quantity) || input.quantity < 0 || input.quantity > RESOURCE_QUANTITY_MAX) {
      throw new DataError("invalid", `How many do you have? A whole number from 0 to ${RESOURCE_QUANTITY_MAX}.`);
    }
    const notes = input.notes.trim();
    if (notes.length > RESOURCE_NOTES_MAX) throw new DataError("invalid", `Keep the notes under ${RESOURCE_NOTES_MAX} characters.`);
    const fields = { kind: input.kind, name, quantity: input.quantity, notes, active: input.active };
    if (input.id) {
      const r = db().resources.find(x => x.id === input.id && x.businessId === businessId);
      if (!r) throw new DataError("not_found", "That item isn't on your list any more.");
      Object.assign(r, fields, input.sort !== undefined ? { sort: input.sort } : {});
      return r;
    }
    const r: Resource = { id: newId("res"), businessId, sort: input.sort ?? db().resources.filter(x => x.businessId === businessId).length, ...fields };
    db().resources.push(r);
    return r;
  },

  async deleteResource(id) {
    const user = await me();
    const r = db().resources.find(x => x.id === id);
    if (!r || !owns(user, r.businessId)) throw new DataError("not_found", "That item isn't on your list any more.");
    db().resources = db().resources.filter(x => x.id !== id);
    // The database cascades: services stop needing it, and old reservations of it go too.
    db().serviceResources = db().serviceResources.filter(x => x.resourceId !== id);
    db().bookingResources = db().bookingResources.filter(x => x.resourceId !== id);
  },

  async getServiceNeeds(businessId, serviceIds) {
    if (!(await canSee(businessId))) return [];
    const wanted = new Set(serviceIds);
    return db()
      .services.filter(s => s.businessId === businessId && wanted.has(s.id))
      .map((s): ServiceNeed => ({
        serviceId: s.id,
        peopleNeeded: s.peopleNeeded,
        resources: db()
          .serviceResources.filter(sr => sr.serviceId === s.id)
          .flatMap(sr => {
            const r = db().resources.find(x => x.id === sr.resourceId);
            return r ? [{ resourceId: r.id, name: r.name, kind: r.kind, stock: r.active ? r.quantity : 0, needed: sr.quantity }] : [];
          }),
      }));
  },

  async getBusyResources(businessId, fromIso, toIso) {
    if (!(await canSee(businessId))) return [];
    return liveBookingsIn(businessId, fromIso, toIso).flatMap(b =>
      db()
        .bookingResources.filter(r => r.bookingId === b.id)
        .map(r => ({ resourceId: r.resourceId, startsAt: b.startsAt, endsAt: b.endsAt, quantity: r.quantity })),
    );
  },
};
