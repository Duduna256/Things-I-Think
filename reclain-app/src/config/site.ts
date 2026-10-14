// Business settings for reClain Services. Change a value here and the whole app follows.

export const site = {
  name: "reClain Services",
  // The short name: the wordmark in the nav and footer, and SMS sign-offs.
  shortName: "reClain",
  // Said "reclaim".
  pronounced: "reclaim",
  tagline: "Your to-do list, sorted.",
  description:
    "Book Kampala's best-rated pros for hair, laundry, cleaning, repairs, massage and licensed security. Pay with MTN MoMo, Airtel Money or card.",
  domain: "reclain.com",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  email: "hello@reclain.com",
  phone: "+256 700 000 000",
  city: "Kampala",
  country: "Uganda",

  // Money
  currency: "UGX",
  // Charged when a customer picks "At my place" at a venue that does both.
  // Each business can override this in its settings.
  defaultHomeVisitFee: 10000,

  // Time. Uganda is UTC+3 all year (no daylight saving).
  timezone: "Africa/Kampala",
  utcOffsetMinutes: 180,
  // Booking rules
  slotStepMinutes: 30, // a new start time every 30 minutes
  minLeadMinutes: 60, // earliest booking is one hour from now
  leadGraceMinutes: 15, // a slot shown at 60 minutes still books if checkout takes a while
  bookingWindowDays: 14, // how far ahead customers can book
  freeCancellationHours: 4, // shown in the policy text
  pendingPaymentMinutes: 30,
  latePaymentMinutes: 15, // after a hold ends, how long a payment may still turn up // an unpaid MoMo booking holds its slot this long
  reminderHourLocal: 18, // day-before SMS reminders go out around 18:00
} as const;

export type Site = typeof site;
