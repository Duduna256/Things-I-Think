// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { availableSlots, effectiveLocation, latestStart, priceBooking } from "./rules";
import { mobileMoneyError, normalizeMsisdn, networkOf } from "../phone";
import { addDays, formatDate, localParts, toInstant } from "../time";

// A Tuesday, well in the future, so "now" never gets in the way.
const DAY = "2030-01-08";
const FAR_PAST = new Date("2029-12-01T00:00:00Z");

const base = {
  date: DAY,
  opensAt: "08:00",
  closesAt: "12:00",
  closedDays: [0],
  blockMin: 90,
  staffIds: ["a", "b"],
  busy: [],
  now: FAR_PAST,
};

test("Kampala time conversions", () => {
  const t = toInstant(DAY, 10 * 60);
  assert.equal(t.toISOString(), "2030-01-08T07:00:00.000Z");
  assert.deepEqual(localParts(t), { date: DAY, minutes: 600, weekday: 2 });
  assert.equal(addDays("2030-01-31", 1), "2030-02-01");
  assert.equal(formatDate(DAY), "Tue 8 Jan");
});

test("slots run every 30 minutes and finish before closing", () => {
  const r = availableSlots(base);
  assert.equal(r.kind, "ok");
  if (r.kind !== "ok") return;
  assert.equal(r.slots[0].time, "08:00");
  assert.equal(r.slots.at(-1)!.time, "10:30"); // 10:30 + 90 min = 12:00
  assert.equal(r.slots.length, 6);
});

test("a busy professional frees the slot for the other one", () => {
  const busy = [{ staffId: "a", startsAt: toInstant(DAY, 8 * 60).toISOString(), endsAt: toInstant(DAY, 9 * 60).toISOString() }];
  const r = availableSlots({ ...base, busy });
  assert.equal(r.kind, "ok");
  if (r.kind !== "ok") return;
  assert.deepEqual(r.slots[0].staffIds, ["b"]);
  const one = availableSlots({ ...base, staffIds: ["a"], busy });
  assert.equal(one.kind, "ok");
  if (one.kind !== "ok") return;
  assert.equal(one.slots[0].time, "09:00");
});

test("closed days, too-long bookings, full days and late starts", () => {
  assert.equal(availableSlots({ ...base, date: addDays(DAY, 5) }).kind, "closed"); // Sunday
  assert.equal(availableSlots({ ...base, blockMin: 300 }).kind, "too_long");
  const busyAll = ["a", "b"].map(id => ({ staffId: id, startsAt: toInstant(DAY, 0).toISOString(), endsAt: toInstant(DAY, 24 * 60).toISOString() }));
  assert.equal(availableSlots({ ...base, busy: busyAll }).kind, "full");
  assert.equal(availableSlots({ ...base, now: toInstant(DAY, 11 * 60) }).kind, "too_late");
});

test("a latest start time cuts off later slots (express laundry)", () => {
  const r = availableSlots({ ...base, blockMin: 30, latestStartMin: 10 * 60 });
  assert.equal(r.kind, "ok");
  if (r.kind !== "ok") return;
  assert.equal(r.slots.at(-1)!.time, "10:00");
  assert.equal(latestStart([{ latestStart: "10:00" }, { latestStart: null }]), 600);
  assert.equal(latestStart([{ latestStart: null }]), null);
});

test("pricing adds the home fee only for venues that do both", () => {
  const svcs = [{ price: 40000, durationMin: 90 }, { price: 20000, durationMin: 0 }];
  assert.deepEqual(priceBooking({ visitMode: "both", homeVisitFee: 10000 }, svcs, "home"), {
    subtotal: 60000, homeFee: 10000, total: 70000, durationMin: 90, blockMin: 90,
  });
  assert.equal(priceBooking({ visitMode: "mobile", homeVisitFee: 10000 }, svcs, "venue").homeFee, 0);
  assert.equal(priceBooking({ visitMode: "salon", homeVisitFee: 10000 }, svcs, "home").homeFee, 0);
  assert.equal(priceBooking({ visitMode: "both", homeVisitFee: 0 }, [{ price: 25000, durationMin: 0 }], "venue").blockMin, 30);
  assert.equal(effectiveLocation("mobile", "venue"), "home");
  assert.equal(effectiveLocation("salon", "home"), "venue");
});

test("Ugandan mobile numbers", () => {
  assert.equal(normalizeMsisdn("0772 123 456"), "772123456");
  assert.equal(normalizeMsisdn("+256 752 123 456"), "752123456");
  assert.equal(normalizeMsisdn("0414 123 456"), null); // landline
  assert.equal(normalizeMsisdn("12345"), null);
  assert.equal(networkOf("772123456"), "mtn");
  assert.equal(networkOf("752123456"), "airtel");
  assert.equal(mobileMoneyError("mtn", "0772123456"), "");
  assert.match(mobileMoneyError("mtn", "0752123456"), /is on Airtel Money/);
  assert.match(mobileMoneyError("airtel", "0712"), /valid Ugandan mobile number/);
});

test("a job that needs two people is only free when two are free", () => {
  const busy = [{ staffId: "a", startsAt: toInstant(DAY, 8 * 60).toISOString(), endsAt: toInstant(DAY, 9 * 60).toISOString() }];
  const r = availableSlots({ ...base, blockMin: 60, peopleNeeded: 2, busy });
  assert.equal(r.kind, "ok");
  if (r.kind !== "ok") return;
  assert.equal(r.slots[0].time, "09:00");
  // Booking "b" as the lead still needs "a" free as crew, so the same applies.
  const lead = availableSlots({ ...base, blockMin: 60, staffIds: ["b"], teamIds: ["a", "b"], peopleNeeded: 2, busy });
  assert.equal(lead.kind, "ok");
  if (lead.kind !== "ok") return;
  assert.equal(lead.slots[0].time, "09:00");
  assert.deepEqual(lead.slots[0].staffIds, ["b"]);
  // Three people can never be found in a team of two.
  assert.equal(availableSlots({ ...base, blockMin: 60, peopleNeeded: 3 }).kind, "full");
});

test("equipment on other bookings blocks a slot until it's free again", () => {
  const table = { resourceId: "table", name: "Massage table", kind: "equipment" as const, stock: 1, needed: 1 };
  const busyResources = [{ resourceId: "table", quantity: 1, startsAt: toInstant(DAY, 8 * 60).toISOString(), endsAt: toInstant(DAY, 10 * 60).toISOString() }];
  const r = availableSlots({ ...base, blockMin: 60, resources: [table], busyResources });
  assert.equal(r.kind, "ok");
  if (r.kind !== "ok") return;
  assert.equal(r.slots[0].time, "10:00");
  assert.equal(availableSlots({ ...base, blockMin: 60, resources: [{ ...table, stock: 0 }] }).kind, "full");
});
