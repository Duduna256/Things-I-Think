// Suggestions for the search box combobox: categories, services and businesses.
// Pure and browser-safe (the client component imports it), so relative imports only.

import { ugx } from "../../lib/format";

export interface SuggestCategory {
  id: string;
  name: string;
  icon: string;
  count: number; // published businesses in this category
}

export interface SuggestTreatment {
  name: string; // as the business wrote it, e.g. "Skin fade"
  count: number; // businesses offering it
  from: number; // lowest price, whole UGX
}

export interface SuggestVenue {
  slug: string;
  name: string;
  place: string; // "Ntinda, Kampala"
  rating: number;
  ratingCount: number;
}

export interface SuggestIndex {
  categories: SuggestCategory[];
  treatments: SuggestTreatment[];
  venues: SuggestVenue[];
}

export interface SuggestOption {
  kind: "cat" | "treat" | "venue";
  value: string; // category id, service name or business slug
  title: string;
  sub: string;
  icon: string;
}

export interface SuggestGroup {
  label: string;
  options: SuggestOption[];
}

export const LIMITS = { popular: 5, categories: 3, treatments: 4, venues: 4 };

export function venuesLabel(n: number): string {
  return `${n} ${n === 1 ? "business" : "businesses"}`;
}

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "braids" also finds "braid", "fades" finds "fade" (same rule as the search page).
function stem(word: string): string {
  return word.length > 3 ? word.replace(/(es|s)$/, "") : word;
}

function matches(text: string, words: string[]): boolean {
  const hay = normalise(text);
  return words.every(w => hay.includes(w) || hay.includes(stem(w)));
}

const catOption = (c: SuggestCategory, sub = venuesLabel(c.count)): SuggestOption => ({
  kind: "cat",
  value: c.id,
  title: c.name,
  sub,
  icon: c.icon,
});

export function buildSuggestions(query: string, index: SuggestIndex, limits = LIMITS): SuggestGroup[] {
  const words = normalise(query).split(" ").filter(Boolean);

  if (!words.length) {
    // Most-stocked categories first; equal counts keep the configured category order.
    const popular = index.categories
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.count > 0)
      .sort((a, b) => b.c.count - a.c.count || a.i - b.i)
      .slice(0, limits.popular)
      .map(({ c }) => catOption(c));
    return popular.length ? [{ label: "Popular categories", options: popular }] : [];
  }

  const groups: SuggestGroup[] = [];
  const cats = index.categories.filter(c => c.count > 0 && matches(`${c.name} ${c.id}`, words)).slice(0, limits.categories);
  if (cats.length) groups.push({ label: "Categories", options: cats.map(c => catOption(c)) });

  const treats = index.treatments.filter(t => matches(t.name, words)).slice(0, limits.treatments);
  if (treats.length) {
    groups.push({
      label: "Services",
      options: treats.map(t => ({
        kind: "treat",
        value: t.name,
        title: t.name,
        sub: `from ${ugx(t.from)} · ${venuesLabel(t.count)}`,
        icon: "clock",
      })),
    });
  }

  const venues = index.venues.filter(v => matches(`${v.name} ${v.place}`, words)).slice(0, limits.venues);
  if (venues.length) {
    groups.push({
      label: "Businesses",
      options: venues.map(v => ({
        kind: "venue",
        value: v.slug,
        title: v.name,
        sub: v.ratingCount ? `${v.place} · ${v.rating.toFixed(1)} ★` : `${v.place} · New`,
        icon: "store",
      })),
    });
  }
  return groups;
}

// The search URL for a set of filters, leaving out empty ones.
export function searchHref(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const v = value?.trim();
    if (v) qs.set(key, v);
  }
  const s = qs.toString();
  return s ? `/search?${s}` : "/search";
}
