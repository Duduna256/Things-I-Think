import assert from "node:assert/strict";
import { test } from "node:test";
import { firstIssue, formText, linkSchema, loginSchema, PHONE_ERROR, profileSchema, signupSchema, typed } from "./schemas";

test("emails are trimmed and lower-cased", () => {
  const r = linkSchema.safeParse({ email: "  Grace@Example.COM ", name: "" });
  assert.ok(r.success);
  assert.equal(r.data.email, "grace@example.com");
  assert.equal(r.data.name, "");
});

test("a bad email says how to fix it", () => {
  const r = linkSchema.safeParse({ email: "grace@", name: "" });
  assert.ok(!r.success);
  assert.deepEqual(firstIssue(r.error), { field: "email", message: "That email address doesn't look right. Try something like grace@example.com." });
  const empty = loginSchema.safeParse({ email: "", password: "x" });
  assert.ok(!empty.success);
  assert.equal(firstIssue(empty.error).message, "Enter your email address.");
});

test("names are tidied, and needed when signing up", () => {
  const r = profileSchema.safeParse({ fullName: "  Grace   Nakato ", phone: "" });
  assert.ok(r.success);
  assert.equal(r.data.fullName, "Grace Nakato");
  const missing = profileSchema.safeParse({ fullName: "   ", phone: "" });
  assert.ok(!missing.success);
  assert.equal(firstIssue(missing.error).field, "fullName");
  const long = profileSchema.safeParse({ fullName: "a".repeat(81), phone: "" });
  assert.ok(!long.success);
});

test("phones are stored as 9 digits, empty means none", () => {
  for (const raw of ["0772 123 456", "+256 772 123 456", "772123456", "256772123456"]) {
    const r = profileSchema.safeParse({ fullName: "Grace", phone: raw });
    assert.ok(r.success, raw);
    assert.equal(r.data.phone, "772123456");
  }
  const none = profileSchema.safeParse({ fullName: "Grace", phone: "  " });
  assert.ok(none.success);
  assert.equal(none.data.phone, null);
});

test("landlines and nonsense aren't phone numbers", () => {
  for (const raw of ["0414 123 456", "0111 111 111", "12345", "call me", "0772 123 4567"]) {
    const r = profileSchema.safeParse({ fullName: "Grace", phone: raw });
    assert.ok(!r.success, raw);
    assert.deepEqual(firstIssue(r.error), { field: "phone", message: PHONE_ERROR });
  }
});

test("sign-up checks fields in the order the form shows them", () => {
  const r = signupSchema.safeParse({ name: "", phone: "nope", email: "x", password: "short" });
  assert.ok(!r.success);
  assert.equal(firstIssue(r.error).field, "name");
  const ok = signupSchema.safeParse({ name: "Grace Nakato", phone: "0752 987 654", email: "g@example.com", password: "kampala2026" });
  assert.ok(ok.success);
  assert.equal(ok.data.phone, "752987654");
});

test("new passwords need 8 real characters; passwords are never trimmed", () => {
  const short = signupSchema.safeParse({ name: "Grace", phone: "", email: "g@example.com", password: "1234567" });
  assert.ok(!short.success);
  assert.equal(firstIssue(short.error).field, "password");
  const spaces = signupSchema.safeParse({ name: "Grace", phone: "", email: "g@example.com", password: "         " });
  assert.ok(!spaces.success);
  const padded = loginSchema.safeParse({ email: "g@example.com", password: " secret " });
  assert.ok(padded.success);
  assert.equal(padded.data.password, " secret ");
});

test("formText reads strings and ignores the rest", () => {
  const fd = new FormData();
  fd.set("email", "g@example.com");
  fd.set("file", new Blob(["x"]), "x.txt");
  assert.equal(formText(fd, "email"), "g@example.com");
  assert.equal(formText(fd, "file"), "");
  assert.equal(formText(fd, "missing"), "");
});

test("typed trims and clips what gets sent back to the form", () => {
  const fd = new FormData();
  fd.set("name", "  Grace  ");
  fd.set("long", "x".repeat(5000));
  assert.equal(typed(fd, "name"), "Grace");
  assert.equal(typed(fd, "long").length, 300);
  // Clipping never turns a refused value into an accepted one.
  assert.ok(!linkSchema.safeParse({ email: typed(fd, "long"), name: "" }).success);
});
