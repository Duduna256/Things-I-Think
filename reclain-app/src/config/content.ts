// Words on the homepage and in a few shared places. Edit freely: no code changes needed.
// Icons are names from src/components/Icon.tsx.

export const hero = {
  // The headline reads: "Your <word>, sorted." The first word shows on load, then they rotate.
  before: "Your",
  rotatingWords: ["hair", "laundry", "deep clean", "plumbing", "massage", "security", "Saturday"],
  after: "sorted.",
  // What screen readers and search engines get instead of the rotating word.
  plain: "Your to-do list, sorted.",
  sub: "Hair, laundry, cleaning, repairs, massage and licensed security from Kampala's best-rated pros. Book in seconds, pay by MoMo, skip the WhatsApp back-and-forth.",
  searchPlaceholder: "All services and businesses",
};

// The scrolling band under the hero. Every third item is set in italics.
export const marquee = [
  "Deep cleans",
  "Wash & fold",
  "Plumbing call-outs",
  "Skin fades",
  "Solar system checks",
  "Knotless braids",
  "Airport security pickups",
  "Sofa steam cleans",
  "Hot stone massage",
  "TV wall mounting",
  "Gel manicures",
  "Kwanjula looks",
];

// "Got something on?" tiles. `q` is what gets searched when a tile is tapped.
export const occasions = [
  { title: "Kwanjula this weekend", sub: "Hair and make-up built to survive the speeches, the dancing and your Ssenga's inspection.", q: "kwanjula", cta: "See the glam", tone: "jac", icon: "ring", big: true },
  { title: "Job interview on Monday", sub: "A fresh fade that says “hire me”.", q: "fade", cta: "See the barbers", tone: "ink", icon: "comb" },
  { title: "In-laws arrive Friday", sub: "A deep clean. Yes, behind the fridge too.", q: "deep clean", cta: "Book the clean", tone: "mint", icon: "sparkle" },
  { title: "It's payday", sub: "You've earned a hot stone massage.", q: "massage", cta: "Claim your massage", tone: "peach", icon: "stones" },
  { title: "Rainy season hair", sub: "Passion twists that ignore the weather.", q: "twists", cta: "See the twists", tone: "sun", icon: "braid" },
  { title: "Taking cash to the bank", sub: "A licensed guard, calm and very hard to argue with.", q: "security", cta: "Book a guard", tone: "slate", icon: "shield" },
] as const;

// Treatments shown in "Trending this week" (matched by name in search).
export const trending = [
  "Knotless braids",
  "Skin fade",
  "Swedish massage",
  "Wash & fold",
  "Silk press",
  "Deep clean",
  "Gel manicure",
  "Airport pickup with security",
];

export const trust = {
  title: "Safe hands, verified.",
  note: "Booking a stranger is weird. We make it less weird.",
  cards: [
    { icon: "money", title: "Money held until the job's done", body: "MoMo and Airtel Money payments wait with reClain and reach the pro only after your service." },
    { icon: "shield", title: "Guards from licensed firms only", body: "Security bookings come from registered companies, with the paperwork to prove it." },
    { icon: "chat", title: "Reviews from real bookings", body: "Only people who actually booked can leave a review. No cousins." },
    { icon: "clock", title: "Plans change. We get it.", body: "Cancel or move a booking for free up to 4 hours before." },
  ],
  stats: [
    { value: "ID-checked", label: "Every pro on reClain passes an ID check and a skills review before their first booking." },
    { value: "UGX 0", label: "to sign up, for customers and for businesses. We earn a small fee only when a booking is done." },
  ],
};

export const appBand = {
  eyebrow: "The reClain app",
  title: "Your next appointment lives in your pocket",
  body: "Rebook your braider in two taps, get a reminder the night before, and pay with one MoMo prompt. Like a personal assistant who remembers your usual length.",
};

export const businessBand = {
  eyebrow: "reClain for business",
  titleStart: "Run your salon,",
  titleEm: "not",
  titleEnd: "your WhatsApp.",
  points: [
    "A calendar that fills itself while you're mid-braid",
    "MTN MoMo and Airtel Money payouts every evening",
    "Prepaid bookings that make no-shows think twice",
    "SMS reminders, so you stop sending “Are we still on?”",
  ],
  cta: "List your business",
  small: "Free to join. A small commission on completed bookings only.",
};

export const faq = [
  {
    q: "How does paying with MTN MoMo or Airtel Money work?",
    a: "Pick MTN MoMo or Airtel Money when you book and you'll get a prompt on your phone. Enter your PIN and the money is held by reClain until your service is done. If your pro doesn't show, you get it all back.",
  },
  {
    q: "Can my stylist come to my home?",
    a: "Look for the “Home visits” tag. Choose “At my place” when you book, add your address and your pro brings the tools. The travel fee is shown before you confirm.",
  },
  {
    q: "What if I need to cancel?",
    a: "Cancel or move your booking for free up to 4 hours before. After that the venue may keep a small fee, because they turned someone else away for you.",
  },
  {
    q: "Who checks the professionals?",
    a: "Every pro passes an ID check and a skills review. Massage therapists show a recognised certification, and security guards come from registered security companies.",
  },
  {
    q: "How does laundry pickup work?",
    a: "Book a pickup slot and a rider collects from your door. Wash & fold and wash & iron come back the next working day (we rest on Sundays). Express orders collected by 10:00 are back by 18:00 the same day.",
  },
];

// Placeholder text for the notes box, by category.
export const notesPlaceholder: Record<string, string> = {
  laundry: "Gate code, fabric care, which shirt is the lucky one…",
  escort: "Pickup point, how many people, anything the guard should know…",
  repairs: "What broke, when it started, the gate code…",
  cleaning: "Number of rooms, pets, where the mop lives…",
  default: "Allergies, hair length, the dog's name…",
};

// What the summary says before anything is picked, by category.
export const emptySummary: Record<string, string> = {
  escort: "Nothing booked yet. Pick the cover you need.",
  repairs: "Nothing selected yet. What's been almost working?",
  cleaning: "Nothing selected yet. Which rooms are we facing?",
  laundry: "Nothing in the bag yet.",
  default: "Nothing selected yet. Go on, treat yourself.",
};
