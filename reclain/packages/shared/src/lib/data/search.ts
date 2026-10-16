// Search and filtering shared by both data sources, so results match in demo and live mode.
// Fine for hundreds of venues. Past a few thousand, move this into a Postgres full-text index.

import type { Area, Business, BusinessFilter, Category } from "../types";

// "braids" also matches "braid", "fades" matches "fade"
function stem(word: string): string {
  return word.length > 3 ? word.replace(/(es|s)$/, "") : word;
}

export function matchesQuery(b: Business, q: string, categories: Category[], areas: Area[]): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const category = categories.find(c => c.id === b.categoryId);
  const area = areas.find(a => a.id === b.areaId);
  const haystack = [b.name, b.blurb, category?.name ?? "", b.categoryId, area?.name ?? "", area?.region ?? "", ...(b.serviceNames ?? [])]
    .join(" ")
    .toLowerCase();
  return words.every(w => haystack.includes(w) || haystack.includes(stem(w)));
}

export function applyFilter(list: Business[], filter: BusinessFilter, categories: Category[], areas: Area[]): Business[] {
  let out = list.filter(
    b =>
      (!filter.categoryId || b.categoryId === filter.categoryId) &&
      (!filter.areaId || b.areaId === filter.areaId) &&
      (!filter.featured || b.isFeatured) &&
      (!filter.isNew || b.isNew) &&
      (!filter.openOn?.length || filter.openOn.some(d => !b.closedDays.includes(d))) &&
      (!filter.q || matchesQuery(b, filter.q, categories, areas)),
  );
  out = out.sort((a, b) => a.sort - b.sort || b.ratingAvg - a.ratingAvg);
  return filter.limit ? out.slice(0, filter.limit) : out;
}
