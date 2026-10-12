// Opening hours, service groups and avatar colours for the venue page.
// Pure (relative imports only) so it can be unit-tested.

import { localParts, weekdayLong } from "../../lib/time";
import type { Business, Service } from "../../lib/types";

type Hours = Pick<Business, "opensAt" | "closesAt" | "closedDays">;

// "Open today 08:00–20:00" or "Closed today", in Kampala time.
export function todayText(b: Hours, now: Date = new Date()): string {
  const day = localParts(now).weekday;
  return b.closedDays.includes(day) ? "Closed today" : `Open today ${b.opensAt}–${b.closesAt}`;
}

export interface WeekRow {
  day: number;
  label: string; // "Monday"
  hours: string; // "08:00–20:00" or "Closed"
  isToday: boolean;
}

// Monday first, the way the week is printed on shop doors.
export function weekRows(b: Hours, now: Date = new Date()): WeekRow[] {
  const today = localParts(now).weekday;
  return [1, 2, 3, 4, 5, 6, 0].map(day => ({
    day,
    label: weekdayLong(day),
    hours: b.closedDays.includes(day) ? "Closed" : `${b.opensAt}–${b.closesAt}`,
    isToday: day === today,
  }));
}

export interface ServiceGroup {
  name: string;
  services: Service[];
}

// Services grouped by their group name, groups in the order their first service appears.
export function groupServices(services: Service[]): ServiceGroup[] {
  const groups: ServiceGroup[] = [];
  for (const s of [...services].sort((a, b) => a.sort - b.sort)) {
    const name = s.groupName.trim() || "Services";
    let g = groups.find(x => x.name === name);
    if (!g) groups.push((g = { name, services: [] }));
    g.services.push(s);
  }
  return groups;
}

export function fromPrice(services: Pick<Service, "price">[]): number | null {
  return services.length ? Math.min(...services.map(s => s.price)) : null;
}

// ---- Colour contrast ----

const INK = "#111013";
const WHITE = "#ffffff";

function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const full = m[1].length === 3 ? m[1].replace(/./g, c => c + c) : m[1];
  const [r, g, b] = [0, 2, 4].map(i => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return 1;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Ink or white, whichever reads better on this background (at least 4.5:1 for any colour).
export function readableInk(bg: string): string {
  return contrastRatio(bg, INK) >= contrastRatio(bg, WHITE) ? INK : WHITE;
}

// A team member's avatar colours: cycles through the business palette, text always readable.
export function avatarColours(palette: [string, string, string], i: number): { background: string; color: string } {
  const background = palette[(i + 1) % 3] ?? palette[0];
  return { background, color: readableInk(background) };
}
