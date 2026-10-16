// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accuracyText,
  allowedJobActions,
  cleanNote,
  isPhotoFiledUnder,
  jobActionRefusal,
  joinNames,
  locationWording,
  mapLink,
  normalizeLocation,
  photoPath,
  photoProblem,
  PHOTO_MAX_BYTES,
  shouldNudgeCompletion,
  sortJobEvents,
} from "./rules";
import type { JobEvent } from "../types";

// 10:00 Kampala on Sun 20 Jan 2030 is 07:00Z. "Now" is 09:00 Kampala that morning.
const START = "2030-01-20T07:00:00.000Z";
const NOW = new Date("2030-01-20T06:00:00.000Z");
const DAY_BEFORE = new Date("2030-01-19T20:30:00.000Z"); // 23:30 Kampala the evening before

const booking = (status: "confirmed" | "completed" | "cancelled" | "no_show" | "pending_payment" = "confirmed", startsAt = START) => ({ status, startsAt });
const ev = (kind: JobEvent["kind"], occurredAt = "2030-01-20T07:05:00.000Z"): Pick<JobEvent, "kind" | "occurredAt"> => ({ kind, occurredAt });

test("a confirmed booking on its day can check in, add photos and notes, but not check out yet", () => {
  assert.deepEqual(allowedJobActions(booking(), [], NOW), { check_in: true, check_out: false, photo: true, note: true });
  assert.equal(jobActionRefusal("check_out", booking(), [], NOW), "Check in before checking out.");
});

test("no check-in before the day of the booking, even late the evening before", () => {
  const why = jobActionRefusal("check_in", booking(), [], DAY_BEFORE);
  assert.equal(why, "You can check in from the day of the booking (Sun 20 Jan).");
  // Photos and notes don't wait for the day.
  assert.equal(jobActionRefusal("photo", booking(), [], DAY_BEFORE), null);
});

test("check in once, then check out once", () => {
  const checkedIn = [ev("checked_in")];
  assert.equal(jobActionRefusal("check_in", booking(), checkedIn, NOW), "This booking is already checked in.");
  assert.equal(jobActionRefusal("check_out", booking(), checkedIn, NOW), null);
  const done = [...checkedIn, ev("checked_out")];
  assert.equal(jobActionRefusal("check_out", booking(), done, NOW), "This booking is already checked out.");
  // Photos and notes can still be added after check-out (the "after" photos).
  assert.deepEqual(allowedJobActions(booking(), done, NOW), { check_in: false, check_out: false, photo: true, note: true });
});

test("a late check-in on a completed booking is allowed; closed bookings refuse everything", () => {
  assert.equal(jobActionRefusal("check_in", booking("completed"), [], NOW), null);
  for (const status of ["cancelled", "no_show", "pending_payment"] as const) {
    const allowed = allowedJobActions(booking(status), [], NOW);
    assert.deepEqual(allowed, { check_in: false, check_out: false, photo: false, note: false }, status);
  }
  assert.match(jobActionRefusal("note", booking("cancelled"), [], NOW)!, /cancelled/);
  assert.match(jobActionRefusal("photo", booking("pending_payment"), [], NOW)!, /waiting for its payment/);
});

test("the nudge to mark completed shows after check-out, and only while still confirmed", () => {
  assert.equal(shouldNudgeCompletion({ status: "confirmed" }, [ev("checked_in")]), false);
  assert.equal(shouldNudgeCompletion({ status: "confirmed" }, [ev("checked_in"), ev("checked_out")]), true);
  assert.equal(shouldNudgeCompletion({ status: "completed" }, [ev("checked_in"), ev("checked_out")]), false);
});

test("normalizeLocation keeps a real position and turns anything doubtful into 'missing'", () => {
  assert.deepEqual(normalizeLocation({ lat: 0.3476123456, lng: 32.5825123456, accuracyM: 24.6 }), {
    lat: 0.347612,
    lng: 32.582512,
    accuracyM: 25,
    locationMissing: false,
  });
  assert.deepEqual(normalizeLocation({ lat: 0.3476, lng: 32.5825, accuracyM: null }), { lat: 0.3476, lng: 32.5825, accuracyM: null, locationMissing: false });
  const missing = { lat: null, lng: null, accuracyM: null, locationMissing: true };
  assert.deepEqual(normalizeLocation({}), missing);
  assert.deepEqual(normalizeLocation({ lat: 0.3, lng: null }), missing);
  assert.deepEqual(normalizeLocation({ lat: 91, lng: 32 }), missing);
  assert.deepEqual(normalizeLocation({ lat: 0.3, lng: 181 }), missing);
  assert.deepEqual(normalizeLocation({ lat: Number.NaN, lng: 32 }), missing);
  assert.deepEqual(normalizeLocation({ lat: 0.3, lng: 32, locationMissing: true }), missing);
  // A negative accuracy is nonsense, so it's dropped rather than stored.
  assert.equal(normalizeLocation({ lat: 0.3, lng: 32, accuracyM: -5 }).accuracyM, null);
});

test("location wording: the business sees how precise, the customer only that it was recorded", () => {
  const here = { lat: 0.3476, lng: 32.5825, accuracyM: 24.6, locationMissing: false };
  assert.equal(locationWording(here), "Location recorded (about 25 m)");
  assert.equal(locationWording(here, { accuracy: false }), "Location recorded");
  assert.equal(locationWording({ ...here, accuracyM: null }), "Location recorded");
  assert.equal(locationWording({ lat: null, lng: null, accuracyM: null, locationMissing: true }), "No location");
  assert.equal(locationWording({ lat: null, lng: null, accuracyM: null, locationMissing: true }, { accuracy: false }), "No location");
  assert.equal(mapLink(here), "https://www.google.com/maps?q=0.3476,32.5825");
  assert.equal(mapLink({ lat: null, lng: null, accuracyM: null, locationMissing: true }), null);
});

test("accuracy reads in metres, then kilometres", () => {
  assert.equal(accuracyText(0.4), "1 m");
  assert.equal(accuracyText(24.6), "25 m");
  assert.equal(accuracyText(999), "999 m");
  assert.equal(accuracyText(1500), "1.5 km");
  assert.equal(accuracyText(12_400), "12 km");
});

test("photos must be JPEG, PNG or WebP and at most 8 MB", () => {
  assert.equal(photoProblem({ type: "image/jpeg", size: 120_000 }), null);
  assert.equal(photoProblem({ type: "image/png", size: PHOTO_MAX_BYTES }), null);
  assert.equal(photoProblem({ type: "image/webp", size: 1 }), null);
  assert.match(photoProblem({ type: "image/jpeg", size: PHOTO_MAX_BYTES + 1 })!, /over 8 MB/);
  assert.match(photoProblem({ type: "image/heic", size: 100 })!, /JPEG, PNG or WebP/);
  assert.match(photoProblem({ type: "application/pdf", size: 100 })!, /isn't a photo/);
  assert.match(photoProblem({ type: "image/jpeg", size: 0 })!, /Pick a photo/);
});

test("photos are filed under the business and the booking, as the trigger requires", () => {
  const path = photoPath("biz-1", "bk-9", "job-abc", "image/jpeg");
  assert.equal(path, "biz-1/bk-9/job-abc.jpg");
  assert.equal(photoPath("biz-1", "bk-9", "job-abc", "image/png"), "biz-1/bk-9/job-abc.png");
  assert.equal(photoPath("biz-1", "bk-9", "job-abc", "image/webp"), "biz-1/bk-9/job-abc.webp");
  assert.equal(isPhotoFiledUnder(path, "biz-1", "bk-9"), true);
  assert.equal(isPhotoFiledUnder(path, "biz-1", "bk-99"), false);
  assert.equal(isPhotoFiledUnder("biz-1/bk-9/", "biz-1", "bk-9"), false);
});

test("entries sort oldest first and keep their written order within the same instant", () => {
  const a = { id: "a", occurredAt: "2030-01-20T07:05:00.000Z" };
  const b = { id: "b", occurredAt: "2030-01-20T07:01:00.000Z" };
  const c = { id: "c", occurredAt: "2030-01-20T07:05:00.000Z" };
  assert.deepEqual(sortJobEvents([a, b, c]).map(e => e.id), ["b", "a", "c"]);
});

test("notes are trimmed and capped at 500 characters", () => {
  assert.equal(cleanNote("  Gate code 1234  "), "Gate code 1234");
  assert.equal(cleanNote(undefined), "");
  assert.equal(cleanNote("x".repeat(600)).length, 500);
});

test("joinNames reads like a sentence", () => {
  assert.equal(joinNames([]), "");
  assert.equal(joinNames(["Amina"]), "Amina");
  assert.equal(joinNames(["Amina", "Joseph"]), "Amina and Joseph");
  assert.equal(joinNames(["Amina", " Joseph ", "Peter", ""]), "Amina, Joseph and Peter");
});
