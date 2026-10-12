import "server-only";
import { cache } from "react";
import { data } from "@/lib/data";
import type { Area, BusinessDetail, Category } from "@/lib/types";
import { categoryCounts, groupAreas, treatmentIndex, venueIndex, type VenueOffer } from "./stats";
import type { SuggestIndex } from "./suggest";

// Everything the homepage and search page need about the catalogue, fetched once per request.

export const loadCatalog = cache(async () => {
  const [categories, areas, businesses] = await Promise.all([data.listCategories(), data.listAreas(), data.listBusinesses()]);
  return { categories, areas, businesses };
});

// listBusinesses() carries service names but not prices, so the from-prices behind
// "Trending" and the search suggestions read each business's menu. Capped so a big
// catalogue can't turn one page view into hundreds of queries; see the report's
// shared change request for a single-query replacement.
const MENU_LIMIT = 48;

export const loadOffers = cache(async (): Promise<VenueOffer[]> => {
  const { businesses } = await loadCatalog();
  const details = await Promise.all(
    businesses.slice(0, MENU_LIMIT).map(b => data.getBusinessBySlug(b.slug).catch((): BusinessDetail | null => null)),
  );
  return details
    .filter((d): d is BusinessDetail => !!d)
    .map(d => ({ business: { id: d.id, slug: d.slug, palette: d.palette }, services: d.services.map(s => ({ name: s.name, price: s.price })) }));
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
