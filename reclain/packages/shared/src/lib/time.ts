// Dates and times in the venue's local time (Kampala, UTC+3, no daylight saving).
// Dates are "YYYY-MM-DD" strings; times of day are minutes after midnight.

import { site } from "../config/site";

const OFFSET_MS = site.utcOffsetMinutes * 60_000;

// Local calendar parts of an instant.
export function localParts(at: Date | string) {
  const d = new Date(new Date(at).getTime() + OFFSET_MS);
  return {
    date: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
    weekday: d.getUTCDay(),
  };
}

export function todayLocal(now: Date = new Date()): string {
  return localParts(now).date;
}

// "2026-10-20" + 600 -> the UTC instant for 10:00 Kampala time
export function toInstant(date: string, minutes: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes) - OFFSET_MS);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// "08:30" -> 510
export function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m || 0);
}

// 510 -> "08:30"
export function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function weekdayShort(day: number): string {
  return WEEKDAYS[day];
}
export function weekdayLong(day: number): string {
  return WEEKDAYS_LONG[day];
}

// "2026-10-20" -> "Tue 20 Oct"
export function formatDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${WEEKDAYS[weekdayOf(date)]} ${d} ${MONTHS[m - 1]}`;
}

// "2026-10-20" -> "October 2026"
export function formatMonth(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

// ISO instant -> "Tue 20 Oct, 10:00" in local time
export function formatInstant(at: string | Date): string {
  const p = localParts(at);
  return `${formatDate(p.date)}, ${hhmm(p.minutes)}`;
}

// ISO instant -> "10:00"
export function formatTime(at: string | Date): string {
  return hhmm(localParts(at).minutes);
}

// Opening days as text: [0] closed -> "Mon–Sat"
export function openDaysText(closedDays: number[]): string {
  const open = [1, 2, 3, 4, 5, 6, 0].filter(d => !closedDays.includes(d));
  if (open.length === 7) return "Every day";
  if (open.length === 0) return "Closed";
  if (open.length === 6 && closedDays[0] === 0) return "Mon–Sat";
  return open.map(d => WEEKDAYS[d]).join(", ");
}
