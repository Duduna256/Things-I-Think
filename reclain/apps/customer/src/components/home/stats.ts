// Numbers and groupings the homepage shows, worked out from real data.
// Pure (no server imports, relative paths only) so it can be unit-tested and used in client code.

import type { Area, Business, Category, Service } from "@shared/lib/types";
import { normalise, venuesLabel, type SuggestCategory, type SuggestTreatment, type SuggestVenue } from "./suggest";

// "12 bookings made today" under the hero search, counted from real bookings since midnight
// in Kampala. Below this many the line is left out: two bookings by lunchtime is nothing to
// shout about.
export const BOOKED_TODAY_MIN = 5;

// The number to show, or null to leave the line out (too few, or the count couldn't be had).
export function bookedTodayShown(count: number | null | undefined): number | null {
  return typeof count === "number" && Number.isFinite(count) && count >= BOOKED_TODAY_MIN ? Math.floor(count) : null;
}

export interface ReviewScore {
  avg: number; // rounded to one decimal
  count: number;
}

// Weighted average of every business's rating, by its number of reviews.
export function reviewScore(businesses: Pick<Business, "ratingAvg" | "ratingCount">[]): ReviewScore | null {
  const count = businesses.reduce((s, b) => s + Math.max(0, b.ratingCount), 0);
  if (!count) return null;
  const total = businesses.reduce((s, b) => s + b.ratingAvg * Math.max(0, b.ratingCount), 0);
  return { avg: Math.round((total / count) * 10) / 10, count };
}

export function scoreNote(score: ReviewScore): string {
  const from = `From ${score.count.toLocaleString("en-US")} ${score.count === 1 ? "review" : "reviews"}.`;
  const missing = (50 - Math.round(score.avg * 10)) / 10;
  if (missing <= 0) return `${from} Not one traffic jam on Jinja Road.`;
  return `${from} The missing ${missing.toFixed(1)} was a traffic jam on Jinja Road.`;
}

export interface VenueOffer {
  business: Pick<Business, "id" | "slug" | "palette">;
  services: Pick<Service, "name" | "price">[];
}

export interface TrendingTile {
  term: string;
  from: number;
  venueCount: number;
  palette: [string, string, string];
}

// content.trending matched to real services by name: lowest price and how many businesses offer it.
// Terms nobody offers are left out.
export function buildTrending(terms: readonly string[], offers: VenueOffer[]): TrendingTile[] {
  const tiles: TrendingTile[] = [];
  for (const term of terms) {
    const t = normalise(term);
    if (!t) continue;
    let from = Infinity;
    let palette: [string, string, string] | null = null;
    let venueCount = 0;
    for (const o of offers) {
      const hits = o.services.filter(s => normalise(s.name).includes(t));
      if (!hits.length) continue;
      venueCount++;
      palette ??= o.business.palette;
      from = Math.min(from, ...hits.map(s => s.price));
    }
    if (venueCount && palette) tiles.push({ term, from, venueCount, palette });
  }
  return tiles;
}

// Every distinct service name, with how many businesses offer it and the lowest price.
export function treatmentIndex(offers: VenueOffer[]): SuggestTreatment[] {
  const byName = new Map<string, { name: string; venues: Set<string>; from: number }>();
  for (const o of offers) {
    for (const s of o.services) {
      const key = normalise(s.name);
      if (!key) continue;
      const entry = byName.get(key) ?? { name: s.name.trim(), venues: new Set<string>(), from: Infinity };
      entry.venues.add(o.business.id);
      entry.from = Math.min(entry.from, s.price);
      byName.set(key, entry);
    }
  }
  return [...byName.values()]
    .map(e => ({ name: e.name, count: e.venues.size, from: e.from }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function placeLabel(area: Area | undefined): string {
  if (!area) return "";
  return area.region === area.name ? area.name : `${area.name}, ${area.region}`;
}

export function categoryCounts(categories: Category[], businesses: Pick<Business, "categoryId">[]): SuggestCategory[] {
  return categories.map(c => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    count: businesses.filter(b => b.categoryId === c.id).length,
  }));
}

export function venueIndex(businesses: Business[], areas: Area[]): SuggestVenue[] {
  return businesses.map(b => ({
    slug: b.slug,
    name: b.name,
    place: placeLabel(areas.find(a => a.id === b.areaId)),
    rating: b.ratingAvg,
    ratingCount: b.ratingCount,
  }));
}

export interface AreaGroup {
  region: string;
  areas: { id: string; name: string }[];
}

// Areas grouped by region, in the configured order (for the area <select>).
export function groupAreas(areas: Area[]): AreaGroup[] {
  const groups: AreaGroup[] = [];
  for (const a of [...areas].sort((x, y) => x.sort - y.sort)) {
    let g = groups.find(x => x.region === a.region);
    if (!g) groups.push((g = { region: a.region, areas: [] }));
    g.areas.push({ id: a.id, name: a.name });
  }
  return groups;
}

export interface AreaLink {
  href: string;
  title: string; // "Braids & locs in Ntinda"
  sub: string; // "2 businesses"
}

export interface RegionLinks {
  region: string;
  links: AreaLink[];
}

// "Browse by area": one link per category that has businesses in each area, grouped by region.
export function areaLinks(areas: Area[], categories: Category[], businesses: Pick<Business, "areaId" | "categoryId">[]): RegionLinks[] {
  const cats = [...categories].sort((a, b) => a.sort - b.sort);
  const out: RegionLinks[] = [];
  for (const group of groupAreas(areas)) {
    const links: AreaLink[] = [];
    for (const area of group.areas) {
      const here = businesses.filter(b => b.areaId === area.id);
      for (const c of cats) {
        const n = here.filter(b => b.categoryId === c.id).length;
        if (!n) continue;
        const qs = new URLSearchParams({ area: area.id, cat: c.id });
        links.push({ href: `/search?${qs}`, title: `${c.name} in ${area.name}`, sub: venuesLabel(n) });
      }
    }
    if (links.length) out.push({ region: group.region, links });
  }
  return out;
}
