import { test } from "node:test";
import assert from "node:assert/strict";
import { areaLinks, bookedToday, buildTrending, groupAreas, nextCount, reviewScore, scoreNote, treatmentIndex, type VenueOffer } from "./stats";
import type { Area, Category } from "../../lib/types";

// Kampala is UTC+3: 21:00 UTC is midnight in Kampala.
const kampala = (hh: number, mm = 0, ss = 0) => new Date(Date.UTC(2026, 9, 12, hh - 3, mm, ss));

test("booked today counts from Kampala midnight, one every 8 seconds", () => {
  assert.equal(bookedToday(kampala(0, 0, 0)), 0);
  assert.equal(bookedToday(kampala(0, 5)), 37);
  assert.equal(bookedToday(kampala(9)), 4050);
  assert.equal(bookedToday(kampala(23, 59, 59)), 10799);
});

test("booked today only goes up during the day", () => {
  let prev = -1;
  for (let h = 0; h < 24; h++) {
    const n = bookedToday(kampala(h, 30));
    assert.ok(n > prev);
    prev = n;
  }
});

test("the live counter never steps back, except at midnight", () => {
  assert.equal(nextCount(400, kampala(1)), 450); // catches up
  assert.equal(nextCount(460, kampala(1)), 460); // a slow clock doesn't make it drop
  assert.equal(nextCount(10790, kampala(0, 0, 40)), 5); // a new day starts again
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
