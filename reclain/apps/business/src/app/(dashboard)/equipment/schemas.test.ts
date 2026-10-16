import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCheckerQuery, parseResourceForm } from "./schemas";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

test("an item needs a kind, a name and a whole-number quantity", () => {
  const r = parseResourceForm(form({ kind: "equipment", name: "  Massage table ", quantity: " 2", notes: "Two rooms.", active: "on" }));
  assert.deepEqual(r, { ok: true, value: { kind: "equipment", name: "Massage table", quantity: 2, notes: "Two rooms.", active: true } });
  const hidden = parseResourceForm(form({ kind: "vehicle", name: "Patrol car", quantity: "0", notes: "" }));
  assert.equal(hidden.ok && hidden.value.active, false);
  assert.equal(hidden.ok && hidden.value.quantity, 0);

  const bad = parseResourceForm(form({ kind: "boat", name: "X", quantity: "two", notes: "n".repeat(201) }));
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.match(bad.errors.kind, /equipment or a vehicle/);
  assert.match(bad.errors.name, /at least 2/);
  assert.match(bad.errors.quantity, /0 to 999/);
  assert.match(bad.errors.notes, /under 200/);
  const many = parseResourceForm(form({ kind: "equipment", name: "Chairs", quantity: "1000", notes: "" }));
  assert.equal(many.ok, false);
});

const ctx = { serviceIds: ["svc-a", "svc-b", "svc-c"], today: "2030-01-08" };

test("the slot checker's query keeps only the menu's services, in menu order", () => {
  const blank = parseCheckerQuery({}, ctx);
  assert.deepEqual(blank, { asked: false, serviceIds: [], date: "2030-01-08", dateError: null, serviceError: null });

  const q = parseCheckerQuery({ services: ["svc-c", "svc-a", "svc-c", "../x", "svc-zzz"], date: "2030-01-10" }, ctx);
  assert.equal(q.asked, true);
  assert.deepEqual(q.serviceIds, ["svc-a", "svc-c"]);
  assert.equal(q.date, "2030-01-10");
  assert.equal(q.dateError, null);
  assert.equal(q.serviceError, null);

  const one = parseCheckerQuery({ services: "svc-b" }, ctx);
  assert.deepEqual(one.serviceIds, ["svc-b"]);
  assert.equal(one.date, ctx.today);

  const none = parseCheckerQuery({ services: ["nope"], date: "2030-01-09" }, ctx);
  assert.match(none.serviceError!, /at least one service/);
});

test("the slot checker's date falls back to today with a reason", () => {
  assert.match(parseCheckerQuery({ services: "svc-a", date: "yesterday" }, ctx).dateError!, /real date/);
  const past = parseCheckerQuery({ services: "svc-a", date: "2030-01-01" }, ctx);
  assert.equal(past.date, ctx.today);
  assert.match(past.dateError!, /already gone/);
  const far = parseCheckerQuery({ services: "svc-a", date: "2030-06-01" }, ctx);
  assert.equal(far.date, ctx.today);
  assert.match(far.dateError!, /next 60 days/);
  assert.equal(parseCheckerQuery({ services: "svc-a", date: "2030-03-08" }, ctx).dateError, null); // day 60
});
