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
