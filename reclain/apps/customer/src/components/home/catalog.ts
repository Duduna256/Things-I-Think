import "server-only";
import { cache } from "react";
import { data } from "@shared/lib/data";
import type { Area, Category } from "@shared/lib/types";
import { categoryCounts, groupAreas, treatmentIndex, venueIndex, type VenueOffer } from "./stats";
import type { SuggestIndex } from "./suggest";

// Everything the homepage and search page need about the catalogue, fetched once per request.

export const loadCatalog = cache(async () => {
  const [categories, areas, businesses] = await Promise.all([data.listCategories(), data.listAreas(), data.listBusinesses()]);
  return { categories, areas, businesses };
});

// Every business's menu names and prices, in one query, for the "from" prices behind
// "Trending" and the search suggestions.
export const loadOffers = cache(async (): Promise<VenueOffer[]> => {
  const [{ businesses }, index] = await Promise.all([loadCatalog(), data.listServiceIndex()]);
  const menus = new Map<string, { name: string; price: number }[]>();
  for (const s of index) {
    const list = menus.get(s.businessId) ?? [];
    list.push({ name: s.name, price: s.price });
    menus.set(s.businessId, list);
  }
  return businesses.map(b => ({ business: { id: b.id, slug: b.slug, palette: b.palette }, services: menus.get(b.id) ?? [] }));
});

export async function loadSuggestIndex(): Promise<SuggestIndex> {
  const [{ categories, areas, businesses }, offers] = await Promise.all([loadCatalog(), loadOffers()]);
  return {
    categories: categoryCounts(categories, businesses),
    treatments: treatmentIndex(offers),
    venues: venueIndex(businesses, areas),
  };
}

export function lookups(categories: Category[], areas: Area[]) {
  const cat = new Map(categories.map(c => [c.id, c]));
  const area = new Map(areas.map(a => [a.id, a]));
  return { cat: (id: string) => cat.get(id), area: (id: string) => area.get(id), areaGroups: groupAreas(areas) };
}
