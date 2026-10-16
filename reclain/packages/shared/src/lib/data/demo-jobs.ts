import "server-only";
// The job log (demo back end): entries in memory, photos as bytes in the demo file store.
// It follows the same rules as the job_events trigger and row security, so the app behaves
// the same way it does on the database. Nothing here can be edited or deleted once written.

import { createHash } from "node:crypto";
import { cleanNote, isPhotoType, normalizeLocation, photoPath, photoProblem, sortJobEvents } from "../jobs/rules";
import type { JobEvent } from "../types";
import { db, findBooking, me, newId, now, owns, type StoredBooking } from "./demo-store";
import { DataError } from "./errors";
import type { JobsSource } from "./source";

// The business adds to the log only on its own confirmed or completed bookings (the row
// security policy says the same).
async function writable(bookingId: string): Promise<{ booking: StoredBooking; actorId: string }> {
  const user = await me();
  const booking = findBooking(bookingId);
  if (!owns(user, booking.businessId)) throw new DataError("not_found", "Booking not found.");
  if (booking.status !== "confirmed" && booking.status !== "completed") {
    throw new DataError("invalid", "Only a confirmed or completed booking has a job log.");
  }
  return { booking, actorId: user.id };
}

const eventsFor = (bookingId: string) => db().jobEvents.filter(e => e.bookingId === bookingId);

// What the database trigger refuses, with its own words.
function guard(bookingId: string, kind: JobEvent["kind"]) {
  const existing = eventsFor(bookingId);
  if ((kind === "checked_in" || kind === "checked_out") && existing.some(e => e.kind === kind)) {
    throw new DataError("conflict", `This booking is already ${kind.replace("_", " ")}.`);
  }
  if (kind === "checked_out" && !existing.some(e => e.kind === "checked_in")) {
    throw new DataError("invalid", "Check in before checking out.");
  }
}

// Only people on the booking's business may be named as crew.
function crewOf(businessId: string, staffIds: string[] | undefined): string[] {
  const team = new Set(db().staff.filter(s => s.businessId === businessId).map(s => s.id));
  return [...new Set((staffIds ?? []).filter(id => team.has(id)))];
}

function withPhotoUrl(e: JobEvent): JobEvent {
  if (!e.photoPath) return { ...e, photoUrl: null };
  const file = db().files[e.photoPath];
  if (!file) return { ...e, photoUrl: null };
  return { ...e, photoUrl: `data:${file.type};base64,${Buffer.from(file.bytes).toString("base64")}` };
}

export const demoJobs: JobsSource = {
  // The customer on the booking, the business that holds it, or an admin.
  async listJobEvents(bookingId) {
    const user = await me();
    const booking = db().bookings.find(b => b.id === bookingId);
    if (!booking || (booking.customerId !== user.id && !owns(user, booking.businessId))) {
      throw new DataError("not_found", "Booking not found.");
    }
    return sortJobEvents(eventsFor(bookingId)).map(withPhotoUrl);
  },

  async addJobEvent(input) {
    const { booking, actorId } = await writable(input.bookingId);
    const note = cleanNote(input.note);
    if (input.kind === "note" && !note) throw new DataError("invalid", "Write the note first.");
    guard(booking.id, input.kind);
    const event: JobEvent = {
      id: newId("job"),
      bookingId: booking.id,
      businessId: booking.businessId,
      actorId,
      kind: input.kind,
      occurredAt: now(),
      ...normalizeLocation(input),
      photoPath: null,
      photoHash: null,
      photoUrl: null,
      note,
      staffIds: crewOf(booking.businessId, input.staffIds),
    };
    db().jobEvents.push(event);
    return event;
  },

  async addJobPhoto(bookingId, file, meta) {
    const problem = photoProblem({ type: file.type, size: file.bytes.byteLength });
    if (problem || !isPhotoType(file.type)) throw new DataError("invalid", problem ?? "That file isn't a photo we can use.");
    const { booking, actorId } = await writable(bookingId);
    const id = newId("job");
    const path = photoPath(booking.businessId, booking.id, id, file.type);
    const bytes = new Uint8Array(file.bytes);
    db().files[path] = { type: file.type, bytes };
    const event: JobEvent = {
      id,
      bookingId: booking.id,
      businessId: booking.businessId,
      actorId,
      kind: "photo",
      occurredAt: now(),
      ...normalizeLocation(meta),
      photoPath: path,
      photoHash: createHash("sha256").update(bytes).digest("hex"),
      photoUrl: null,
      note: cleanNote(meta.note),
      staffIds: [],
    };
    db().jobEvents.push(event);
    return withPhotoUrl(event);
  },
};
