import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSuggestions, searchHref, venuesLabel, type SuggestIndex } from "./suggest";

const index: SuggestIndex = {
  categories: [
    { id: "cleaning", name: "Home cleaning", icon: "sparkle", count: 1 },
    { id: "braids", name: "Braids & locs", icon: "braid", count: 2 },
    { id: "barber", name: "Barbers", icon: "comb", count: 2 },
    { id: "nails", name: "Nails & beauty", icon: "polish", count: 0 },
    { id: "laundry", name: "Laundry", icon: "shirt", count: 1 },
  ],
  treatments: [
    { name: "Knotless braids (mid-back)", count: 1, from: 120000 },
    { name: "Skin fade", count: 2, from: 18000 },
    { name: "Deep clean", count: 1, from: 150000 },
  ],
  venues: [
    { slug: "braid-republic", name: "The Braid Republic", place: "Ntinda, Kampala", rating: 4.9, ratingCount: 1284 },
    { slug: "fade-kings", name: "Fade Kings Barbershop", place: "Wandegeya, Kampala", rating: 4.8, ratingCount: 2031 },
    { slug: "brand-new", name: "Brand New Spa", place: "Kira, Wakiso", rating: 0, ratingCount: 0 },
  ],
};

test("an empty query shows popular categories, busiest first, skipping empty ones", () => {
  const groups = buildSuggestions("  ", index);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, "Popular categories");
  assert.deepEqual(
    groups[0].options.map(o => o.value),
    ["braids", "barber", "cleaning", "laundry"],
  );
  assert.equal(groups[0].options[2].sub, "1 business");
  assert.equal(groups[0].options[0].sub, "2 businesses");
});

test("plural and singular business counts", () => {
  assert.equal(venuesLabel(1), "1 business");
  assert.equal(venuesLabel(0), "0 businesses");
  assert.equal(venuesLabel(3), "3 businesses");
});

test("a query matches categories, services and businesses in that order", () => {
  const groups = buildSuggestions("braid", index);
  assert.deepEqual(groups.map(g => g.label), ["Categories", "Services", "Businesses"]);
  assert.equal(groups[0].options[0].value, "braids");
  assert.equal(groups[1].options[0].value, "Knotless braids (mid-back)");
  assert.equal(groups[1].options[0].sub, "from UGX 120,000 · 1 business");
  assert.equal(groups[2].options[0].value, "braid-republic");
});

test("plural words still match (fades finds Skin fade)", () => {
  const groups = buildSuggestions("Fades", index);
  const services = groups.find(g => g.label === "Services");
  assert.ok(services);
  assert.equal(services.options[0].title, "Skin fade");
});

test("every word has to match", () => {
  assert.deepEqual(buildSuggestions("deep fade", index), []);
  const groups = buildSuggestions("clean deep", index);
  assert.equal(groups.find(g => g.label === "Services")?.options[0].title, "Deep clean");
});

test("businesses match by area too, and new ones say New", () => {
  const groups = buildSuggestions("kira", index);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].options[0].sub, "Kira, Wakiso · New");
});

test("categories with no businesses never show", () => {
  assert.deepEqual(buildSuggestions("nails", index), []);
});

test("limits cap each group", () => {
  const groups = buildSuggestions("a", index, { popular: 5, categories: 1, treatments: 1, venues: 1 });
  for (const g of groups) assert.equal(g.options.length, 1);
});

test("searchHref drops empty values", () => {
  assert.equal(searchHref({ q: "", area: "", when: "" }), "/search");
  assert.equal(searchHref({ q: " skin fade ", area: "ntinda", when: "" }), "/search?q=skin+fade&area=ntinda");
  assert.equal(searchHref({ cat: "braids", q: undefined }), "/search?cat=braids");
});
