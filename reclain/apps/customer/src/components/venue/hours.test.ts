import { test } from "node:test";
import assert from "node:assert/strict";
import { avatarColours, contrastRatio, fromPrice, groupServices, readableInk, todayText, weekRows } from "./hours";
import type { Service } from "@shared/lib/types";

// 2026-10-11 is a Sunday. 22:30 UTC on Saturday the 10th is already 01:30 on Sunday in Kampala.
const sundayKampala = new Date("2026-10-10T22:30:00Z");
const mondayKampala = new Date("2026-10-12T09:00:00Z");

const hours = { opensAt: "08:00", closesAt: "20:00", closedDays: [0] };

test("today text uses Kampala's weekday, not UTC's", () => {
  assert.equal(todayText(hours, sundayKampala), "Closed today");
  assert.equal(todayText(hours, mondayKampala), "Open today 08:00–20:00");
});

test("week rows start on Monday and mark today", () => {
  const rows = weekRows(hours, mondayKampala);
  assert.equal(rows[0].label, "Monday");
  assert.equal(rows[0].isToday, true);
  assert.equal(rows[6].label, "Sunday");
  assert.equal(rows[6].hours, "Closed");
  assert.equal(rows.filter(r => r.isToday).length, 1);
});

const svc = (over: Partial<Service>): Service => ({
  id: "x",
  businessId: "b",
  peopleNeeded: 1,
  groupName: "Cuts",
  name: "Cut",
  description: "",
  durationMin: 30,
  durationLabel: null,
  price: 10000,
  latestStart: null,
  sort: 0,
  active: true,
  ...over,
});

test("services group in the order their first service appears", () => {
  const groups = groupServices([
    svc({ id: "c", groupName: "Shaves", sort: 5 }),
    svc({ id: "a", groupName: "Cuts", sort: 0 }),
    svc({ id: "b", groupName: "Cuts", sort: 1 }),
    svc({ id: "d", groupName: "  ", sort: 9 }),
  ]);
  assert.deepEqual(groups.map(g => g.name), ["Cuts", "Shaves", "Services"]);
  assert.deepEqual(groups[0].services.map(s => s.id), ["a", "b"]);
});

test("from price is the cheapest service, or null with no menu", () => {
  assert.equal(fromPrice([{ price: 40000 }, { price: 12000 }]), 12000);
  assert.equal(fromPrice([]), null);
});

test("contrast ratio matches the WCAG formula", () => {
  assert.equal(Math.round(contrastRatio("#000000", "#ffffff")), 21);
  assert.equal(contrastRatio("#777", "#777"), 1);
});

test("readable ink picks the colour with more contrast", () => {
  assert.equal(readableInk("#2b1a4a"), "#ffffff"); // dark purple
  assert.equal(readableInk("#f6b9a3"), "#111013"); // peach
  assert.equal(readableInk("#e0b252"), "#111013"); // gold: white would be about 2:1
});

test("every avatar in the seed palettes reads at 4.5:1 or better", () => {
  const palettes: [string, string, string][] = [
    ["#2b1a4a", "#7b4fd6", "#f6b9a3"],
    ["#141416", "#3c3b48", "#e0b252"],
    ["#0f3b33", "#2f8f78", "#cde9c9"],
    ["#123a2b", "#3cae84", "#e3f6c8"],
    ["#151a22", "#34465c", "#9fb4cc"],
    ["#3a2408", "#c8741c", "#ffd88a"],
    ["#3a2a20", "#b48a6a", "#f7e3cf"],
  ];
  for (const p of palettes) {
    for (let i = 0; i < 3; i++) {
      const { background, color } = avatarColours(p, i);
      assert.ok(contrastRatio(background, color) >= 4.5, `${background} on ${color}`);
    }
  }
});
