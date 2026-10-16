// Run: node --import tsx --test src/components/booking/flow-state.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Service } from "@shared/lib/types";
import {
  allowedLocation,
  errorFix,
  errorText,
  flowQuery,
  groupServices,
  isAvailability,
  loginHref,
  parseFlowQuery,
  payMethodsFor,
  preferredDate,
  stepsFor,
  type FlowContext,
} from "./flow-state";

// 2030-01-06 is a Sunday.
const DATES = ["2030-01-06", "2030-01-07", "2030-01-08", "2030-01-09"];
const NOW = new Date("2030-01-06T05:00:00Z"); // 08:00 Kampala, Sunday

const ctx: FlowContext = {
  menuIds: ["a", "b", "c"],
  staffIds: ["s1", "s2"],
  skipProfessional: false,
  visitMode: "both",
  homeVisitsOn: true,
  closedDays: [0],
  dates: DATES,
  payMethods: ["mtn", "airtel", "card", "cash"],
  now: NOW,
  minLeadMinutes: 60,
};

const svc = (id: string, groupName: string): Service => ({
  id,
  businessId: "b",
  peopleNeeded: 1,
  groupName,
  name: id,
  description: "",
  durationMin: 60,
  durationLabel: null,
  price: 1000,
  latestStart: null,
  sort: 0,
  active: true,
});

test("steps skip the professional when the venue says so", () => {
  assert.deepEqual(stepsFor(false), ["services", "pro", "time", "confirm"]);
  assert.deepEqual(stepsFor(true), ["services", "time", "confirm"]);
});

test("home visits only where the venue offers them and the feature is on", () => {
  assert.equal(allowedLocation("both", "home", true), "home");
  assert.equal(allowedLocation("both", "home", false), "venue");
  assert.equal(allowedLocation("salon", "home", true), "venue");
  assert.equal(allowedLocation("mobile", "venue", false), "home");
});

test("payment methods follow the feature flags and the venue's cash setting", () => {
  const all = { mobileMoney: true, cardPayments: true, cashPayments: true };
  assert.deepEqual(payMethodsFor(all, true), ["mtn", "airtel", "card", "cash"]);
  assert.deepEqual(payMethodsFor(all, false), ["mtn", "airtel", "card"]);
  assert.deepEqual(payMethodsFor({ mobileMoney: false, cardPayments: false, cashPayments: true }, true), ["cash"]);
});

test("the menu is grouped in the venue's order", () => {
  const groups = groupServices([svc("a", "Braids"), svc("b", "Locs"), svc("c", "Braids"), svc("d", " ")]);
  assert.deepEqual(
    groups.map(g => [g.name, g.services.map(s => s.id)]),
    [
      ["Braids", ["a", "c"]],
      ["Locs", ["b"]],
      ["Services", ["d"]],
    ],
  );
});

test("the first open day is preferred", () => {
  assert.equal(preferredDate(DATES, [0]), "2030-01-07");
  assert.equal(preferredDate(DATES, [0, 1, 2, 3, 4, 5, 6]), "2030-01-06");
});

test("?service= preselects one service on the venue's menu", () => {
  const sel = parseFlowQuery({ service: "b" }, ctx);
  assert.deepEqual(sel.serviceIds, ["b"]);
  assert.equal(sel.step, "services");
  assert.equal(sel.staffId, null);
  assert.equal(sel.date, "2030-01-07"); // Sunday is closed
  assert.equal(sel.pay, "mtn");
  assert.deepEqual(parseFlowQuery({ service: "zzz" }, ctx).serviceIds, []);
});

test("a full selection survives the trip to /login and back", () => {
  const at = "2030-01-08T07:00:00.000Z"; // 10:00 Kampala on Tue 8 Jan
  const start = parseFlowQuery(
    { services: "a,c", loc: "home", pro: "s2", date: "2030-01-08", at, pay: "cash", step: "confirm" },
    ctx,
  );
  assert.deepEqual(start, {
    serviceIds: ["a", "c"],
    location: "home",
    staffId: "s2",
    date: "2030-01-08",
    slot: { startsAt: at, time: "10:00" },
    step: "confirm",
    pay: "cash",
  });
  const href = loginHref("braid-republic", start);
  assert.ok(href.startsWith("/login?next=%2Fbook%2Fbraid-republic%3F"));
  const next = decodeURIComponent(href.slice("/login?next=".length));
  const back = parseFlowQuery(Object.fromEntries(new URLSearchParams(next.split("?")[1])), ctx);
  assert.deepEqual(back, start);
  assert.ok(!flowQuery(start).includes("name"), "no personal details in the URL");
});

test("restored state that no longer fits is dropped, not trusted", () => {
  // Unknown services and staff, a closed day, a time that has passed, a method not on offer.
  const sel = parseFlowQuery(
    { services: "a,x,a", pro: "nobody", date: "2030-01-06", at: "2030-01-06T05:30:00Z", pay: "bitcoin", step: "confirm" },
    { ...ctx, payMethods: ["mtn", "card"] },
  );
  assert.deepEqual(sel.serviceIds, ["a"]);
  assert.equal(sel.staffId, null);
  assert.equal(sel.date, "2030-01-07");
  assert.equal(sel.slot, null);
  assert.equal(sel.pay, "mtn");
  assert.equal(sel.step, "services"); // no professional yet
});

test("a slot on a different day from the chosen date is ignored", () => {
  const sel = parseFlowQuery({ services: "a", pro: "any", date: "2030-01-08", at: "2030-01-09T07:00:00Z", step: "confirm" }, ctx);
  assert.equal(sel.slot, null);
  assert.equal(sel.step, "time");
});

test("venues that skip the professional always book 'any'", () => {
  const sel = parseFlowQuery({ services: "a", pro: "s1", step: "time" }, { ...ctx, skipProfessional: true });
  assert.equal(sel.staffId, "any");
  assert.equal(sel.step, "time");
});

test("availability answers are checked before use", () => {
  assert.equal(isAvailability({ kind: "ok", date: "2030-01-07", slots: [{ time: "10:00", startsAt: "x", staffIds: [] }], nextAvailable: null }), true);
  assert.equal(isAvailability({ kind: "full", date: "2030-01-07", slots: [], nextAvailable: "2030-01-08" }), true);
  assert.equal(isAvailability({ kind: "nope", date: "d", slots: [], nextAvailable: null }), false);
  assert.equal(isAvailability({ error: "Bad" }), false);
  assert.equal(isAvailability(null), false);
  assert.equal(errorText({ error: "Pick a day" }), "Pick a day");
  assert.equal(errorText({ error: 4 }), null);
  assert.equal(errorText(null), null);
});

test("errorFix offers another time only for errors about the time", () => {
  const fix = (error: string, kind = "invalid") => errorFix({ error, kind });
  assert.equal(fix("That slot was just taken. Pick another time.", "conflict"), "time");
  assert.equal(fix("That time has already passed."), "time");
  assert.equal(fix("That time is too soon. Pick a later slot."), "time");
  assert.equal(fix("Pick one of the times shown."), "time");
  assert.equal(fix("The venue is closed that day."), "time");
  assert.equal(fix("That time is outside opening hours."), "time");
  assert.equal(fix("One of those services has to start earlier in the day."), "time");
  assert.equal(fix("Pick a day in the next 14 days."), "time");
  assert.equal(fix("You already have 6 upcoming bookings. Cancel one, or wait until one is done, to book another."), "bookings");
  assert.equal(fix("That's a lot of bookings for one day. Try again tomorrow, or call the venue."), "bookings");
  assert.equal(fix("This venue isn't taking bookings right now.", "not_found"), null);
  assert.equal(fix("We couldn't save your booking. Try again in a minute.", "unavailable"), null);
  assert.equal(fix("One of those services is no longer available."), null);
});
