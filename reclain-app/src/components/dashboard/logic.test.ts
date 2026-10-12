import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adminOps,
  allowedActions,
  countUpcoming,
  dayBlocks,
  dayRange,
  greeting,
  hourTicks,
  isTaking,
  leavesNobodyActive,
  missingSentence,
  nowIndex,
  nowMarker,
  parseAdminTab,
  parseDateParam,
  parseStatusFilter,
  paymentPill,
  readiness,
  refusalReason,
  statusPill,
  takings,
  weekRange,
  weekStart,
} from "./logic";
import type { Booking } from "../../lib/types";

// 2026-10-12 is a Monday. 10:00 Kampala = 07:00Z.
const at = (iso: string) => new Date(iso);

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: "bk-1",
    ref: "RCL-ABC123",
    businessId: "biz-1",
    customerId: "cust-1",
    staffId: "st-1",
    staffName: "Aisha",
    startsAt: "2026-10-12T07:00:00.000Z",
    endsAt: "2026-10-12T08:00:00.000Z",
    location: "venue",
    address: "",
    notes: "",
    customerName: "Grace Nakato",
    customerPhone: "772123456",
    subtotal: 50000,
    homeFee: 0,
    total: 50000,
    currency: "UGX",
    status: "confirmed",
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    expiresAt: null,
    reminderSentAt: null,
    cancelledBy: null,
    createdAt: "2026-10-10T07:00:00.000Z",
    items: [],
    business: { id: "biz-1", slug: "x", name: "X", areaId: "a", categoryId: "c", coverWord: "x", palette: ["#000", "#111", "#222"], address: "", phone: null },
    hasReview: false,
    ...over,
  };
}

test("dayRange covers a Kampala day in UTC", () => {
  assert.deepEqual(dayRange("2026-10-12"), { fromIso: "2026-10-11T21:00:00.000Z", toIso: "2026-10-12T21:00:00.000Z" });
});

test("weekStart is the Monday", () => {
  assert.equal(weekStart("2026-10-12"), "2026-10-12"); // Monday
  assert.equal(weekStart("2026-10-18"), "2026-10-12"); // Sunday
  assert.equal(weekStart("2026-10-14"), "2026-10-12"); // Wednesday
  const w = weekRange("2026-10-15");
  assert.equal(w.start, "2026-10-12");
  assert.equal(w.end, "2026-10-18");
  assert.equal(w.fromIso, "2026-10-11T21:00:00.000Z");
  assert.equal(w.toIso, "2026-10-18T21:00:00.000Z");
});

test("parseDateParam keeps real dates only", () => {
  assert.equal(parseDateParam("2026-10-20", "x"), "2026-10-20");
  assert.equal(parseDateParam("2026-02-30", "x"), "x");
  assert.equal(parseDateParam("20-10-2026", "x"), "x");
  assert.equal(parseDateParam(["2026-10-20"], "x"), "x");
  assert.equal(parseDateParam(undefined, "x"), "x");
  assert.equal(parseDateParam("1900-01-01", "x"), "x");
});

test("greeting follows Kampala time", () => {
  assert.equal(greeting(at("2026-10-12T05:00:00Z")), "Morning"); // 08:00
  assert.equal(greeting(at("2026-10-12T10:00:00Z")), "Afternoon"); // 13:00
  assert.equal(greeting(at("2026-10-12T16:00:00Z")), "Evening"); // 19:00
});

test("takings count completed or paid, never cancelled or refunded", () => {
  assert.equal(isTaking(booking({ status: "completed" })), true);
  assert.equal(isTaking(booking({ status: "confirmed", paymentStatus: "paid", paymentMethod: "mtn" })), true);
  assert.equal(isTaking(booking({ status: "confirmed" })), false);
  assert.equal(isTaking(booking({ status: "cancelled", paymentStatus: "paid" })), false);
  assert.equal(isTaking(booking({ status: "completed", paymentStatus: "refunded" })), false);
  assert.equal(
    takings([booking({ status: "completed", total: 30000 }), booking({ status: "confirmed", total: 99999 }), booking({ paymentStatus: "paid", total: 20000 })]),
    50000,
  );
});

test("countUpcoming skips expired holds and closed bookings", () => {
  const now = at("2026-10-12T06:00:00Z");
  const list = [
    booking({ startsAt: "2026-10-12T07:00:00Z" }),
    booking({ startsAt: "2026-10-13T07:00:00Z", status: "pending_payment", expiresAt: "2026-10-12T05:00:00Z" }),
    booking({ startsAt: "2026-10-13T07:00:00Z", status: "pending_payment", expiresAt: "2026-10-12T09:00:00Z" }),
    booking({ startsAt: "2026-10-14T07:00:00Z", status: "cancelled" }),
    booking({ startsAt: "2026-10-30T07:00:00Z" }),
    booking({ startsAt: "2026-10-12T05:00:00Z" }), // already started
  ];
  assert.equal(countUpcoming(list, now, "2026-10-19T06:00:00Z"), 2);
});

test("venue actions follow the booking's state and the clock", () => {
  const before = at("2026-10-12T06:00:00Z");
  const during = at("2026-10-12T07:30:00Z");
  const after = at("2026-10-12T09:00:00Z");
  const b = booking();
  assert.deepEqual(allowedActions(b, before), { complete: false, noShow: false, cancel: true, cashPaid: true });
  assert.deepEqual(allowedActions(b, during), { complete: true, noShow: true, cancel: true, cashPaid: true });
  assert.deepEqual(allowedActions(b, after), { complete: true, noShow: true, cancel: false, cashPaid: true });
  assert.match(refusalReason("cancel", b, after) ?? "", /already finished/);
  assert.match(refusalReason("complete", b, before) ?? "", /once it has started/);

  const paidMomo = booking({ paymentMethod: "mtn", paymentStatus: "paid" });
  assert.equal(allowedActions(paidMomo, during).cashPaid, false);
  assert.equal(allowedActions(booking({ paymentStatus: "paid" }), during).cashPaid, false);

  const closed = booking({ status: "completed" });
  assert.deepEqual(allowedActions(closed, during), { complete: false, noShow: false, cancel: false, cashPaid: true });
  assert.deepEqual(allowedActions(booking({ status: "no_show" }), during), { complete: false, noShow: false, cancel: false, cashPaid: false });

  const pending = booking({ status: "pending_payment", paymentMethod: "airtel", expiresAt: "2026-10-12T06:30:00Z" });
  assert.equal(allowedActions(pending, before).cancel, true);
  assert.equal(allowedActions(pending, during).cancel, false); // the hold has expired
  assert.match(refusalReason("complete", pending, during) ?? "", /waiting for its payment/);
});

test("status and payment pills read well for the venue", () => {
  const now = at("2026-10-12T06:00:00Z");
  assert.deepEqual(statusPill(booking({ status: "no_show" }), now), { label: "No-show", tone: "err" });
  assert.deepEqual(statusPill(booking({ status: "pending_payment", expiresAt: "2026-10-12T05:00:00Z" }), now), { label: "Hold expired", tone: "mute" });
  assert.equal(paymentPill(booking()).label, "Cash on the day");
  assert.equal(paymentPill(booking({ paymentStatus: "paid" })).label, "Paid in cash");
  assert.equal(paymentPill(booking({ paymentMethod: "mtn", paymentStatus: "paid" })).label, "Paid · MTN MoMo");
  assert.equal(paymentPill(booking({ paymentMethod: "airtel", paymentStatus: "pending" })).label, "Waiting for Airtel Money");
  assert.deepEqual(paymentPill(booking({ status: "cancelled", paymentMethod: "card", paymentStatus: "paid" })), { label: "Paid · refund due", tone: "err" });
  assert.equal(paymentPill(booking({ status: "cancelled" })).label, "Not charged");
});

test("filters fall back to All", () => {
  assert.equal(parseStatusFilter("cancelled").statuses[0], "cancelled");
  assert.equal(parseStatusFilter("nonsense").key, "all");
  assert.equal(parseStatusFilter(undefined).statuses.length, 0);
});

test("day strip places bookings inside opening hours", () => {
  const now = at("2026-10-12T08:30:00Z"); // 11:30
  const list = [
    booking({ id: "a", startsAt: "2026-10-12T07:00:00Z", endsAt: "2026-10-12T08:00:00Z" }), // 10:00-11:00
    booking({ id: "b", startsAt: "2026-10-12T04:00:00Z", endsAt: "2026-10-12T06:00:00Z" }), // 07:00-09:00, opens 08:00
    booking({ id: "c", status: "cancelled" }),
  ];
  const blocks = dayBlocks(list, "2026-10-12", "08:00", "18:00", now);
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0], { id: "a", left: 20, width: 10, past: true });
  assert.deepEqual(blocks[1], { id: "b", left: 0, width: 10, past: true });
  assert.equal(nowMarker(now, "2026-10-12", "08:00", "18:00"), 35);
  assert.equal(nowMarker(now, "2026-10-13", "08:00", "18:00"), null);
  assert.equal(nowMarker(at("2026-10-12T16:00:00Z"), "2026-10-12", "08:00", "18:00"), null); // 19:00
  assert.deepEqual(hourTicks("08:30", "11:00").map(t => t.label), ["09", "10", "11"]);
  assert.equal(hourTicks("06:00", "22:00").length, 9); // every other hour on a long day
  assert.equal(nowIndex(list, at("2026-10-12T06:30:00Z")), 0);
  assert.equal(nowIndex(list, at("2026-10-12T09:00:00Z")), -1);
});

test("readiness lists what's left before review", () => {
  const items = readiness({ services: [], staff: [{ active: true }], phone: null, blurb: "", address: "", visitMode: "salon" });
  assert.equal(items.find(i => i.key === "service")?.done, false);
  assert.equal(items.find(i => i.key === "team")?.done, true);
  assert.equal(missingSentence(items), "add at least one service and add a phone number so we can text you new bookings");
  const mobile = readiness({ services: [{ active: true }], staff: [{ active: true }], phone: "772123456", blurb: "Hi", address: "", visitMode: "mobile" });
  assert.equal(mobile.some(i => i.key === "address"), false);
  assert.equal(missingSentence(mobile), "");
});

test("the last active team member can't be removed or hidden", () => {
  const team = [
    { id: "a", active: true },
    { id: "b", active: false },
  ];
  assert.equal(leavesNobodyActive(team, { id: "a", remove: true }), true);
  assert.equal(leavesNobodyActive(team, { id: "a", active: false }), true);
  assert.equal(leavesNobodyActive(team, { id: "b", remove: true }), false);
  assert.equal(leavesNobodyActive([...team, { id: "c", active: true }], { id: "a", remove: true }), false);
  assert.equal(leavesNobodyActive(team, { id: "b", active: true }), false);
  // Nobody active already: tidying up inactive people is fine.
  assert.equal(leavesNobodyActive([{ id: "x", active: false }], { id: "x", remove: true }), false);
});

test("admin moves", () => {
  assert.deepEqual(adminOps("pending"), ["approve", "send_back", "suspend"]);
  assert.deepEqual(adminOps("suspended"), ["unsuspend"]);
  assert.equal(parseAdminTab("published"), "published");
  assert.equal(parseAdminTab("hax"), "pending");
});
