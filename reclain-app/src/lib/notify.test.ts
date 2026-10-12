// Run: node --import tsx --test src/lib/notify.test.ts
import { before, test } from "node:test";
import assert from "node:assert/strict";
import type { Booking } from "./types";

// The live address, so lengths are checked against what customers will really get.
process.env.NEXT_PUBLIC_SITE_URL = "https://reclain.com";
let n: typeof import("./notify");
before(async () => {
  n = await import("./notify");
});

const UUID = "0b5c8e0e-8a7f-4f3e-9b8e-1c2d3e4f5a6b";

// The seed venues, as they'd appear on a booking.
const VENUES: { name: string; slug: string; categoryId: string }[] = [
  { name: "The Braid Republic", slug: "braid-republic", categoryId: "braids" },
  { name: "Fade Kings Barbershop", slug: "fade-kings", categoryId: "barber" },
  { name: "Silk Press Society", slug: "silk-press-society", categoryId: "hair" },
  { name: "Locs & Lattes", slug: "locs-and-lattes", categoryId: "braids" },
  { name: "Kneaded Massage & Spa", slug: "kneaded-massage-and-spa", categoryId: "massage" },
  { name: "Polished Nail Bar", slug: "polished-nail-bar", categoryId: "nails" },
  { name: "Fresh Fold Laundry", slug: "fresh-fold-laundry", categoryId: "laundry" },
  { name: "Spotless Kampala", slug: "spotless-kampala", categoryId: "cleaning" },
  { name: "Guardline Security", slug: "guardline-security", categoryId: "escort" },
  { name: "Fix-It Fred", slug: "fix-it-fred", categoryId: "repairs" },
  { name: "Crown & Comb Kids", slug: "crown-and-comb-kids", categoryId: "hair" },
  { name: "Glow Bridal Studio", slug: "glow-bridal-studio", categoryId: "bridal" },
  { name: "Cuts & Curls Mukono", slug: "cuts-and-curls-mukono", categoryId: "barber" },
];

function booking(over: Partial<Booking> = {}, venue = VENUES[0]): Booking {
  return {
    id: UUID,
    ref: "RCL-AB12CD",
    businessId: "biz-1",
    customerId: "cust-1",
    staffId: null,
    staffName: null,
    // 10:00 in Kampala on Tuesday 8 January 2030
    startsAt: "2030-01-08T07:00:00.000Z",
    endsAt: "2030-01-08T12:30:00.000Z",
    location: "venue",
    address: "",
    notes: "",
    customerName: "Grace Nakato",
    customerPhone: "772123456",
    subtotal: 1250000,
    homeFee: 0,
    total: 1250000,
    currency: "UGX",
    status: "confirmed",
    paymentMethod: "mtn",
    paymentStatus: "paid",
    expiresAt: null,
    reminderSentAt: null,
    createdAt: "2030-01-01T00:00:00.000Z",
    items: [
      { id: "i1", serviceId: "s1", name: "Knotless braids (waist length)", price: 1000000, durationMin: 330 },
      { id: "i2", serviceId: "s2", name: "Hot oil treatment", price: 250000, durationMin: 30 },
    ],
    business: {
      id: "biz-1",
      slug: venue.slug,
      name: venue.name,
      areaId: "kololo",
      categoryId: venue.categoryId,
      coverWord: "braids",
      palette: ["#1a1030", "#6a43e0", "#d9ccff"],
      address: "",
      phone: "752987654",
    },
    hasReview: false,
    ...over,
  };
}

// Every combination a customer can end up with: each venue, at the venue or at home, paid
// online, cash or still to pay.
function* everyBooking(): Generator<Booking> {
  for (const venue of VENUES) {
    for (const location of ["venue", "home"] as const) {
      for (const pay of [
        { paymentMethod: "mtn", paymentStatus: "paid" },
        { paymentMethod: "cash", paymentStatus: "unpaid" },
        { paymentMethod: "card", paymentStatus: "pending" },
      ] as const) {
        yield booking({ location, ...pay }, venue);
      }
    }
  }
}

// Plain GSM characters only: printable ASCII minus the ones that cost two (or aren't there).
const GSM_SAFE = /^[\x20-\x7E]*$/;
const GSM_EXTENDED = /[[\]{}\\^~|`]/;

function assertOneSms(text: string, label: string) {
  assert.ok(text.length <= n.SMS_LIMIT, `${label}: ${text.length} characters\n${text}`);
  assert.match(text, GSM_SAFE, `${label}: non-GSM character in\n${text}`);
  assert.doesNotMatch(text, GSM_EXTENDED, `${label}: two-part GSM character in\n${text}`);
}

test("confirmations fit one SMS for every seed venue, with ref, Kampala time, total and the booking's link", () => {
  for (const b of everyBooking()) {
    const text = n.confirmationSms(b);
    const label = `${b.business.name}/${b.location}/${b.paymentMethod}`;
    assertOneSms(text, label);
    assert.ok(text.includes("RCL-AB12CD"), label);
    assert.ok(text.includes("Tue 8 Jan"), label);
    assert.ok(text.includes("10:00"), label);
    assert.ok(text.includes("UGX 1,250,000"), label);
    assert.ok(text.includes(`reclain.com/bookings/${UUID}`), `${label}: should keep the full link\n${text}`);
  }
});

test("confirmations say how it's being paid", () => {
  assert.match(n.confirmationSms(booking()), /UGX 1,250,000 paid/);
  assert.match(n.confirmationSms(booking({ paymentMethod: "cash", paymentStatus: "unpaid" })), /UGX 1,250,000 cash/);
  assert.match(n.confirmationSms(booking({ paymentMethod: "card", paymentStatus: "pending" })), /UGX 1,250,000 to pay/);
});

test("short ids get the warmer wording", () => {
  const text = n.confirmationSms(booking({ id: "bk-m3x1", total: 120000 }));
  assert.match(text, /^You're booked! The Braid Republic, Tue 8 Jan at 10:00\./);
  assert.match(text, /Change of plans\? reclain\.com\/bookings\/bk-m3x1$/);
});

test("home visits and laundry pickups read right", () => {
  assert.match(n.confirmationSms(booking({ location: "home" }, VENUES[7])), /Spotless Kampala at your place/);
  assert.match(n.confirmationSms(booking({ location: "home" }, VENUES[6])), /Fresh Fold Laundry pickup/);
});

test("a very long venue name gets shortened before the message runs long", () => {
  const venue = { name: "The Extremely Long Named Kampala Hair, Nails and Everything Studio", slug: "long", categoryId: "hair" };
  for (const location of ["venue", "home"] as const) {
    const text = n.confirmationSms(booking({ location, paymentMethod: "cash", paymentStatus: "unpaid" }, venue));
    assertOneSms(text, `long/${location}`);
    assert.ok(text.includes("RCL-AB12CD"));
    assert.ok(text.includes("..."), text);
  }
});

test("the venue's text has the customer, their number, the services and the dashboard link", () => {
  for (const b of everyBooking()) {
    const text = n.venueBookingSms(b);
    assertOneSms(text, `venue/${b.business.name}/${b.location}`);
    assert.ok(text.startsWith("New booking RCL-AB12CD: Grace Nakato, 0772 123 456, Tue 8 Jan"), text);
    assert.ok(text.includes("10:00"), text);
    assert.ok(text.includes("Knotless"), text);
    assert.ok(text.includes("UGX 1,250,000"), text);
    assert.ok(!text.includes("....") && !text.includes(". ."), `no doubled full stops\n${text}`);
    assert.ok(text.endsWith("reclain.com/business/bookings"), text);
  }
  const many = booking({ items: Array.from({ length: 8 }, (_, i) => ({ id: `i${i}`, serviceId: null, name: `Deluxe treatment number ${i}`, price: 1, durationMin: 30 })) });
  const text = n.venueBookingSms(many);
  assertOneSms(text, "venue/many services");
  assert.ok(text.includes("Deluxe treatment number 0 + 7 more."), text);
  const short = booking({ total: 50000, items: [{ id: "i1", serviceId: "s1", name: "Cornrows", price: 50000, durationMin: 90 }] });
  assert.equal(
    n.venueBookingSms(short),
    "New booking RCL-AB12CD: Grace Nakato, 0772 123 456, Tue 8 Jan at 10:00. Cornrows. UGX 50,000 paid. Details: reclain.com/business/bookings",
  );
  assert.match(n.venueBookingSms(booking({ location: "home" })), /home visit/);
  assert.match(n.venueBookingSms({ ...short, paymentMethod: "cash", paymentStatus: "unpaid" }), /UGX 50,000 cash after service/);
  assert.match(n.venueBookingSms(booking({ paymentMethod: "cash", paymentStatus: "unpaid" })), /UGX 1,250,000 cash\./);
});

test("cancellations fit, and a paid one mentions the money", () => {
  for (const b of everyBooking()) {
    for (const by of ["customer", "venue"] as const) {
      const text = n.cancellationSms({ ...b, status: "cancelled" }, by);
      assertOneSms(text, `cancel/${by}/${b.business.name}`);
      assert.ok(text.includes("RCL-AB12CD"));
      assert.ok(text.includes(`reclain.com/v/${b.business.slug}`), text);
      if (b.paymentStatus === "paid") assert.ok(text.includes(by === "venue" ? "We'll refund your UGX 1,250,000" : "UGX 1,250,000"), text);
      else assert.ok(!text.includes("UGX"), text);
    }
    assertOneSms(n.venueCancellationSms({ ...b, status: "cancelled" }), `venue-cancel/${b.business.name}`);
  }
  assert.match(n.cancellationSms(booking({ status: "cancelled" }), "venue"), /^Sorry, The Braid Republic had to cancel/);
  assert.match(n.venueCancellationSms(booking({ status: "cancelled" })), /Grace Nakato, 0772 123 456/);
});

test("reminders fit, say tomorrow, and remind cash customers what to bring", () => {
  for (const b of everyBooking()) {
    const text = n.reminderSms(b);
    assertOneSms(text, `reminder/${b.business.name}/${b.location}/${b.paymentMethod}`);
    assert.match(text, /tomorrow/i);
    assert.ok(text.includes("Tue 8 Jan"));
    assert.ok(text.includes("10:00"));
    assert.ok(text.includes(`reclain.com/bookings/${UUID}`), text);
    if (b.paymentMethod === "cash") assert.ok(text.includes("UGX 1,250,000"), text);
  }
  assert.match(n.reminderSms(booking({ id: "bk-1" })), /^See you tomorrow! The Braid Republic, Tue 8 Jan at 10:00\. Ref RCL-AB12CD\. Can't make it\?/);
});

test("toGsm swaps the characters that would shrink an SMS to 70 characters", () => {
  assert.equal(n.toGsm("Aisha\u2019s \u201Cbest\u201D braids \u2013 all day\u2026"), `Aisha's "best" braids - all day...`);
  assert.equal(n.toGsm("  two\u00A0 spaces\n\nand lines "), "two spaces and lines");
  const curly = n.confirmationSms(booking({}, { name: "Nana\u2019s Braids", slug: "nanas", categoryId: "braids" }));
  assert.ok(curly.includes("Nana's Braids"));
  assert.match(curly, GSM_SAFE);
});

test("siteHost drops https and www but keeps a local address usable", () => {
  assert.equal(n.siteHost("https://reclain.com"), "reclain.com");
  assert.equal(n.siteHost("https://www.reclain.com/"), "reclain.com");
  assert.equal(n.siteHost("http://localhost:3000"), "http://localhost:3000");
});
