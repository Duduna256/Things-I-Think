import "server-only";
// The job log (supabase back end). Rows go in with the logged-in person's client, so row
// security decides who may write and the job_events trigger keeps the record honest (one
// check-in, one check-out, check in first, photos filed under the booking). Photos live in the
// private job-photos bucket and come back as one-hour signed links.

import { createHash, randomUUID } from "node:crypto";
import { cleanNote, isPhotoType, normalizeLocation, PHOTO_URL_SECONDS, photoPath, photoProblem, sortJobEvents } from "../jobs/rules";
import { createClient } from "../supabase/server";
import type { JobEvent, JobEventInput, UploadFile } from "../types";
import { DataError, fromPostgrest } from "./errors";
import type { JobsSource } from "./source";
import { must, uid, type Row } from "./supabase-core";

const BUCKET = "job-photos";

export function mapJobEvent(r: Row): JobEvent {
  return {
    id: r.id,
    bookingId: r.booking_id,
    businessId: r.business_id,
    actorId: r.actor_id ?? null,
    kind: r.kind,
    occurredAt: r.occurred_at,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    accuracyM: r.accuracy_m ?? null,
    locationMissing: !!r.location_missing,
    photoPath: r.photo_path ?? null,
    photoHash: r.photo_hash ?? null,
    photoUrl: null,
    note: r.note ?? "",
    staffIds: Array.isArray(r.staff_ids) ? r.staff_ids : [],
  };
}

// The trigger's own messages are written for people ("This booking is already checked in.",
// "Check in before checking out."). fromPostgrest keeps 22023 messages but generalises 23505,
// so that one is handled here before falling through.
function jobError(error: { code?: string; message: string } | null): DataError {
  if (error?.code === "23505" && /^This booking is already /.test(error.message)) return new DataError("conflict", error.message);
  if (error?.code === "42501") return new DataError("forbidden", "Only the business on this booking can add to its job log.");
  return fromPostgrest(error, "We couldn't save that to the job log. Try again.");
}

type Sb = Awaited<ReturnType<typeof createClient>>;

// The booking the person can see, with what the insert needs. Row security hides other
// people's bookings, which reads as "not found" here.
async function bookingFor(sb: Sb, bookingId: string): Promise<{ id: string; businessId: string }> {
  const { data, error } = await sb.from("bookings").select("id, business_id").eq("id", bookingId).maybeSingle();
  if (error) throw fromPostgrest(error);
  if (!data) throw new DataError("not_found", "Booking not found.");
  return { id: data.id, businessId: data.business_id };
}

// Signed links for every photo in the list, in one round trip. A link that can't be made
// leaves the entry without a picture rather than failing the whole log.
async function withPhotoUrls(sb: Sb, events: JobEvent[]): Promise<JobEvent[]> {
  const paths = events.flatMap(e => (e.photoPath ? [e.photoPath] : []));
  if (!paths.length) return events;
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, PHOTO_URL_SECONDS);
  const urls = new Map<string, string>();
  for (const item of data ?? []) if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
  return events.map(e => (e.photoPath ? { ...e, photoUrl: urls.get(e.photoPath) ?? null } : e));
}

function eventRow(bookingId: string, businessId: string, kind: JobEvent["kind"], meta: Parameters<typeof normalizeLocation>[0] & { note?: string; staffIds?: string[] }): Row {
  const loc = normalizeLocation(meta);
  return {
    booking_id: bookingId,
    business_id: businessId,
    kind,
    lat: loc.lat,
    lng: loc.lng,
    accuracy_m: loc.accuracyM,
    location_missing: loc.locationMissing,
    note: cleanNote(meta.note),
    staff_ids: [...new Set(meta.staffIds ?? [])],
  };
}

export const supabaseJobs: JobsSource = {
  async listJobEvents(bookingId) {
    await uid();
    const sb = await createClient();
    const rows = await must<Row[]>(sb.from("job_events").select("*").eq("booking_id", bookingId).order("occurred_at"));
    return withPhotoUrls(sb, sortJobEvents(rows.map(mapJobEvent)));
  },

  async addJobEvent(input: JobEventInput) {
    await uid();
    const note = cleanNote(input.note);
    if (input.kind === "note" && !note) throw new DataError("invalid", "Write the note first.");
    const sb = await createClient();
    const booking = await bookingFor(sb, input.bookingId);
    const { data, error } = await sb.from("job_events").insert(eventRow(booking.id, booking.businessId, input.kind, input)).select("*").single();
    if (error || !data) throw jobError(error);
    return mapJobEvent(data);
  },

  async addJobPhoto(bookingId, file: UploadFile, meta) {
    const problem = photoProblem({ type: file.type, size: file.bytes.byteLength });
    if (problem || !isPhotoType(file.type)) throw new DataError("invalid", problem ?? "That file isn't a photo we can use.");
    await uid();
    const sb = await createClient();
    const booking = await bookingFor(sb, bookingId);
    const id = randomUUID();
    const path = photoPath(booking.businessId, booking.id, id, file.type);
    // The person's own client uploads, so the bucket's policies decide (owner or admin only).
    const up = await sb.storage.from(BUCKET).upload(path, file.bytes, { contentType: file.type, upsert: false });
    if (up.error) {
      const denied = /not authorized|violates row-level security|permission/i.test(up.error.message);
      throw new DataError(denied ? "forbidden" : "unavailable", denied ? "Only the business on this booking can add photos." : "We couldn't upload that photo. Check your connection and try again.");
    }
    const row = {
      id,
      ...eventRow(booking.id, booking.businessId, "photo", meta),
      photo_path: path,
      photo_hash: createHash("sha256").update(file.bytes).digest("hex"),
    };
    const { data, error } = await sb.from("job_events").insert(row).select("*").single();
    if (error || !data) {
      // Nothing points at the upload now; tidy it if the bucket lets us (it may not).
      await sb.storage.from(BUCKET).remove([path]).catch(() => undefined);
      throw jobError(error);
    }
    const [event] = await withPhotoUrls(sb, [mapJobEvent(data)]);
    return event;
  },
};
