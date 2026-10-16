// Run: node --import tsx --test src/components/booking/validate.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { detailErrors, firstError, isMobileMoney, looksComplete, momoSource, type DetailsInput } from "./validate";

const ok: DetailsInput = {
  name: "Grace Nakato",
  phone: "0772 123 456",
  address: "",
  momo: "",
  pay: "mtn",
  needsAddress: false,
  isLaundry: false,
};

test("good details pass", () => {
  assert.deepEqual(detailErrors(ok), {});
  assert.equal(firstError(detailErrors(ok)), null);
});

test("a name made of spaces is refused (finding F14)", () => {
  assert.match(detailErrors({ ...ok, name: "   " }).name ?? "", /name/);
});

test("landlines and nonsense aren't phone numbers", () => {
  assert.match(detailErrors({ ...ok, phone: "0414 123 456" }).phone ?? "", /valid Ugandan mobile/);
  assert.match(detailErrors({ ...ok, phone: "" }).phone ?? "", /Add your phone/);
});

test("home visits need an address, worded for laundry pickups", () => {
  assert.match(detailErrors({ ...ok, needsAddress: true }).address ?? "", /landmark the pro/);
  assert.match(detailErrors({ ...ok, needsAddress: true, isLaundry: true }).address ?? "", /pickup address/);
  assert.equal(detailErrors({ ...ok, needsAddress: true, address: "Plot 4, Ntinda" }).address, undefined);
});

test("the mobile money number falls back to the phone and must match the network", () => {
  assert.equal(momoSource({ momo: "  ", phone: "0772123456" }), "0772123456");
  assert.equal(momoSource({ momo: "0752 987 654", phone: "0772123456" }), "0752 987 654");
  // MTN phone, Airtel chosen.
  const err = detailErrors({ ...ok, pay: "airtel" }).momo ?? "";
  assert.match(err, /is on MTN MoMo/);
  assert.match(err, /an Airtel number/); // "an", not "a" (finding C5)
  assert.equal(detailErrors({ ...ok, pay: "airtel", momo: "0752 987 654" }).momo, undefined);
  // Card and cash don't need a mobile money number.
  assert.equal(detailErrors({ ...ok, pay: "card", phone: "0752 987 654" }).momo, undefined);
});

test("errors come in form order", () => {
  assert.equal(firstError(detailErrors({ ...ok, name: "", phone: "1", needsAddress: true })), "name");
  assert.equal(firstError(detailErrors({ ...ok, phone: "1", needsAddress: true })), "phone");
});

test("helpers", () => {
  assert.equal(isMobileMoney("mtn"), true);
  assert.equal(isMobileMoney("card"), false);
  assert.equal(isMobileMoney(null), false);
  assert.equal(looksComplete("0772 12"), false);
  assert.equal(looksComplete("0772 123 456"), true);
});
