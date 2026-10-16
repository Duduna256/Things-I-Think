// Choices the dashboard forms offer: cover palettes, service lengths, times of day and the
// visit-mode wording. Plain constants (relative imports only), safe in client components.

import { duration } from "@shared/lib/format";
import { hhmm } from "@shared/lib/time";
import type { VisitMode } from "@shared/lib/types";

export interface PalettePreset {
  id: string;
  name: string;
  colors: [string, string, string]; // dark, mid, light: the cover word is white on the dark end
}

// Ten curated covers. Each starts dark so the big white word stays readable.
export const PALETTES: PalettePreset[] = [
  { id: "jacaranda", name: "Jacaranda", colors: ["#2b1a4a", "#7b4fd6", "#f6b9a3"] },
  { id: "night-gold", name: "Night gold", colors: ["#141416", "#3c3b48", "#e0b252"] },
  { id: "rosewood", name: "Rosewood", colors: ["#3b1d2a", "#c0587a", "#ffd3c2"] },
  { id: "coffee", name: "Coffee", colors: ["#2a1d14", "#8a5a3b", "#f0c27a"] },
  { id: "forest", name: "Forest", colors: ["#0f3b33", "#2f8f78", "#cde9c9"] },
  { id: "lake", name: "Lake blue", colors: ["#0d2c4d", "#2f7fd1", "#bfe3ff"] },
  { id: "hibiscus", name: "Hibiscus", colors: ["#4a1030", "#e0457b", "#ffd0dc"] },
  { id: "mango", name: "Mango", colors: ["#3a2408", "#c8741c", "#ffd88a"] },
  { id: "slate", name: "Slate", colors: ["#151a22", "#34465c", "#9fb4cc"] },
  { id: "dusk", name: "Dusk", colors: ["#1f1a3a", "#4a3fa0", "#ff9e7a"] },
];

export const CURRENT_PALETTE = "current";

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x.toLowerCase() === b[i].toLowerCase());

// The preset id for a palette, or "current" when the business uses colours of its own.
export function paletteIdFor(colors: readonly string[]): string {
  return PALETTES.find(p => same(p.colors, colors))?.id ?? CURRENT_PALETTE;
}

// A sensible first cover word for each category.
export const COVER_WORDS: Record<string, string> = {
  braids: "braids",
  barber: "fade",
  hair: "silk",
  massage: "knead",
  nails: "gloss",
  laundry: "fold",
  cleaning: "shine",
  escort: "safe",
  repairs: "fixed",
  bridal: "I do",
};

// Categories where the pro nearly always goes to the customer.
export const MOBILE_CATEGORIES = ["laundry", "cleaning", "escort", "repairs"];

export const COVER_WORD_MAX = 12;
export const BLURB_MAX = 400;

// Service lengths offered in the menu editor. 0 is for pickups and drop-offs (laundry).
export const DURATIONS: number[] = [0, 15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 480, 540, 600, 720];

export function durationOptions(current?: number): { value: number; label: string }[] {
  const values = current !== undefined && !DURATIONS.includes(current) ? [...DURATIONS, current].sort((a, b) => a - b) : DURATIONS;
  return values.map(v => ({ value: v, label: v === 0 ? "No set time (pickup or drop-off)" : duration(v) }));
}

// "00:00" to "23:30" in 30-minute steps, plus the current value if it's off the grid.
export function halfHours(current?: string | null): string[] {
  const list = Array.from({ length: 48 }, (_, i) => hhmm(i * 30));
  if (current && /^\d{2}:\d{2}$/.test(current) && !list.includes(current)) {
    list.push(current);
    list.sort();
  }
  return list;
}

export const VISIT_MODES: { value: VisitMode; title: string; body: string }[] = [
  { value: "salon", title: "Customers come to you", body: "They book a time and turn up at your salon, shop or studio." },
  { value: "both", title: "Both", body: "Customers choose: they come to you, or you go to them and charge a home-visit fee." },
  { value: "mobile", title: "You go to them", body: "Every booking happens at the customer's place. Good for cleaning, laundry pickups, repairs and security." },
];

// Monday first, the way the week is printed on shop doors.
export const WEEK: { day: number; short: string; long: string }[] = [
  { day: 1, short: "Mon", long: "Monday" },
  { day: 2, short: "Tue", long: "Tuesday" },
  { day: 3, short: "Wed", long: "Wednesday" },
  { day: 4, short: "Thu", long: "Thursday" },
  { day: 5, short: "Fri", long: "Friday" },
  { day: 6, short: "Sat", long: "Saturday" },
  { day: 0, short: "Sun", long: "Sunday" },
];
