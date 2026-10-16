import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJobAction, parseLocation, parseNote, parsePhoto } from "./schemas";

const form = (fields: Record<string, string | File>) => ({ get: (k: string) => fields[k] ?? null });

test("only the four job actions are accepted", () => {
  assert.equal(parseJobAction("check_in"), "check_in");
  assert.equal(parseJobAction("check_out"), "check_out");
  assert.equal(parseJobAction("photo"), "photo");
  assert.equal(parseJobAction("note"), "note");
  assert.equal(parseJobAction("delete"), null);
  assert.equal(parseJobAction(undefined), null);
});

test("a position from the hidden fields, rounded and with whole-metre accuracy", () => {
  assert.deepEqual(parseLocation(form({ lat: "0.34761234", lng: "32.58251234", accuracy: "24.6" })), {
    lat: 0.347612,
    lng: 32.582512,
    accuracyM: 25,
    locationMissing: false,
  });
});

test("a refused or absent position is recorded as missing, never as zeros", () => {
  const missing = { lat: null, lng: null, accuracyM: null, locationMissing: true };
  assert.deepEqual(parseLocation(form({})), missing);
  assert.deepEqual(parseLocation(form({ locationMissing: "on" })), missing);
  assert.deepEqual(parseLocation(form({ lat: "0.3", lng: "32.5", locationMissing: "on" })), missing);
  assert.deepEqual(parseLocation(form({ lat: "abc", lng: "32.5" })), missing);
  assert.deepEqual(parseLocation(form({ lat: "0.3" })), missing);
  assert.deepEqual(parseLocation(form({ lat: "95", lng: "32.5" })), missing);
});

test("notes are trimmed, capped, and required only when the entry is a note", () => {
  assert.deepEqual(parseNote(form({ note: "  Gate code 1234 " }), true), { ok: true, value: "Gate code 1234" });
  assert.deepEqual(parseNote(form({}), false), { ok: true, value: "" });
  const empty = parseNote(form({ note: "   " }), true);
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.errors.note, "Write the note first.");
  const long = parseNote(form({ note: "x".repeat(501) }), true);
  assert.equal(long.ok, false);
  if (!long.ok) assert.match(long.errors.note, /under 500 characters/);
});

test("the photo must be an image file of a sensible size", () => {
  const jpeg = new File([new Uint8Array(10)], "site.jpg", { type: "image/jpeg" });
  const ok = parsePhoto(form({ photo: jpeg }));
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value, jpeg);

  const none = parsePhoto(form({}));
  assert.equal(none.ok, false);
  if (!none.ok) assert.equal(none.errors.photo, "Pick a photo to add.");

  const text = parsePhoto(form({ photo: "site.jpg" }));
  assert.equal(text.ok, false);

  const pdf = parsePhoto(form({ photo: new File([new Uint8Array(10)], "a.pdf", { type: "application/pdf" }) }));
  assert.equal(pdf.ok, false);
  if (!pdf.ok) assert.match(pdf.errors.photo, /JPEG, PNG or WebP/);

  const empty = parsePhoto(form({ photo: new File([], "a.jpg", { type: "image/jpeg" }) }));
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.errors.photo, "Pick a photo to add.");

  const huge = parsePhoto(form({ photo: new File([new Uint8Array(8 * 1024 * 1024 + 1)], "a.jpg", { type: "image/jpeg" }) }));
  assert.equal(huge.ok, false);
  if (!huge.ok) assert.match(huge.errors.photo, /over 8 MB/);
});
