// Reading /search?q=&area=&cat=&when= safely, and the words the results page shows.
// Pure (relative imports only) so it can be unit-tested.

import { localParts } from "../../lib/time";

export type When = "today" | "tomorrow" | "weekend";
export const WHEN_OPTIONS: { value: When; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "weekend", label: "This weekend" },
];

export interface SearchQuery {
  q: string;
  area: string; // a known area id, or ""
  cat: string; // a known category id, or ""
  when: When | "";
}

export type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";

export const MAX_QUERY = 80;

// Unknown areas, categories and "when" values are dropped rather than trusted.
export function parseSearch(raw: RawParams, known: { areas: string[]; categories: string[] }): SearchQuery {
  const printable = Array.from(first(raw.q), ch => (ch < " " ? " " : ch)).join("");
  const q = printable.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);
  const area = first(raw.area);
  const cat = first(raw.cat);
  const when = first(raw.when);
  return {
    q,
    area: known.areas.includes(area) ? area : "",
    cat: known.categories.includes(cat) ? cat : "",
    when: WHEN_OPTIONS.some(o => o.value === when) ? (when as When) : "",
  };
}

// Weekdays (0 = Sunday) a business must be open on, in Kampala time.
// "This weekend" on a Sunday means today only: Saturday has been and gone.
export function openOnFor(when: When | "", now: Date = new Date()): number[] | undefined {
  if (!when) return undefined;
  const today = localParts(now).weekday;
  if (when === "today") return [today];
  if (when === "tomorrow") return [(today + 1) % 7];
  return today === 0 ? [0] : [6, 0];
}

const WHEN_TEXT: Record<When, string> = { today: " open today", tomorrow: " open tomorrow", weekend: " open this weekend" };

export function searchTitle(opts: { count: number; q: string; catName: string; areaName: string; when: When | "" }): string {
  const { count, q, catName, areaName, when } = opts;
  const where = areaName ? ` in ${areaName}` : "";
  const whenText = when ? WHEN_TEXT[when] : "";
  const what = q ? `“${q}”` : catName ? catName.toLowerCase() : "";
  if (!count) {
    if (what) return `Nothing for ${what}${where}${whenText}${when ? "" : " yet"}`;
    return `No businesses${where}${whenText}${when ? "" : " yet"}`;
  }
  if (what) return `${count} ${count === 1 ? "match" : "matches"} for ${what}${where}${whenText}`;
  if (!where && !whenText) return count === 1 ? "1 business to book" : `All ${count} businesses`;
  return `${count} ${count === 1 ? "business" : "businesses"}${where}${whenText}`;
}

export function hasFilters(q: SearchQuery): boolean {
  return !!(q.q || q.area || q.cat || q.when);
}

// A link to /search with these filters, leaving out empty ones. Keys come out in a stable order.
export function hrefFor(q: Partial<SearchQuery>): string {
  const qs = new URLSearchParams();
  if (q.q) qs.set("q", q.q);
  if (q.area) qs.set("area", q.area);
  if (q.cat) qs.set("cat", q.cat);
  if (q.when) qs.set("when", q.when);
  const s = qs.toString();
  return s ? `/search?${s}` : "/search";
}
