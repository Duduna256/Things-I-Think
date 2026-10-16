import { test } from "node:test";
import assert from "node:assert/strict";
import { toInstant } from "@shared/lib/time";
import type { BusinessDetail, Service, ServiceNeed, Staff } from "@shared/lib/types";
import { needsSentence, runChecker } from "./checker";

const svc = (id: string, durationMin: number, peopleNeeded = 1): Service => ({
  id,
  businessId: "b",
  groupName: "Menu",
  name: id,
  description: "",
  durationMin,
  durationLabel: null,
  price: 10000,
  latestStart: null,
  peopleNeeded,
  sort: 0,
  active: true,
});
const staff = (id: string, active = true): Staff => ({ id, businessId: "b", name: id, role: "", rating: 5, sort: 0, active });

const venue: Pick<BusinessDetail, "visitMode" | "homeVisitFee" | "opensAt" | "closesAt" | "closedDays" | "services" | "staff"> = {
  visitMode: "mobile",
  homeVisitFee: 0,
  opensAt: "08:00",
  closesAt: "11:00",
  closedDays: [0],
  services: [svc("patrol", 60, 2), svc("guard", 60), svc("long", 300)],
  staff: [staff("a"), staff("b"), staff("c", false)],
};
const DAY = "2030-01-08"; // Tuesday
const at = (h: number) => toInstant(DAY, h * 60).toISOString();
const needs: ServiceNeed[] = [{ serviceId: "patrol", peopleNeeded: 2, resources: [{ resourceId: "car", name: "Patrol car", kind: "vehicle", stock: 1, needed: 1 }] }];
const base = { venue, needs, date: DAY, busy: [], busyResources: [], now: new Date("2029-12-01T00:00:00Z"), stepMin: 30, searchDays: 7 };

test("the needs sentence", () => {
  assert.equal(needsSentence(1, []), "1 person");
  assert.equal(needsSentence(2, [{ resourceId: "car", name: "Patrol car", kind: "vehicle", stock: 1, needed: 1 }, { resourceId: "r", name: "Two-way radio", kind: "equipment", stock: 6, needed: 4 }]), "2 people · 1 patrol car · 4 two-way radios");
});

test("each start time says what stands in the way, and hidden team members don't count", () => {
  const r = runChecker({ ...base, serviceIds: ["patrol"], busy: [{ staffId: "a", startsAt: at(8), endsAt: at(9) }], busyResources: [{ resourceId: "car", quantity: 1, startsAt: at(9), endsAt: at(10) }] });
  assert.equal(r.kind, "ok");
  if (r.kind !== "ok") return;
  assert.equal(r.needsText, "2 people · 1 patrol car");
  assert.deepEqual(
    r.slots.map(s => [s.time, s.reason]),
    [
      ["08:00", "Team: 1 of 2 free, needs 2"],
      ["08:30", "Team: 1 of 2 free, needs 2 · Patrol car: 1 of 1 out"],
      ["09:00", "Patrol car: 1 of 1 out"],
      ["09:30", "Patrol car: 1 of 1 out"],
      ["10:00", "Free"],
    ],
  );
  assert.equal(r.freeCount, 1);
  assert.equal(r.nextFree, null);
});

test("a full day points at the next free start", () => {
  const allDay = [
    { staffId: "a", startsAt: at(8), endsAt: at(11) },
    { staffId: "b", startsAt: at(8), endsAt: at(11) },
  ];
  const r = runChecker({ ...base, serviceIds: ["guard"], busy: allDay });
  assert.equal(r.kind, "ok");
  if (r.kind !== "ok") return;
  assert.equal(r.freeCount, 0);
  assert.deepEqual(r.nextFree, { date: "2030-01-09", time: "08:00" });
});

test("closed days and jobs longer than the day", () => {
  const closed = runChecker({ ...base, serviceIds: ["guard"], date: "2030-01-06" });
  assert.deepEqual(closed, { kind: "closed", needsText: "1 person", weekday: "Sun" });
  const long = runChecker({ ...base, serviceIds: ["long"] });
  assert.deepEqual(long, { kind: "too_long", needsText: "1 person", takes: "5h" });
});
