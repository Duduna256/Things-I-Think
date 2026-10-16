// The capacity engine, kept pure so it can be tested without a server.
// A start time is free only when the business has enough free people (the lead professional
// plus any crew; people on other bookings, as lead or crew, are busy) AND enough free units of
// every piece of equipment or vehicle the services use. The database's create_booking() applies
// the same rules when the booking is made; this is how the apps work out, and explain, free times.

import type { BusySlot, BusyResource, ResourceKind, ServiceNeed } from "../types";
import { hhmm, parseHHMM, toInstant, weekdayOf } from "../time";

// Units of one resource a booking needs, with the stock to compare against.
export interface ResourceNeed {
  resourceId: string;
  name: string;
  kind: ResourceKind;
  stock: number; // 0 when the resource is hidden
  needed: number;
}

// What one booking takes: the most people any chosen service needs, and for each resource
// the most units any chosen service needs (the same as create_booking in the database).
export interface CapacityPlan {
  peopleNeeded: number;
  resources: ResourceNeed[];
}

export function combineNeeds(needs: ServiceNeed[]): CapacityPlan {
  let peopleNeeded = 1;
  const byId = new Map<string, ResourceNeed>();
  for (const need of needs) {
    peopleNeeded = Math.max(peopleNeeded, need.peopleNeeded);
    for (const r of need.resources) {
      const have = byId.get(r.resourceId);
      if (!have) byId.set(r.resourceId, { ...r });
      else have.needed = Math.max(have.needed, r.needed);
    }
  }
  return { peopleNeeded, resources: [...byId.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}

// Everything that can make a start time unavailable, in the order they're checked.
export type Constraint =
  | { kind: "past" }
  | { kind: "people"; needed: number; free: number; total: number }
  | { kind: "resource"; resourceId: string; name: string; resourceKind: ResourceKind; needed: number; inUse: number; stock: number };

export interface WindowInput {
  start: number; // epoch ms
  end: number;
  staffIds: string[]; // who may lead: one id for a chosen professional, everyone for "any"
  teamIds?: string[]; // everyone who could be crew (defaults to staffIds)
  peopleNeeded?: number; // default 1
  resources?: ResourceNeed[];
  busy: BusySlot[];
  busyResources?: BusyResource[];
}

export interface WindowCheck {
  free: boolean;
  leadIds: string[]; // professionals who could lead at this time (free, and allowed)
  blockers: Constraint[];
}

type Span = { start: number; end: number };
const overlapsSpan = (a: Span, start: number, end: number) => a.start < end && a.end > start;

export function toSpans(busy: BusySlot[]): (Span & { staffId: string | null })[] {
  return busy.map(b => ({ staffId: b.staffId, start: new Date(b.startsAt).getTime(), end: new Date(b.endsAt).getTime() }));
}

export function toResourceSpans(busy: BusyResource[]): (Span & { resourceId: string; quantity: number })[] {
  return busy.map(b => ({ resourceId: b.resourceId, quantity: b.quantity, start: new Date(b.startsAt).getTime(), end: new Date(b.endsAt).getTime() }));
}

// Units of one resource reserved by bookings that overlap a window.
export function unitsInUse(busy: BusyResource[], resourceId: string, start: number, end: number): number {
  return toResourceSpans(busy)
    .filter(b => b.resourceId === resourceId && overlapsSpan(b, start, end))
    .reduce((sum, b) => sum + b.quantity, 0);
}

// Can one window be staffed and equipped? Says who could lead and what stands in the way.
export function checkWindow(input: WindowInput): WindowCheck {
  const spans = toSpans(input.busy);
  const isBusy = (id: string) => spans.some(b => b.staffId === id && overlapsSpan(b, input.start, input.end));
  const team = input.teamIds ?? input.staffIds;
  const peopleNeeded = Math.max(1, input.peopleNeeded ?? 1);

  const leadIds = input.staffIds.filter(id => !isBusy(id));
  // The team is everyone who could be on the job: the possible leads plus the crew pool.
  const everyone = [...new Set([...input.staffIds, ...team])];
  const freePeople = everyone.filter(id => !isBusy(id)).length;

  const blockers: Constraint[] = [];
  if (!leadIds.length || freePeople < peopleNeeded) {
    blockers.push({ kind: "people", needed: peopleNeeded, free: leadIds.length ? freePeople : 0, total: everyone.length });
  }
  for (const r of input.resources ?? []) {
    const inUse = unitsInUse(input.busyResources ?? [], r.resourceId, input.start, input.end);
    if (r.stock - inUse < r.needed) {
      blockers.push({ kind: "resource", resourceId: r.resourceId, name: r.name, resourceKind: r.kind, needed: r.needed, inUse, stock: r.stock });
    }
  }
  return { free: blockers.length === 0, leadIds, blockers };
}

// The constraint in words, for the owner's slot checker: "Free", "Team: all 3 busy",
// "Massage table: 2 of 2 in use", "Patrol car: 1 of 1 out".
export function constraintText(c: Constraint): string {
  switch (c.kind) {
    case "past":
      return "Already passed";
    case "people":
      if (c.free === 0) return c.total === 1 ? "Team: busy" : `Team: all ${c.total} busy`;
      return `Team: ${c.free} of ${c.total} free, needs ${c.needed}`;
    case "resource": {
      if (c.stock === 0) return `${c.name}: hidden, so none to use`;
      if (c.stock < c.needed) return `${c.name}: needs ${c.needed}, you have ${c.stock}`;
      return `${c.name}: ${c.inUse} of ${c.stock} ${c.resourceKind === "vehicle" ? "out" : "in use"}`;
    }
  }
}

export function reasonText(blockers: Constraint[]): string {
  return blockers.length ? blockers.map(constraintText).join(" · ") : "Free";
}

// ---------- A whole day, start by start ----------

export interface DayInput {
  date: string; // local "YYYY-MM-DD"
  opensAt: string;
  closesAt: string;
  closedDays: number[];
  blockMin: number;
  latestStartMin?: number | null;
  staffIds: string[];
  teamIds?: string[];
  peopleNeeded?: number;
  resources?: ResourceNeed[];
  busy: BusySlot[];
  busyResources?: BusyResource[];
  now?: Date;
  stepMin?: number;
}

export interface SlotCheck {
  minutes: number;
  time: string; // "10:30"
  startsAt: string; // ISO instant
  free: boolean;
  leadIds: string[];
  blockers: Constraint[];
  reason: string;
}

export type DayCheck = { kind: "closed" } | { kind: "too_long" } | { kind: "ok"; slots: SlotCheck[] };

// Every start time of the day with its verdict (past times included, marked as gone).
export function checkDay(input: DayInput): DayCheck {
  const step = input.stepMin ?? 30;
  const nowMs = (input.now ?? new Date()).getTime();
  if (input.closedDays.includes(weekdayOf(input.date))) return { kind: "closed" };
  const open = parseHHMM(input.opensAt);
  const close = parseHHMM(input.closesAt);
  if (input.blockMin > close - open) return { kind: "too_long" };
  const lastStart = Math.min(close - input.blockMin, input.latestStartMin ?? Infinity);
  const slots: SlotCheck[] = [];
  for (let t = open; t <= lastStart; t += step) {
    const start = toInstant(input.date, t);
    const end = start.getTime() + input.blockMin * 60_000;
    if (start.getTime() < nowMs) {
      slots.push({ minutes: t, time: hhmm(t), startsAt: start.toISOString(), free: false, leadIds: [], blockers: [{ kind: "past" }], reason: constraintText({ kind: "past" }) });
      continue;
    }
    const check = checkWindow({ ...input, start: start.getTime(), end });
    slots.push({ minutes: t, time: hhmm(t), startsAt: start.toISOString(), free: check.free, leadIds: check.leadIds, blockers: check.blockers, reason: reasonText(check.blockers) });
  }
  return { kind: "ok", slots };
}

// The first free start on any of these days, in order. Null when none of them has one.
export function nextFreeStart(days: string[], input: Omit<DayInput, "date">): { date: string; slot: SlotCheck } | null {
  for (const date of days) {
    const day = checkDay({ ...input, date });
    if (day.kind !== "ok") continue;
    const slot = day.slots.find(s => s.free);
    if (slot) return { date, slot };
  }
  return null;
}
