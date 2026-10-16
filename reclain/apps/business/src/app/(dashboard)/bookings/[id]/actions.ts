"use server";

// The job log's Server Actions: check in, check out, add a note, add a photo. Every one checks
// the booking belongs to the person's own business, then asks the shared rules whether the
// booking allows it today, then lets the data layer (and the database trigger) have the last word.

import { data, isDataError } from "@shared/lib/data";
import { ACTION_DONE, ACTION_KIND, jobActionRefusal, type JobAction } from "@shared/lib/jobs/rules";
import type { Booking, JobEvent, UploadFile } from "@shared/lib/types";
import { parseId } from "@/components/dashboard/schemas";
import type { FormResult } from "@/components/dashboard/types";
import { ownedBusiness, refreshBusiness } from "../../../_lib/context";
import { parseJobAction, parseLocation, parseNote, parsePhoto } from "./schemas";

type Ready = { ok: true; booking: Booking; events: JobEvent[]; slug: string } | { ok: false; message: string };

// The booking from the form, if it belongs to the person's business and allows this action.
async function ready(formData: FormData, action: JobAction): Promise<Ready> {
  const owned = await ownedBusiness(formData.get("businessId"));
  if (!owned.ok) return { ok: false, message: owned.error };
  const id = parseId(formData.get("bookingId"));
  if (!id) return { ok: false, message: "We couldn't tell which booking that was for. Refresh the page and try again." };
  const booking = await data.getBooking(id);
  if (!booking || booking.businessId !== owned.business.id) {
    return { ok: false, message: "We couldn't find that booking on your business. Refresh the page and try again." };
  }
  const events = await data.jobs.listJobEvents(booking.id);
  const refused = jobActionRefusal(action, booking, events, new Date());
  if (refused) return { ok: false, message: refused };
  return { ok: true, booking, events, slug: owned.business.slug };
}

const crew = (b: Booking): string[] => (b.staffId ? [b.staffId] : []);

// Check in, check out, or add a note. The form says which with its "op" field.
export async function jobEventAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const action = parseJobAction(formData.get("op"));
  const kind = action ? ACTION_KIND[action] : null;
  if (!action || !kind || kind === "photo") return { message: "Something about that request looked off. Refresh the page and try again." };
  const note = parseNote(formData, kind === "note");
  if (!note.ok) return { message: "Check the note and try again.", errors: note.errors };
  try {
    const r = await ready(formData, action);
    if (!r.ok) return { message: r.message };
    // A note is just words; check-in and check-out carry where the phone was.
    const location = kind === "note" ? { locationMissing: true } : parseLocation(formData);
    await data.jobs.addJobEvent({ bookingId: r.booking.id, kind, ...location, note: note.value, staffIds: crew(r.booking) });
    refreshBusiness(r.slug);
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("jobEventAction failed", e);
    return { message: "We couldn't save that just now. Check your connection and try again." };
  }
  return { ok: true, message: ACTION_DONE[action] };
}

// Add a photo (with an optional caption and the phone's position).
export async function jobPhotoAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const photo = parsePhoto(formData);
  if (!photo.ok) return { message: photo.errors.photo, errors: photo.errors };
  const note = parseNote(formData, false);
  if (!note.ok) return { message: "Check the caption and try again.", errors: note.errors };
  try {
    const r = await ready(formData, "photo");
    if (!r.ok) return { message: r.message };
    const file: UploadFile = { name: photo.value.name, type: photo.value.type, bytes: new Uint8Array(await photo.value.arrayBuffer()) };
    await data.jobs.addJobPhoto(r.booking.id, file, { ...parseLocation(formData), note: note.value });
    refreshBusiness(r.slug);
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("jobPhotoAction failed", e);
    return { message: "We couldn't save that photo just now. Check your connection and try again." };
  }
  return { ok: true, message: ACTION_DONE.photo };
}
