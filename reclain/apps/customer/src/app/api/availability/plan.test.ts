// Run: node --import tsx --test src/app/api/availability/plan.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { BusinessDetail, Service, Staff } from "@shared/lib/types";
import { dayRange, laterDates, nextAvailableDate, planFor, querySchema, slotsFor, toResponse, worthSearching } from "./plan";

const svc = (id: string, durationMin: number, latestStart: string | null = null): Service => ({
  id,
  businessId: "b",
  groupName: "Menu",
  name: id,
  description: "",
  durationMin,
  durationLabel: null,
  price: 10000,
  latestStart,
  sort: 0,
  active: true,
});
const staff = (id: string): Staff => ({ id, businessId: "b", name: id, role: "", rating: 5, sort: 0, active: true });

const venue: Pick<BusinessDetail, "visitMode" | "homeVisitFee" | "opensAt" | "closesAt" | "closedDays" | "services" | "staff"> = {
  visitMode: "both",
  homeVisitFee: 10000,
  opensAt: "08:00",
  closesAt: "12:00",
  closedDays: [0],
  services: [svc("cut", 60), svc("long", 300), svc("express", 30, "10:00"), svc("short", 15)],
  staff: [staff("a"), staff("b")],
};

// Tue 8 Jan 2030, with "now" far in the past so the lead time never interferes.
const DAY = "2030-01-08";
const opts = { now: new Date("2029-12-01T00:00:00Z"), stepMin: 30, minLeadMin: 60 };

function plan(ids: string[], who = "any") {
  const r = planFor(venue, ids, who);
  if (!r.ok) throw new Error(r.error);
  return r.plan;
}

test("the query is validated and services are de-duplicated", () => {
  const q = querySchema.parse({ business: "braid-republic", date: DAY, services: "cut, cut,long,", staff: undefined });
  assert.deepEqual(q.services, ["cut", "long"]);
  assert.equal(q.staff, "any");
  assert.equal(querySchema.safeParse({ business: "x", date: "8 Jan", services: "cut" }).success, false);
  assert.equal(querySchema.safeParse({ business: "x", date: DAY, services: " , " }).success, false);
  assert.equal(querySchema.safeParse({ business: "", date: DAY, services: "cut" }).success, false);
});

test("services and professionals must belong to the venue", () => {
  assert.equal(planFor(venue, ["cut", "nope"], "any").ok, false);
  assert.equal(planFor(venue, ["cut"], "zz").ok, false);
  assert.deepEqual(plan(["cut"], "b").staffIds, ["b"]);
  assert.deepEqual(plan(["cut"]).staffIds, ["a", "b"]);
});

test("the hold is at least 30 minutes and the earliest cut-off wins", () => {
  assert.equal(plan(["short"]).blockMin, 30);
  assert.equal(plan(["cut", "short"]).blockMin, 75);
  assert.equal(plan(["cut", "express"]).latestStartMin, 600);
});

test("a Kampala day as a UTC range", () => {
  assert.deepEqual(dayRange(DAY), { fromIso: "2030-01-07T21:00:00.000Z", toIso: "2030-01-08T21:00:00.000Z" });
});

test("express starts stop at the cut-off (finding F12)", () => {
  const r = slotsFor(plan(["express"]), DAY, [], opts);
  assert.equal(r.kind, "ok");
  if (r.kind !== "ok") return;
  assert.equal(r.slots.at(-1)!.time, "10:00");
});

test("closed, too long and full days", () => {
  assert.equal(slotsFor(plan(["cut"]), "2030-01-06", [], opts).kind, "closed"); // Sunday
  assert.equal(slotsFor(plan(["long"]), DAY, [], opts).kind, "too_long");
  const allDay = [
    { staffId: "a", startsAt: "2030-01-08T05:00:00Z", endsAt: "2030-01-08T09:00:00Z" },
    { staffId: "b", startsAt: "2030-01-08T05:00:00Z", endsAt: "2030-01-08T09:00:00Z" },
  ];
  assert.equal(slotsFor(plan(["cut"]), DAY, allDay, opts).kind, "full");
  assert.equal(slotsFor(plan(["cut"], "a"), DAY, allDay.slice(1), opts).kind, "ok", "b's bookings don't block a");
});

test("too late today", () => {
  const late = { ...opts, now: new Date("2030-01-08T08:00:00Z") }; // 11:00 Kampala
  assert.equal(slotsFor(plan(["cut"]), DAY, [], late).kind, "too_late");
});

test("the next free day skips closed and full days, within the booking window", () => {
  const bookable = ["2030-01-04", "2030-01-05", "2030-01-06", "2030-01-07", "2030-01-08"];
  assert.deepEqual(laterDates("2030-01-05", bookable), ["2030-01-06", "2030-01-07", "2030-01-08"]);
  assert.deepEqual(laterDates("2030-01-05", bookable, 2), ["2030-01-06", "2030-01-07"]);
  const busyMonday = [
    { staffId: "a", startsAt: "2030-01-07T05:00:00Z", endsAt: "2030-01-07T09:00:00Z" },
    { staffId: "b", startsAt: "2030-01-07T05:00:00Z", endsAt: "2030-01-07T09:00:00Z" },
  ];
  assert.equal(nextAvailableDate(plan(["cut"]), ["2030-01-06", "2030-01-07", "2030-01-08"], busyMonday, opts), "2030-01-08");
  assert.equal(nextAvailableDate(plan(["cut"]), ["2030-01-06", "2030-01-07"], busyMonday, opts), null);
});

test("only worth looking ahead when another day could help", () => {
  assert.equal(worthSearching({ kind: "full" }), true);
  assert.equal(worthSearching({ kind: "closed" }), true);
  assert.equal(worthSearching({ kind: "too_late" }), true);
  assert.equal(worthSearching({ kind: "too_long" }), false);
});

test("the JSON answer", () => {
  const r = slotsFor(plan(["cut"]), DAY, [], opts);
  const body = toResponse(DAY, r, null);
  assert.equal(body.kind, "ok");
  assert.deepEqual(Object.keys(body.slots[0]).sort(), ["staffIds", "startsAt", "time"]);
  assert.deepEqual(toResponse(DAY, { kind: "full" }, "2030-01-09"), { kind: "full", date: DAY, slots: [], nextAvailable: "2030-01-09" });
});
