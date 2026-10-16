// Switch features on or off. Set a value to false, save, and that feature
// disappears from the app (and its checks are skipped on the server).

export const features = {
  // Booking & payment
  homeVisits: true, // "At my place" option for venues that offer it
  mobileMoney: true, // MTN MoMo and Airtel Money
  cardPayments: true, // card via the payment provider's checkout page
  cashPayments: true, // pay after the service (venues can also switch this off)
  reviews: true, // customers review completed bookings

  // Messages
  smsConfirmations: true, // SMS when a booking is confirmed or cancelled
  smsReminders: true, // SMS the day before (needs the Vercel Cron job)

  // Log in
  emailLinkLogin: true, // "email me a link"
  passwordLogin: true, // email + password
  googleLogin: true, // needs Google turned on in Supabase → Authentication → Providers

  // Businesses
  businessApproval: true, // new businesses wait for an admin before going live

  // Homepage sections (top to bottom)
  home: {
    floatingCards: true,
    marquee: true,
    categories: true,
    recommended: true,
    occasions: true,
    newVenues: true,
    trending: true,
    reviews: true,
    trust: true,
    appBand: true,
    businessBand: true,
    areas: true,
    faq: true,
  },
} as const;

export type Features = typeof features;
