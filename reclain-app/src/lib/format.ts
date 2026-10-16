// Small formatting helpers used across the app. No imports, so they work everywhere.

export function ugx(amount: number): string {
  return "UGX " + Math.round(amount).toLocaleString("en-US");
}

// 330 -> "5h 30min", 45 -> "45min", 0 -> ""
export function duration(mins: number): string {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function durationLabel(service: { durationMin: number; durationLabel: string | null }): string {
  return service.durationLabel || duration(service.durationMin);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// "Crew Peter" stays whole; "Aisha Nakato" -> "Aisha"
export function shortName(name: string): string {
  return name.startsWith("Crew ") ? name : name.split(" ")[0];
}

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Cover colours go into inline styles, so only plain #rrggbb is let through (the database
// enforces the same). Anything else falls back to the house palette.
export const DEFAULT_PALETTE: [string, string, string] = ["#2b1a4a", "#7b4fd6", "#f6b9a3"];
const HEX = /^#[0-9a-f]{6}$/i;
export function safePalette(value: unknown): [string, string, string] {
  return Array.isArray(value) && value.length === 3 && value.every(c => typeof c === "string" && HEX.test(c))
    ? (value as [string, string, string])
    : DEFAULT_PALETTE;
}
