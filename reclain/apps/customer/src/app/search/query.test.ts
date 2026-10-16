import { test } from "node:test";
import assert from "node:assert/strict";
import { hasFilters, hrefFor, MAX_QUERY, openOnFor, parseSearch, searchTitle } from "./query";

const known = { areas: ["ntinda", "kololo"], categories: ["braids", "barber"] };

test("parseSearch keeps known values and drops the rest", () => {
  assert.deepEqual(parseSearch({ q: "  knotless   braids ", area: "ntinda", cat: "braids", when: "today" }, known), {
    q: "knotless braids",
    area: "ntinda",
    cat: "braids",
    when: "today",
  });
  assert.deepEqual(parseSearch({ area: "atlantis", cat: "<script>", when: "yesterday" }, known), { q: "", area: "", cat: "", when: "" });
});

test("parseSearch takes the first of repeated params and caps the query", () => {
  const q = parseSearch({ q: ["a".repeat(200), "b"], area: ["kololo", "ntinda"] }, known);
  assert.equal(q.q.length, MAX_QUERY);
  assert.equal(q.area, "kololo");
});

test("parseSearch strips control characters", () => {
  assert.equal(parseSearch({ q: "fade\u0000\nnow" }, known).q, "fade now");
});

// Kampala is UTC+3. 2026-10-10 is a Saturday, 2026-10-11 a Sunday.
const saturday = new Date("2026-10-10T09:00:00Z");
const sundayEarly = new Date("2026-10-10T22:00:00Z"); // 01:00 Sunday in Kampala
const wednesday = new Date("2026-10-14T09:00:00Z");

test("when becomes weekdays in Kampala time", () => {
  assert.equal(openOnFor("", saturday), undefined);
  assert.deepEqual(openOnFor("today", saturday), [6]);
  assert.deepEqual(openOnFor("tomorrow", saturday), [0]);
  assert.deepEqual(openOnFor("today", sundayEarly), [0]);
  assert.deepEqual(openOnFor("tomorrow", sundayEarly), [1]);
  assert.deepEqual(openOnFor("weekend", wednesday), [6, 0]);
  assert.deepEqual(openOnFor("weekend", saturday), [6, 0]);
  assert.deepEqual(openOnFor("weekend", sundayEarly), [0]);
});

test("titles follow the filters", () => {
  const base = { count: 0, q: "", catName: "", areaName: "", when: "" as const };
  assert.equal(searchTitle({ ...base, count: 13 }), "All 13 businesses");
  assert.equal(searchTitle({ ...base, count: 1 }), "1 business to book");
  assert.equal(searchTitle({ ...base, count: 2, areaName: "Kololo" }), "2 businesses in Kololo");
  assert.equal(searchTitle({ ...base, count: 1, q: "fade" }), "1 match for “fade”");
  assert.equal(searchTitle({ ...base, count: 3, catName: "Braids & locs", areaName: "Ntinda" }), "3 matches for braids & locs in Ntinda");
  assert.equal(searchTitle({ ...base, count: 4, when: "today" }), "4 businesses open today");
  assert.equal(searchTitle({ ...base, q: "fade", areaName: "Kira" }), "Nothing for “fade” in Kira yet");
  assert.equal(searchTitle({ ...base, q: "fade", when: "weekend" }), "Nothing for “fade” open this weekend");
  assert.equal(searchTitle({ ...base, areaName: "Kira" }), "No businesses in Kira yet");
});

test("hrefFor builds clean links", () => {
  assert.equal(hrefFor({}), "/search");
  assert.equal(hrefFor({ q: "skin fade", cat: "", area: "kololo", when: "today" }), "/search?q=skin+fade&area=kololo&when=today");
  assert.equal(hasFilters({ q: "", area: "", cat: "", when: "" }), false);
  assert.equal(hasFilters({ q: "", area: "", cat: "", when: "today" }), true);
});
