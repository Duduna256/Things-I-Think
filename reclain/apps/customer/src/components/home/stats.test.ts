import { test } from "node:test";
import assert from "node:assert/strict";
import { areaLinks, BOOKED_TODAY_MIN, bookedTodayShown, buildTrending, groupAreas, reviewScore, scoreNote, treatmentIndex, type VenueOffer } from "./stats";
import type { Area, Category } from "@shared/lib/types";

test("the booked-today line shows real counts only once there are enough of them", () => {
  assert.equal(BOOKED_TODAY_MIN, 5);
  assert.equal(bookedTodayShown(BOOKED_TODAY_MIN), BOOKED_TODAY_MIN);
  assert.equal(bookedTodayShown(1284), 1284);
  assert.equal(bookedTodayShown(BOOKED_TODAY_MIN - 1), null);
  assert.equal(bookedTodayShown(0), null);
  // The count failed to load: no line, no made-up number.
  assert.equal(bookedTodayShown(null), null);
  assert.equal(bookedTodayShown(undefined), null);
  assert.equal(bookedTodayShown(Number.NaN), null);
});

test("review score is weighted by review count", () => {
  const score = reviewScore([
    { ratingAvg: 5, ratingCount: 100 },
    { ratingAvg: 4, ratingCount: 300 },
    { ratingAvg: 0, ratingCount: 0 },
  ]);
  assert.deepEqual(score, { avg: 4.3, count: 400 });
  assert.equal(reviewScore([{ ratingAvg: 0, ratingCount: 0 }]), null);
});

test("score note explains the missing points, and copes with a perfect 5", () => {
  assert.equal(scoreNote({ avg: 4.8, count: 9305 }), "From 9,305 reviews. The missing 0.2 was a traffic jam on Jinja Road.");
  assert.equal(scoreNote({ avg: 5, count: 1 }), "From 1 review. Not one traffic jam on Jinja Road.");
});

const offers: VenueOffer[] = [
  {
    business: { id: "a", slug: "a", palette: ["#000000", "#111111", "#222222"] },
    services: [
      { name: "Knotless braids (mid-back)", price: 120000 },
      { name: "Boho knotless braids", price: 160000 },
      { name: "Skin fade", price: 20000 },
    ],
  },
  {
    business: { id: "b", slug: "b", palette: ["#333333", "#444444", "#555555"] },
    services: [{ name: "Skin Fade", price: 18000 }],
  },
];

test("trending tiles: lowest price, number of businesses, first business's colours", () => {
  const tiles = buildTrending(["Knotless braids", "Skin fade", "Hot air balloon"], offers);
  assert.equal(tiles.length, 2);
  assert.deepEqual(tiles[0], { term: "Knotless braids", from: 120000, venueCount: 1, palette: ["#000000", "#111111", "#222222"] });
  assert.equal(tiles[1].from, 18000);
  assert.equal(tiles[1].venueCount, 2);
});

test("treatment index merges names case-insensitively", () => {
  const idx = treatmentIndex(offers);
  const fade = idx.find(t => t.name.toLowerCase() === "skin fade");
  assert.ok(fade);
  assert.equal(fade.count, 2);
  assert.equal(fade.from, 18000);
  assert.equal(idx[0], fade); // most offered first
});

const areas: Area[] = [
  { id: "kira", name: "Kira", region: "Wakiso", sort: 7 },
  { id: "ntinda", name: "Ntinda", region: "Kampala", sort: 3 },
  { id: "kololo", name: "Kololo", region: "Kampala", sort: 0 },
  { id: "mukono", name: "Mukono", region: "Mukono", sort: 10 },
];
const categories: Category[] = [
  { id: "braids", name: "Braids & locs", icon: "braid", isNew: false, sort: 1 },
  { id: "hair", name: "Hair salons", icon: "scissors", isNew: false, sort: 0 },
];

test("areas group by region in sort order", () => {
  const groups = groupAreas(areas);
  assert.deepEqual(groups.map(g => g.region), ["Kampala", "Wakiso", "Mukono"]);
  assert.deepEqual(groups[0].areas.map(a => a.id), ["kololo", "ntinda"]);
});

test("area links only list categories with businesses, and skip empty regions", () => {
  const regions = areaLinks(areas, categories, [
    { areaId: "kololo", categoryId: "braids" },
    { areaId: "kololo", categoryId: "hair" },
    { areaId: "kololo", categoryId: "hair" },
    { areaId: "kira", categoryId: "braids" },
  ]);
  assert.deepEqual(regions.map(r => r.region), ["Kampala", "Wakiso"]);
  assert.deepEqual(regions[0].links, [
    { href: "/search?area=kololo&cat=hair", title: "Hair salons in Kololo", sub: "2 businesses" },
    { href: "/search?area=kololo&cat=braids", title: "Braids & locs in Kololo", sub: "1 business" },
  ]);
});
