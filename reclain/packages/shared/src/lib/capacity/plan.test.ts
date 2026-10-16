// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDay, checkWindow, combineNeeds, constraintText, nextFreeStart, reasonText, unitsInUse, type ResourceNeed } from "./plan";
import { toInstant } from "../time";
import type { BusyResource, BusySlot, ServiceNeed } from "../types";

// A Tuesday, far in the future.
const DAY = "2030-01-08";
const at = (h: number, m = 0) => toInstant(DAY, h * 60 + m);
const ms = (h: number, m = 0) => at(h, m).getTime();
const busySlot = (staffId: string, from: number, to: number): BusySlot => ({ staffId, startsAt: at(from).toISOString(), endsAt: at(to).toISOString() });
const busyRes = (resourceId: string, from: number, to: number, quantity: number): BusyResource => ({
  resourceId,
  quantity,
  startsAt: at(from).toISOString(),
  endsAt: at(to).toISOString(),
});

const table: ResourceNeed = { resourceId: "table", name: "Massage table", kind: "equipment", stock: 2, needed: 1 };
const car: ResourceNeed = { resourceId: "car", name: "Patrol car", kind: "vehicle", stock: 1, needed: 1 };

test("combineNeeds takes the most people and the most units per resource", () => {
  const needs: ServiceNeed[] = [
    { serviceId: "a", peopleNeeded: 1, resources: [{ resourceId: "table", name: "Massage table", kind: "equipment", stock: 2, needed: 1 }] },
    { serviceId: "b", peopleNeeded: 2, resources: [{ resourceId: "table", name: "Massage table", kind: "equipment", stock: 2, needed: 2 }, { resourceId: "car", name: "Patrol car", kind: "vehicle", stock: 1, needed: 1 }] },
  ];
  const plan = combineNeeds(needs);
  assert.equal(plan.peopleNeeded, 2);
  assert.deepEqual(plan.resources.map(r => [r.resourceId, r.needed]), [["table", 2], ["car", 1]]);
  assert.deepEqual(combineNeeds([]), { peopleNeeded: 1, resources: [] });
});

test("units in use only count overlapping bookings of that resource", () => {
  const busy = [busyRes("table", 9, 10, 1), busyRes("table", 9, 11, 1), busyRes("car", 9, 12, 1), busyRes("table", 12, 13, 2)];
  assert.equal(unitsInUse(busy, "table", ms(9, 30), ms(10, 30)), 2);
  assert.equal(unitsInUse(busy, "table", ms(10), ms(11)), 1); // the 9-10 one has ended
  assert.equal(unitsInUse(busy, "table", ms(11), ms(12)), 0);
  assert.equal(unitsInUse(busy, "car", ms(11), ms(12)), 1);
});

test("a window needs enough free people, lead included", () => {
  const team = ["a", "b", "c"];
  const base = { start: ms(9), end: ms(10), staffIds: team, busy: [busySlot("a", 9, 10)] };
  const one = checkWindow(base);
  assert.equal(one.free, true);
  assert.deepEqual(one.leadIds, ["b", "c"]);

  const two = checkWindow({ ...base, peopleNeeded: 2 });
  assert.equal(two.free, true);
  const three = checkWindow({ ...base, peopleNeeded: 3 });
  assert.equal(three.free, false);
  assert.deepEqual(three.blockers, [{ kind: "people", needed: 3, free: 2, total: 3 }]);

  // A chosen professional who is busy blocks it even if the rest of the team is free.
  const chosen = checkWindow({ ...base, staffIds: ["a"], teamIds: team, peopleNeeded: 2 });
  assert.equal(chosen.free, false);
  // Crew on another booking count as busy (busy_slots lists them like a lead).
  const crewBusy = checkWindow({ ...base, staffIds: ["b"], teamIds: team, peopleNeeded: 3, busy: [busySlot("a", 9, 10), busySlot("c", 9, 10)] });
  assert.equal(crewBusy.free, false);
  assert.deepEqual(crewBusy.blockers[0], { kind: "people", needed: 3, free: 1, total: 3 });
});

test("a window needs enough free units of each resource", () => {
  const base = { start: ms(9), end: ms(10), staffIds: ["a", "b"], resources: [table, car], busy: [] };
  assert.equal(checkWindow(base).free, true);
  const busyResources = [busyRes("table", 9, 11, 2)];
  const r = checkWindow({ ...base, busyResources });
  assert.equal(r.free, false);
  assert.deepEqual(r.blockers, [{ kind: "resource", resourceId: "table", name: "Massage table", resourceKind: "equipment", needed: 1, inUse: 2, stock: 2 }]);
  // A hidden resource has no stock at all.
  const hidden = checkWindow({ ...base, resources: [{ ...car, stock: 0 }] });
  assert.equal(hidden.free, false);
  // The window after the tables free up is fine.
  assert.equal(checkWindow({ ...base, start: ms(11), end: ms(12), busyResources }).free, true);
});

test("constraints in words", () => {
  assert.equal(constraintText({ kind: "people", needed: 1, free: 0, total: 3 }), "Team: all 3 busy");
  assert.equal(constraintText({ kind: "people", needed: 1, free: 0, total: 1 }), "Team: busy");
  assert.equal(constraintText({ kind: "people", needed: 4, free: 2, total: 4 }), "Team: 2 of 4 free, needs 4");
  assert.equal(constraintText({ kind: "resource", resourceId: "t", name: "Massage table", resourceKind: "equipment", needed: 1, inUse: 2, stock: 2 }), "Massage table: 2 of 2 in use");
  assert.equal(constraintText({ kind: "resource", resourceId: "c", name: "Patrol car", resourceKind: "vehicle", needed: 1, inUse: 1, stock: 1 }), "Patrol car: 1 of 1 out");
  assert.equal(constraintText({ kind: "resource", resourceId: "c", name: "Patrol car", resourceKind: "vehicle", needed: 1, inUse: 0, stock: 0 }), "Patrol car: hidden, so none to use");
  assert.equal(constraintText({ kind: "resource", resourceId: "r", name: "Radio", resourceKind: "equipment", needed: 4, inUse: 0, stock: 2 }), "Radio: needs 4, you have 2");
  assert.equal(constraintText({ kind: "past" }), "Already passed");
  assert.equal(reasonText([]), "Free");
  assert.equal(reasonText([{ kind: "people", needed: 2, free: 1, total: 2 }, { kind: "resource", resourceId: "c", name: "Patrol car", resourceKind: "vehicle", needed: 1, inUse: 1, stock: 1 }]), "Team: 1 of 2 free, needs 2 · Patrol car: 1 of 1 out");
});

const day = {
  opensAt: "08:00",
  closesAt: "12:00",
  closedDays: [0],
  blockMin: 60,
  staffIds: ["a", "b"],
  busy: [busySlot("a", 8, 10), busySlot("b", 9, 10)],
  resources: [table],
  busyResources: [busyRes("table", 10, 12, 2)],
  now: new Date("2029-12-01T00:00:00Z"),
};

test("checkDay says why each start time is or isn't free", () => {
  const r = checkDay({ ...day, date: DAY });
  assert.equal(r.kind, "ok");
  if (r.kind !== "ok") return;
  assert.deepEqual(
    r.slots.map(s => [s.time, s.reason]),
    [
      ["08:00", "Free"],
      ["08:30", "Team: all 2 busy"], // b's 09:00 booking starts inside this hour
      ["09:00", "Team: all 2 busy"],
      ["09:30", "Team: all 2 busy · Massage table: 2 of 2 in use"],
      ["10:00", "Massage table: 2 of 2 in use"],
      ["10:30", "Massage table: 2 of 2 in use"],
      ["11:00", "Massage table: 2 of 2 in use"],
    ],
  );
  assert.deepEqual(r.slots[0].leadIds, ["b"]);
  assert.equal(checkDay({ ...day, date: "2030-01-06" }).kind, "closed");
  assert.equal(checkDay({ ...day, date: DAY, blockMin: 300 }).kind, "too_long");
  // Earlier today: gone, not free.
  const late = checkDay({ ...day, date: DAY, now: at(8, 15) });
  if (late.kind === "ok") assert.deepEqual([late.slots[0].reason, late.slots[1].reason], ["Already passed", "Team: all 2 busy"]);
});

test("nextFreeStart finds the first free start over several days", () => {
  const fullDay = { ...day, busy: [busySlot("a", 8, 12), busySlot("b", 8, 12)], busyResources: [] };
  // Everything is busy on DAY; the next day is a fresh calendar (busy times are on DAY only).
  const next = nextFreeStart([DAY, "2030-01-09"], fullDay);
  assert.equal(next?.date, "2030-01-09");
  assert.equal(next?.slot.time, "08:00");
  assert.equal(nextFreeStart(["2030-01-06"], fullDay), null); // Sunday: closed
});
