// The job log's rules, shared by both back ends, the Server Actions and the screens:
// which actions a booking allows right now, how a location reads, what a photo may be,
// and the order entries show in. Pure (relative imports only), so it's unit-tested.

import { formatDate, localParts, todayLocal } from "../time";
import type { Booking, JobEvent, JobEventKind } from "../types";

export type JobAction = "check_in" | "check_out" | "photo" | "note";
export const JOB_ACTIONS: JobAction[] = ["check_in", "check_out", "photo", "note"];

export const JOB_NOTE_MAX = 500;
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PHOTO_URL_SECONDS = 60 * 60; // how long a signed photo link lasts

type BookingLike = Pick<Booking, "status" | "startsAt">;
type EventLike = Pick<JobEvent, "kind">;

// The kind of entry each action writes.
export const ACTION_KIND: Record<JobAction, JobEventKind> = {
  check_in: "checked_in",
  check_out: "checked_out",
  photo: "photo",
  note: "note",
};

export const ACTION_LABEL: Record<JobAction, string> = {
  check_in: "Check in",
  check_out: "Check out",
  photo: "Add photo",
  note: "Add note",
};

export const KIND_LABEL: Record<JobEventKind, string> = {
  checked_in: "Checked in",
  checked_out: "Checked out",
  photo: "Photo",
  note: "Note",
};

export const ACTION_DONE: Record<JobAction, string> = {
  check_in: "Checked in. Add photos and notes as you go.",
  check_out: "Checked out. When you're done, mark the booking completed.",
  photo: "Photo added to the job log.",
  note: "Note added to the job log.",
};

export const hasCheckedIn = (events: EventLike[]) => events.some(e => e.kind === "checked_in");
export const hasCheckedOut = (events: EventLike[]) => events.some(e => e.kind === "checked_out");

// Why the business can't do this to the job log right now, or null when it can.
// The database trigger enforces the one-check-in, one-check-out and order rules too; the
// day-of-booking rule and the status rule live here (and in row security for the status).
export function jobActionRefusal(action: JobAction, b: BookingLike, events: EventLike[], now: Date): string | null {
  switch (b.status) {
    case "cancelled":
      return "This booking was cancelled, so its job log is closed.";
    case "no_show":
      return "This booking was a no-show, so its job log is closed.";
    case "pending_payment":
      return "This booking is still waiting for its payment. The job log opens once it's confirmed.";
    case "confirmed":
    case "completed":
      break;
  }
  switch (action) {
    case "check_in": {
      if (hasCheckedIn(events)) return "This booking is already checked in.";
      const day = localParts(b.startsAt).date;
      if (day > todayLocal(now)) return `You can check in from the day of the booking (${formatDate(day)}).`;
      return null;
    }
    case "check_out":
      if (hasCheckedOut(events)) return "This booking is already checked out.";
      if (!hasCheckedIn(events)) return "Check in before checking out.";
      return null;
    case "photo":
    case "note":
      return null;
  }
}

export type AllowedJobActions = Record<JobAction, boolean>;

export function allowedJobActions(b: BookingLike, events: EventLike[], now: Date): AllowedJobActions {
  const allowed = {} as AllowedJobActions;
  for (const action of JOB_ACTIONS) allowed[action] = jobActionRefusal(action, b, events, now) === null;
  return allowed;
}

// After check-out the owner's next step is to mark the booking completed, which lives on the
// bookings list. True while that's still to do.
export function shouldNudgeCompletion(b: Pick<Booking, "status">, events: EventLike[]): boolean {
  return b.status === "confirmed" && hasCheckedOut(events);
}

// ---------- Location ----------

export interface LocationInput {
  lat?: number | null;
  lng?: number | null;
  accuracyM?: number | null;
  locationMissing?: boolean;
}

export interface Location {
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  locationMissing: boolean;
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// A position the phone gave, or an honest "missing". Anything out of range counts as missing
// rather than being stored wrong. Accuracy is kept to whole metres.
export function normalizeLocation(input: LocationInput): Location {
  const { lat, lng, accuracyM } = input;
  const valid = finite(lat) && finite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !input.locationMissing;
  if (!valid) return { lat: null, lng: null, accuracyM: null, locationMissing: true };
  const accuracy = finite(accuracyM) && accuracyM >= 0 ? Math.round(Math.min(accuracyM, 1_000_000)) : null;
  return { lat: round(lat, 6), lng: round(lng, 6), accuracyM: accuracy, locationMissing: false };
}

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

type LocationLike = Pick<JobEvent, "lat" | "lng" | "accuracyM" | "locationMissing">;

// "Location recorded (about 25 m)" for the business; "Location recorded" for the customer,
// who never sees coordinates or how precise they were. "No location" when the phone couldn't say.
export function locationWording(e: LocationLike, opts: { accuracy: boolean } = { accuracy: true }): string {
  if (e.locationMissing || e.lat === null || e.lng === null) return "No location";
  if (!opts.accuracy || e.accuracyM === null) return "Location recorded";
  return `Location recorded (about ${accuracyText(e.accuracyM)})`;
}

export function accuracyText(metres: number): string {
  if (metres < 1000) return `${Math.max(1, Math.round(metres))} m`;
  return `${(metres / 1000).toFixed(metres < 10_000 ? 1 : 0)} km`;
}

// A link that opens the spot on a map, for the business only.
export function mapLink(e: LocationLike): string | null {
  if (e.locationMissing || e.lat === null || e.lng === null) return null;
  return `https://www.google.com/maps?q=${e.lat},${e.lng}`;
}

// ---------- Photos ----------

export type PhotoType = (typeof PHOTO_TYPES)[number];

export function isPhotoType(type: string): type is PhotoType {
  return (PHOTO_TYPES as readonly string[]).includes(type);
}

// What's wrong with this file as a job photo, or null when it's fine.
export function photoProblem(file: { type: string; size: number }): string | null {
  if (!file.size) return "Pick a photo to add.";
  if (!isPhotoType(file.type)) return "That file isn't a photo we can use. Take a JPEG, PNG or WebP photo.";
  if (file.size > PHOTO_MAX_BYTES) return "That photo is over 8 MB. Take it again or pick a smaller one.";
  return null;
}

export function photoExtension(type: PhotoType): "jpg" | "png" | "webp" {
  return type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
}

// Where a photo is filed: <business>/<booking>/<event>.<ext>, which is what the storage
// policies and the database trigger check.
export function photoPath(businessId: string, bookingId: string, eventId: string, type: PhotoType): string {
  return `${businessId}/${bookingId}/${eventId}.${photoExtension(type)}`;
}

export function isPhotoFiledUnder(path: string, businessId: string, bookingId: string): boolean {
  const folder = `${businessId}/${bookingId}/`;
  return path.startsWith(folder) && path.length > folder.length;
}

// ---------- Order and words ----------

// Oldest first. Two entries in the same instant keep the order they were written in.
export function sortJobEvents<T extends Pick<JobEvent, "occurredAt">>(events: T[]): T[] {
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.occurredAt.localeCompare(b.e.occurredAt) || a.i - b.i)
    .map(x => x.e);
}

// A note trimmed to what the database accepts.
export function cleanNote(note: string | undefined | null): string {
  return (note ?? "").trim().slice(0, JOB_NOTE_MAX);
}

// "Amina", "Amina and Joseph", "Amina, Joseph and Peter".
export function joinNames(names: string[]): string {
  const list = names.map(n => n.trim()).filter(Boolean);
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}
