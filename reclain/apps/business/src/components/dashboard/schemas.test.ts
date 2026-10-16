import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBusinessForm, parseId, parseServiceForm, parseStaffForm, parseUgx, type BusinessContext } from "./schemas";
import { durationOptions, halfHours, paletteIdFor, PALETTES } from "./options";

function form(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  return fd;
}

const ctx: BusinessContext = {
  mode: "update",
  categoryIds: ["braids", "laundry"],
  areaIds: ["ntinda", "kololo"],
  current: { homeVisitFee: 10000, acceptsCash: true, palette: ["#123456", "#234567", "#345678"], opensAt: "08:15", closesAt: "19:00" },
  cashEnabled: true,
  defaultHomeVisitFee: 10000,
};

const good = {
  name: "  The Braid Republic ",
  categoryId: "braids",
  areaId: "ntinda",
  blurb: "Neat parts.",
  address: "Plot 4, Ntinda Road",
  phone: "0772 123 456",
  visitMode: "both",
  homeVisitFee: "15,000",
  opensAt: "08:00",
  closesAt: "20:00",
  closedDays: ["0"],
  acceptsCash: "on",
  coverWord: "braids",
  palette: "jacaranda",
};

test("parseUgx accepts the ways people type money", () => {
  assert.equal(parseUgx("10000"), 10000);
  assert.equal(parseUgx("UGX 10,000"), 10000);
  assert.equal(parseUgx(" 10 000 "), 10000);
  assert.equal(parseUgx("10.5"), null);
  assert.equal(parseUgx("-5"), null);
  assert.equal(parseUgx(""), null);
});

test("parseId only takes plain ids", () => {
  assert.equal(parseId("biz-braid-republic"), "biz-braid-republic");
  assert.equal(parseId("3f2c1b7e-0000-4000-8000-000000000000"), "3f2c1b7e-0000-4000-8000-000000000000");
  assert.equal(parseId("../etc"), null);
  assert.equal(parseId(null), null);
});

test("a full settings form parses into a BusinessInput", () => {
  const r = parseBusinessForm(form(good), ctx);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.name, "The Braid Republic");
  assert.equal(r.value.phone, "772123456");
  assert.equal(r.value.homeVisitFee, 15000);
  assert.deepEqual(r.value.closedDays, [0]);
  assert.equal(r.value.acceptsCash, true);
  assert.equal(r.value.skipProfessional, false);
  assert.deepEqual(r.value.palette, PALETTES[0].colors);
});

test("business form errors say what to fix", () => {
  const r = parseBusinessForm(
    form({
      ...good,
      name: " ",
      categoryId: "nope",
      phone: "0414 123 456",
      opensAt: "20:00",
      closesAt: "08:00",
      closedDays: ["0", "1", "2", "3", "4", "5", "6"],
      coverWord: "much-too-long-word",
      homeVisitFee: "free",
      palette: "neon",
    }),
    ctx,
  );
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.errors.name, /at least 2/);
  assert.match(r.errors.categoryId, /category/);
  assert.match(r.errors.phone, /Ugandan mobile/);
  assert.match(r.errors.closesAt, /after opening/);
  assert.match(r.errors.closedDays, /every day/);
  assert.match(r.errors.coverWord, /12 characters/);
  assert.match(r.errors.homeVisitFee, /shillings/);
  assert.match(r.errors.palette, /colour/);
});

test("hidden or off fields keep their values", () => {
  // Not "both": the fee field is ignored and the current fee kept.
  const r = parseBusinessForm(form({ ...good, visitMode: "salon", homeVisitFee: "rubbish", palette: "current", opensAt: "08:15" }), ctx);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.homeVisitFee, 10000);
  assert.deepEqual(r.value.palette, ctx.current!.palette);
  assert.equal(r.value.opensAt, "08:15"); // off the half-hour grid, but it's what they already have

  const cashOff = parseBusinessForm(form({ ...good, acceptsCash: "on" }), { ...ctx, cashEnabled: false, current: { ...ctx.current!, acceptsCash: false } });
  assert.equal(cashOff.ok && cashOff.value.acceptsCash, false);
});

test("onboarding needs a phone and fills the rest", () => {
  const create: BusinessContext = { ...ctx, mode: "create", current: undefined };
  const noPhone = parseBusinessForm(form({ ...good, phone: "" }), create);
  assert.equal(noPhone.ok, false);
  if (!noPhone.ok) assert.match(noPhone.errors.phone, /text you new bookings/);

  const r = parseBusinessForm(form({ ...good, acceptsCash: "", address: "ignored" }), create);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.address, "");
  assert.equal(r.value.acceptsCash, true);
  assert.equal(r.value.skipProfessional, false);
  assert.equal(parseBusinessForm(form({ ...good, palette: "current" }), create).ok, false);
  assert.equal(parseBusinessForm(form({ ...good, opensAt: "08:15" }), create).ok, false);
});

test("service form", () => {
  const hours = { opensAt: "08:00", closesAt: "20:00" };
  const r = parseServiceForm(
    form({ groupName: "", name: "Knotless braids", description: "Mid-back.", durationMin: "330", durationLabel: "", price: "120,000", latestStart: "", active: "on" }),
    hours,
  );
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.groupName, "Services");
    assert.equal(r.value.durationLabel, null);
    assert.equal(r.value.price, 120000);
    assert.equal(r.value.active, true);
  }
  const bad = parseServiceForm(form({ name: "K", durationMin: "800", price: "lots", latestStart: "07:00" }), hours);
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.ok(bad.errors.name);
    assert.ok(bad.errors.durationMin);
    assert.ok(bad.errors.price);
    assert.match(bad.errors.latestStart, /You open at 08:00/);
  }
  const tooLong = parseServiceForm(form({ name: "All day", durationMin: "720", price: "1" }), { opensAt: "08:00", closesAt: "18:00" });
  assert.equal(!tooLong.ok && /longer than you're open/.test(tooLong.errors.durationMin), true);
  const hidden = parseServiceForm(form({ name: "Pickup", durationMin: "0", price: "0", latestStart: "10:00" }), hours);
  assert.equal(hidden.ok && hidden.value.active === false && hidden.value.latestStart === "10:00", true);
});

test("staff form", () => {
  const r = parseStaffForm(form({ name: " Joy Kemigisha ", role: "Braider", active: "on" }));
  assert.deepEqual(r, { ok: true, value: { name: "Joy Kemigisha", role: "Braider", active: true } });
  const bad = parseStaffForm(form({ name: " J ", role: "" }));
  assert.equal(bad.ok, false);
});

test("option helpers", () => {
  assert.equal(halfHours().length, 48);
  assert.equal(halfHours("08:15").includes("08:15"), true);
  assert.equal(durationOptions(25).some(o => o.value === 25), true);
  assert.equal(durationOptions()[0].label, "No set time (pickup or drop-off)");
  assert.equal(paletteIdFor(["#2B1A4A", "#7b4fd6", "#f6b9a3"]), "jacaranda");
  assert.equal(paletteIdFor(["#000000", "#7b4fd6", "#f6b9a3"]), "current");
});

test("a latest start has to fall while you're open", () => {
  const hours = { opensAt: "08:00", closesAt: "18:00" };
  const base = { name: "Express wash", durationMin: "0", price: "15000", active: "on" };
  const atClose = parseServiceForm(form({ ...base, latestStart: "18:00" }), hours);
  assert.equal(atClose.ok, false);
  if (!atClose.ok) assert.match(atClose.errors.latestStart, /You close at 18:00/);
  assert.equal(parseServiceForm(form({ ...base, latestStart: "17:30" }), hours).ok, true);
  assert.equal(parseServiceForm(form({ ...base, latestStart: "08:00" }), hours).ok, true);
  const nonsense = parseServiceForm(form({ ...base, latestStart: "25:00" }), hours);
  assert.equal(!nonsense.ok && /from the list/.test(nonsense.errors.latestStart), true);
});
