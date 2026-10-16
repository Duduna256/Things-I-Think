// Checks what the job page's forms send before anything reaches the data layer: which action,
// the phone's position (or an honest "missing"), a note, and the photo file.
// Pure, so it's unit-tested. Every message says what's wrong and how to fix it.

import { z } from "zod";
import { JOB_ACTIONS, JOB_NOTE_MAX, normalizeLocation, photoProblem, type JobAction, type Location } from "@shared/lib/jobs/rules";

export interface FormLike {
  get(name: string): FormDataEntryValue | null;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const text = (fd: FormLike, key: string): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

const actionSchema = z.enum(JOB_ACTIONS as [JobAction, ...JobAction[]]);

export function parseJobAction(raw: unknown): JobAction | null {
  const r = actionSchema.safeParse(raw);
  return r.success ? r.data : null;
}

// A number from a hidden field, or null when it's empty or not a number.
function num(fd: FormLike, key: string): number | null {
  const raw = text(fd, key).trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// The position the phone gave (lat, lng, accuracy in metres), or missing when it couldn't.
export function parseLocation(fd: FormLike): Location {
  const missing = text(fd, "locationMissing");
  return normalizeLocation({
    lat: num(fd, "lat"),
    lng: num(fd, "lng"),
    accuracyM: num(fd, "accuracy"),
    locationMissing: missing === "on" || missing === "true" || missing === "1",
  });
}

const noteSchema = z.string().trim().max(JOB_NOTE_MAX, `Keep the note under ${JOB_NOTE_MAX} characters.`);

export function parseNote(fd: FormLike, required: boolean): Parsed<string> {
  const r = noteSchema.safeParse(text(fd, "note"));
  if (!r.success) return { ok: false, errors: { note: r.error.issues[0]?.message ?? "Check the note and try again." } };
  if (required && !r.data) return { ok: false, errors: { note: "Write the note first." } };
  return { ok: true, value: r.data };
}

// The photo from <input type="file" name="photo">: the right kind, not too big.
export function parsePhoto(fd: FormLike): Parsed<File> {
  const file = fd.get("photo");
  if (!(file instanceof File)) return { ok: false, errors: { photo: "Pick a photo to add." } };
  const problem = photoProblem({ type: file.type, size: file.size });
  if (problem) return { ok: false, errors: { photo: problem } };
  return { ok: true, value: file };
}
