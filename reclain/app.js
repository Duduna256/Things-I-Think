// reClain front end. Venues, services and reviews below are sample content:
// replace them with data from your backend before launch.
"use strict";

// ---------- Data ----------
const HOME_FEE = 10000;

const REGIONS = {
  Kampala: ["Kololo", "Nakasero", "Wandegeya", "Ntinda", "Bukoto", "Kisementi", "Muyenga", "Munyonyo"],
  Wakiso: ["Kira", "Naalya", "Entebbe"],
  Mukono: ["Mukono"],
};
const ALL_AREAS = Object.values(REGIONS).flat();

const CATS = [
  { id: "cleaning", name: "Home cleaning", ic: "sparkle" },
  { id: "laundry", name: "Laundry", ic: "shirt", isNew: true },
  { id: "repairs", name: "Repairs", ic: "wrench" },
  { id: "hair", name: "Hair salons", ic: "scissors" },
  { id: "barber", name: "Barbers", ic: "comb" },
  { id: "braids", name: "Braids & locs", ic: "braid" },
  { id: "massage", name: "Massage & spa", ic: "stones", isNew: true },
  { id: "nails", name: "Nails & beauty", ic: "polish" },
  { id: "escort", name: "Security", ic: "shield", isNew: true },
  { id: "bridal", name: "Bridal & events", ic: "ring" },
];

const ROTATING = ["hair", "laundry", "deep clean", "plumbing", "massage", "security", "Saturday"];

const MARQUEE = ["Deep cleans", "Wash & fold", "Plumbing call-outs", "Skin fades", "Solar system checks", "Knotless braids", "Airport security pickups", "Sofa steam cleans", "Hot stone massage", "TV wall mounting", "Gel manicures", "Kwanjula looks"];

const OCCASIONS = [
  { title: "Kwanjula this weekend", sub: "Hair and make-up built to outlast the speeches, the dancing and your aunties' hugs.", q: "kwanjula", tone: "jac", ic: "ring", big: true },
  { title: "Job interview on Monday", sub: "A fade or a silk press that says “hire me”.", q: "fade", tone: "ink", ic: "comb" },
  { title: "In-laws arrive Friday", sub: "A deep clean. Yes, behind the fridge too.", q: "deep clean", tone: "mint", ic: "sparkle" },
  { title: "It's payday", sub: "You've earned a hot stone massage.", q: "massage", tone: "peach", ic: "stones" },
  { title: "Rainy season hair", sub: "Passion twists that ignore the weather.", q: "twists", tone: "sun", ic: "braid" },
  { title: "Taking cash to the bank", sub: "A licensed escort, calm and quietly intimidating.", q: "escort", tone: "slate", ic: "shield" },
];

// m = minutes, p = price in UGX, lab = duration label override
const LIB = {
  "knotless": { n: "Knotless braids (mid-back)", m: 330, p: 120000, d: "Medium parts. Braiding hair included in the colour of your choice." },
  "boho": { n: "Boho knotless braids", m: 390, p: 160000, d: "Knotless with curly human-hair pieces left out. Bring a snack." },
  "twists": { n: "Passion twists", m: 240, p: 100000, d: "Light, bouncy and unbothered by rainy season." },
  "cornrows": { n: "Cornrows", m: 90, p: 40000, d: "Straight-back or freestyle. Edges laid, not fried." },
  "locs-retwist": { n: "Locs retwist & style", m: 150, p: 60000, d: "Palm roll, retwist and a style of your choice." },
  "starter-locs": { n: "Starter locs", m: 240, p: 150000, d: "Comb coils or two-strand twists to start the journey." },
  "silk-press": { n: "Silk press", m: 120, p: 65000, d: "Wash, deep condition and a glass-smooth press." },
  "wash-blow": { n: "Wash, treat & blow-dry", m: 75, p: 45000, d: "Deep-conditioning treatment and a bouncy finish." },
  "relaxer": { n: "Relaxer retouch", m: 120, p: 50000, d: "Scalp-protected retouch with treatment and set." },
  "wig-install": { n: "Frontal wig install", m: 120, p: 80000, d: "Glueless or glued, plucked, cut and styled." },
  "colour": { n: "Full-head colour", m: 150, p: 120000, d: "Single-process colour with bond protection." },
  "trim": { n: "Trim & treatment", m: 60, p: 35000, d: "A dusting of the ends and a moisture treatment." },
  "kids-braids": { n: "Kids' braids", m: 120, p: 45000, d: "Gentle hands, cartoons on, tears optional." },
  "kids-cut": { n: "Kids' cut (under 12)", m: 30, p: 12000, d: "Patience included. Lollipop negotiable." },
  "cut-fade": { n: "Skin fade", m: 45, p: 20000, d: "Clean fade, sharp edge-up and a hot towel finish." },
  "cut-beard": { n: "Haircut & beard sculpt", m: 60, p: 30000, d: "Cut plus beard shape, line-up and oil." },
  "shave": { n: "Hot towel shave", m: 30, p: 15000, d: "Straight razor, hot towels and zero rush." },
  "beard-dye": { n: "Beard dye", m: 30, p: 15000, d: "Covers the grey. Keeps the wisdom." },
  "swedish": { n: "Swedish massage", m: 60, p: 80000, d: "Full-body relaxation from a certified therapist." },
  "deep-tissue": { n: "Deep tissue massage", m: 90, p: 95000, d: "Firm pressure for the knots Jinja Road traffic left behind." },
  "hot-stone": { n: "Hot stone massage", m: 75, p: 110000, d: "Warm basalt stones to melt stiffness and stress." },
  "sports": { n: "Sports & recovery massage", m: 60, p: 90000, d: "Before the Kampala marathon or after it. We won't judge." },
  "reflexology": { n: "Foot reflexology", m: 45, p: 50000, d: "Pressure-point foot and lower-leg massage." },
  "couples": { n: "Couples massage", m: 60, p: 170000, d: "Two therapists, side by side. Anniversary sorted." },
  "gel-mani": { n: "Gel manicure", m: 60, p: 35000, d: "Shaped, buffed and gel-polished to last three weeks." },
  "pedi": { n: "Spa pedicure", m: 60, p: 40000, d: "Soak, scrub, massage and polish." },
  "acrylic": { n: "Acrylic full set", m: 90, p: 60000, d: "Any length, any shape, typing ability not guaranteed." },
  "lashes": { n: "Classic lash extensions", m: 90, p: 50000, d: "Natural-looking lashes, applied one by one." },
  "brows": { n: "Brow shape & tint", m: 30, p: 20000, d: "Threaded and tinted so they're sisters, not twins." },
  "makeup": { n: "Soft glam make-up", m: 60, p: 60000, d: "Camera-ready, sweat-proof, wedding-proof." },
  "bridal-hair": { n: "Bridal hair (on the day)", m: 180, p: 250000, d: "Includes a trial session the week before." },
  "bridal-makeup": { n: "Bridal make-up", m: 120, p: 200000, d: "Long-wear make-up with lashes and touch-up kit." },
  "kwanjula": { n: "Kwanjula look (hair & make-up)", m: 150, p: 220000, d: "Styled to stand up to a full day of introduction ceremony." },
  "bridesmaid": { n: "Bridesmaid styling", m: 60, p: 70000, d: "Per person. Group of four or more gets 10% off." },
  "wash-fold": { n: "Wash & fold (5 kg bag)", m: 0, lab: "Back next day", p: 25000, d: "Free pickup and delivery. Socks returned in pairs." },
  "wash-iron": { n: "Wash & iron (5 kg bag)", m: 0, lab: "Back next day", p: 35000, d: "Shirts, trousers and dresses, pressed sharp." },
  "dry-clean": { n: "Dry cleaning (per item)", m: 0, lab: "Back in 2 days", p: 20000, d: "Suits, gomesi, kanzu and delicate fabrics." },
  "bedding": { n: "Bedding & curtains", m: 0, lab: "Back in 2 days", p: 40000, d: "Duvets, sheets, blankets and curtains." },
  "express": { n: "Express same-day", m: 0, lab: "Back by 18:00", p: 45000, d: "Picked up by 10:00 and back the same evening." },
  "clean-std": { n: "Standard home clean", m: 180, p: 70000, d: "Floors, kitchen, bathrooms and dusting for a 2–3 bedroom home." },
  "clean-deep": { n: "Deep clean", m: 300, p: 150000, d: "Inside cupboards, behind the fridge, the works." },
  "sofa": { n: "Sofa & carpet steam clean", m: 150, p: 90000, d: "Removes stains, smells and that one mystery spot." },
  "post-party": { n: "After-party clean", m: 240, p: 120000, d: "After the kwanjula, the graduation, the birthday. We've seen worse." },
  "escort-personal": { n: "Personal security escort", m: 240, p: 150000, d: "A licensed guard with you for meetings, banks or events. Up to 4 hours." },
  "escort-airport": { n: "Airport pickup & escort", m: 180, p: 120000, d: "Meet-and-greet at Entebbe with a vetted driver and escort." },
  "event-guard": { n: "Event security guard", m: 480, p: 100000, d: "Per guard for weddings, parties and introductions." },
  "school-run": { n: "School-run escort (weekly)", m: 60, p: 60000, d: "A vetted escort for the morning and afternoon run, Mon–Fri." },
  "plumbing": { n: "Plumbing call-out", m: 60, p: 50000, d: "Leaks, blockages and installations. Parts quoted on site." },
  "electrical": { n: "Electrical call-out", m: 60, p: 50000, d: "Sockets, lights, wiring and fault finding." },
  "appliance": { n: "Appliance repair", m: 90, p: 60000, d: "Fridges, washers and cookers brought back to life." },
  "tv-mount": { n: "TV wall mounting", m: 60, p: 40000, d: "Level, secure and cables hidden. Bracket not included." },
  "solar": { n: "Solar system check", m: 120, p: 90000, d: "Panels, batteries and inverter tested and cleaned." },
};

// visit: "salon" (you go to them), "both" (salon or home), "mobile" (they come to you)
const VENUES = [
  { id: "braid-republic", name: "The Braid Republic", cat: "braids", area: "Ntinda", rating: 4.9, reviews: 1284, word: "braids",
    pal: ["#2b1a4a", "#7b4fd6", "#f6b9a3"], visit: "both", hours: [8, 20], closed: [], px: 1, rec: true,
    blurb: "Neat parts, gentle hands and a playlist you didn't know you needed. For the long styles, bring snacks.",
    team: [["Aisha Nakato", "Senior braider", 4.9], ["Nana Achan", "Braider", 4.8], ["Joy Kemigisha", "Locs specialist", 5.0]],
    menu: [["Braids", ["knotless", "boho", "twists", "cornrows"]], ["Locs", ["locs-retwist", "starter-locs"]], ["Care", ["wash-blow"]]] },
  { id: "fade-kings", name: "Fade Kings Barbershop", cat: "barber", area: "Wandegeya", rating: 4.8, reviews: 2031, word: "fade",
    pal: ["#141416", "#3c3b48", "#e0b252"], visit: "both", hours: [7, 21], closed: [], px: 1, rec: true,
    blurb: "Fades so clean your old barber will hear about it. Office visits available, so your boss can wonder.",
    team: [["Brian Okello", "Master barber", 4.9], ["Kato Musa", "Barber", 4.8], ["Ronald Ssewanyana", "Barber", 4.7]],
    menu: [["Cuts", ["cut-fade", "cut-beard", "kids-cut"]], ["Shaves & beards", ["shave", "beard-dye"]]] },
  { id: "silk-press-society", name: "Silk Press Society", cat: "hair", area: "Kololo", rating: 5.0, reviews: 412, word: "silk",
    pal: ["#3b1d2a", "#c0587a", "#ffd3c2"], visit: "salon", hours: [9, 19], closed: [0], px: 1.15, rec: true,
    blurb: "Natural hair, pressed like it has somewhere important to be. Heat protection is not optional here.",
    team: [["Ruth Namubiru", "Natural hair specialist", 5.0], ["Patience Akello", "Colourist", 4.9]],
    menu: [["Styling", ["silk-press", "wash-blow", "trim"]], ["Colour & chemical", ["colour", "relaxer"]], ["Wigs", ["wig-install"]]] },
  { id: "locs-lattes", name: "Locs & Lattes", cat: "braids", area: "Kisementi", rating: 4.9, reviews: 689, word: "locs",
    pal: ["#2a1d14", "#8a5a3b", "#f0c27a"], visit: "salon", hours: [8, 18], closed: [], px: 1.05, isNew: true,
    blurb: "A locs studio with a proper espresso machine. Your retwist comes with a flat white, because priorities.",
    team: [["Moses Kizito", "Loctician", 4.9], ["Faith Atuhaire", "Loctician", 4.8]],
    menu: [["Locs", ["locs-retwist", "starter-locs"]], ["Braids", ["twists", "cornrows"]]] },
  { id: "kneaded", name: "Kneaded Massage & Spa", cat: "massage", area: "Muyenga", rating: 4.9, reviews: 530, word: "knead",
    pal: ["#0f3b33", "#2f8f78", "#cde9c9"], visit: "both", hours: [9, 21], closed: [], px: 1, rec: true, isNew: true,
    blurb: "Certified therapists, hot towels and a view of the lake from the top of Muyenga hill. Or at home, if the hill is too much.",
    team: [["Esther Achieng", "Certified massage therapist", 4.9], ["Paul Waiswa", "Sports therapist", 4.8], ["Mary Nantongo", "Reflexologist", 4.9]],
    menu: [["Massage", ["swedish", "deep-tissue", "hot-stone", "sports"]], ["Feet", ["reflexology"]], ["For two", ["couples"]]] },
  { id: "polished", name: "Polished Nail Bar", cat: "nails", area: "Nakasero", rating: 4.7, reviews: 944, word: "gloss",
    pal: ["#4a1030", "#e0457b", "#ffd0dc"], visit: "salon", hours: [9, 20], closed: [], px: 1,
    blurb: "Gels that last longer than most group chats. Walk in tired, leave with ten tiny works of art.",
    team: [["Sandra Nabirye", "Nail technician", 4.8], ["Gloria Auma", "Lash & brow artist", 4.7]],
    menu: [["Nails", ["gel-mani", "pedi", "acrylic"]], ["Lashes & brows", ["lashes", "brows"]], ["Make-up", ["makeup"]]] },
  { id: "fresh-fold", name: "Fresh Fold Laundry", cat: "laundry", area: "Bukoto", rating: 4.8, reviews: 1502, word: "fold",
    pal: ["#0d2c4d", "#2f7fd1", "#bfe3ff"], visit: "mobile", hours: [7, 19], closed: [0], px: 1, rec: true, isNew: true, skipPro: true,
    blurb: "We collect, wash, press and bring it back folded like a department store. You do literally nothing.",
    team: [["Pickup crew", "Riders", 4.8]],
    menu: [["Laundry", ["wash-fold", "wash-iron", "express"]], ["Specialist", ["dry-clean", "bedding"]]] },
  { id: "spotless", name: "Spotless Kampala", cat: "cleaning", area: "Naalya", rating: 4.7, reviews: 803, word: "shine",
    pal: ["#123a2b", "#3cae84", "#e3f6c8"], visit: "mobile", hours: [7, 18], closed: [0], px: 1,
    blurb: "Two-person crews, their own supplies and a strict no-shortcuts policy. Behind the fridge included.",
    team: [["Crew Peter", "Peter Ssali & team", 4.8], ["Crew Annet", "Annet Nakku & team", 4.7]],
    menu: [["Home", ["clean-std", "clean-deep", "post-party"]], ["Furniture", ["sofa"]]] },
  { id: "guardline", name: "Guardline Security", cat: "escort", area: "Kololo", rating: 4.8, reviews: 211, word: "safe",
    pal: ["#151a22", "#34465c", "#9fb4cc"], visit: "mobile", hours: [6, 22], closed: [], px: 1, isNew: true, rec: true,
    blurb: "Licensed, uniformed or plain-clothes guards from a registered security company. Calm, punctual, quietly intimidating.",
    team: [["Daniel Okot", "Senior escort officer", 4.9], ["Grace Apio", "Escort officer", 4.8], ["Isaac Mugisha", "Event security lead", 4.7]],
    menu: [["Escorts", ["escort-personal", "escort-airport", "school-run"]], ["Events", ["event-guard"]]] },
  { id: "fix-it-fred", name: "Fix-It Fred", cat: "repairs", area: "Kira", rating: 4.6, reviews: 377, word: "fixed",
    pal: ["#3a2408", "#c8741c", "#ffd88a"], visit: "mobile", hours: [8, 18], closed: [0], px: 1,
    blurb: "Fred and his team fix the things that have been “almost working” since last year. Call-out fee covers the first hour.",
    team: [["Fred Lubega", "Electrician & plumber", 4.7], ["Simon Opio", "Appliance technician", 4.6]],
    menu: [["Call-outs", ["plumbing", "electrical", "appliance"]], ["Installs", ["tv-mount", "solar"]]] },
  { id: "crown-comb", name: "Crown & Comb Kids", cat: "hair", area: "Entebbe", rating: 4.9, reviews: 268, word: "crowns",
    pal: ["#1d2f5a", "#5a7be0", "#ffe08a"], visit: "both", hours: [9, 18], closed: [], px: 0.95, isNew: true,
    blurb: "A kids' salon with cartoons, patience and stylists who can braid a moving target.",
    team: [["Lydia Namata", "Kids' stylist", 4.9], ["Hope Birungi", "Kids' stylist", 4.8]],
    menu: [["Kids", ["kids-braids", "kids-cut", "cornrows"]], ["Care", ["wash-blow"]]] },
  { id: "glow-bridal", name: "Glow Bridal Studio", cat: "bridal", area: "Munyonyo", rating: 5.0, reviews: 156, word: "I do",
    pal: ["#3a2a20", "#b48a6a", "#f7e3cf"], visit: "both", hours: [6, 20], closed: [], px: 1, rec: true,
    blurb: "Weddings and kwanjulas, styled to survive speeches, dancing and your auntie's hugs.",
    team: [["Joan Atim", "Bridal hair & make-up", 5.0], ["Carol Namuli", "Make-up artist", 4.9]],
    menu: [["Bridal", ["bridal-hair", "bridal-makeup", "kwanjula"]], ["Party", ["bridesmaid", "makeup"]]] },
  { id: "cuts-curls", name: "Cuts & Curls Mukono", cat: "barber", area: "Mukono", rating: 4.7, reviews: 98, word: "curls",
    pal: ["#1f1a3a", "#4a3fa0", "#ff9e7a"], visit: "salon", hours: [8, 20], closed: [], px: 0.9, isNew: true,
    blurb: "Barbers and stylists under one roof, ten minutes from Mukono taxi park.",
    team: [["Eric Ssekandi", "Barber", 4.7], ["Brenda Nalwoga", "Stylist", 4.7]],
    menu: [["Cuts", ["cut-fade", "cut-beard", "kids-cut"]], ["Hair", ["wash-blow", "relaxer", "cornrows"]]] },
];

const REVIEWS = [
  { name: "Grace N.", area: "Ntinda", venue: "braid-republic", title: "Five hours felt like two",
    text: "Aisha did my knotless braids at home on a Sunday. On time, neat parts, and she brought her own ring light. Next set already booked." },
  { name: "Daniel O.", area: "Kololo", venue: "fade-kings", title: "My barber now comes to the office",
    text: "Every second Friday at 1pm. Clean fade, no queue, and my boss thinks I have a personal stylist. Technically, I do." },
  { name: "Sharon A.", area: "Kira", venue: "spotless", title: "The kwanjula aftermath, handled",
    text: "Two cleaners, four hours, and the house looked like 200 guests never came. Paid with Airtel Money from the sofa they had just cleaned." },
  { name: "Ivan M.", area: "Bukoto", venue: "fresh-fold", title: "My shirts have never been this confident",
    text: "Picked up at 8, back by 6, pressed sharper than my presentation. The socks came back in pairs, which I can't say for myself." },
  { name: "Peace K.", area: "Muyenga", venue: "kneaded", title: "Booked after a week of Jinja Road traffic",
    text: "Esther found knots I'd been carrying since 2019. I paid with MoMo, then had a nap I'd describe as spiritual." },
  { name: "Brian K.", area: "Nakasero", venue: "guardline", title: "A bank run with backup",
    text: "Needed an escort to deposit our fundraising cash. Licensed, punctual and quietly intimidating in the best way." },
];

const TRENDING = ["knotless", "cut-fade", "swedish", "wash-fold", "silk-press", "clean-deep", "gel-mani", "escort-airport"];

// ---------- Helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ugx = n => "UGX " + Math.round(n).toLocaleString("en-US");
const catName = id => CATS.find(c => c.id === id)?.name || id;
const venueById = id => VENUES.find(v => v.id === id);
const regionOf = area => Object.keys(REGIONS).find(r => REGIONS[r].includes(area));
const placeOf = area => (regionOf(area) === area ? area : `${area}, ${regionOf(area)}`);
const priceOf = (v, sid) => Math.round(LIB[sid].p * v.px / 1000) * 1000;
const menuIds = v => v.menu.flatMap(g => g[1]);
const initials = name => name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
const icon = (id, cls = "ic") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

function dur(m) {
  if (!m) return "";
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `${h}h${r ? ` ${r}min` : ""}` : `${r}min`;
}
const durLabel = sid => LIB[sid].lab || dur(LIB[sid].m);
const hhmm = mins => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const fmtDate = s => parseYmd(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

function starsHTML(n = 5) {
  return `<span class="stars" aria-hidden="true">${icon("star").repeat(n)}</span>`;
}
function ratingHTML(v) {
  return `<span class="rating"><span>${v.rating.toFixed(1)}</span>${starsHTML()}<span class="count">(${v.reviews.toLocaleString("en-US")})</span></span>`;
}
function coverHTML(v, badge = "") {
  const style = `--c1:${v.pal[0]};--c2:${v.pal[1]};--c3:${v.pal[2]}`;
  const media = v.image ? `<img src="${esc(v.image)}" alt="" loading="lazy">` : `<span class="cover-word">${esc(v.word)}</span>`;
  return `<div class="cover" style="${style}">${badge}${media}</div>`;
}
function gradientSwatch(v) {
  return `background:radial-gradient(90% 90% at 80% 10%, ${v.pal[2]} 0, transparent 60%), ${v.pal[1]}`;
}

// Deterministic pseudo-random availability, so a slot doesn't flicker between renders.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 100;
}

// ---------- Storage (per-browser convenience only) ----------
const STORE_KEY = "reclain:v2";
const store = (() => {
  let data = { bookings: [], user: null, details: {} };
  try { Object.assign(data, JSON.parse(localStorage.getItem(STORE_KEY) || "{}")); } catch { /* storage unavailable */ }
  return {
    data,
    save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* ignore */ } },
  };
})();

// ---------- Mobile money ----------
const NETWORKS = {
  mtn: { label: "MTN MoMo", prefixes: ["76", "77", "78", "39"] },
  airtel: { label: "Airtel Money", prefixes: ["70", "74", "75", "20"] },
};
const PAY_LABELS = { mtn: "MTN MoMo", airtel: "Airtel Money", card: "Card (link by SMS)", cash: "Cash after service" };

// Accepts 0772123456, 772123456, +256772123456 or "256 772 123 456"; returns 9 digits or null.
function normalizeMsisdn(raw) {
  const digits = String(raw || "").replace(/\D/g, "").replace(/^256/, "").replace(/^0/, "");
  return /^\d{9}$/.test(digits) ? digits : null;
}
const networkOf = msisdn => Object.keys(NETWORKS).find(k => NETWORKS[k].prefixes.includes(msisdn.slice(0, 2)));
const prettyMsisdn = m => `0${m.slice(0, 3)} ${m.slice(3, 6)} ${m.slice(6)}`;

// Placeholder for the real collection request. Production code should call your
// backend, which calls the MTN MoMo / Airtel Money Collections APIs. API keys
// must never live in front-end code.
function requestMobileMoneyPayment({ network, msisdn, amount, reference }) {
  return new Promise(resolve => setTimeout(() => resolve({ status: "PENDING", network, msisdn: "+256" + msisdn, amount, reference }), 900));
}

// ---------- Toast ----------
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3600);
}

// ---------- Home page ----------
const filters = { q: "", area: "", cat: "" };

function venueCard(v) {
  let badge = "";
  if (v.visit === "both") badge = `<span class="cover-badge">${icon("home")}Home visits</span>`;
  else if (v.visit === "mobile") badge = `<span class="cover-badge">${icon("home")}Comes to you</span>`;
  else if (v.isNew) badge = `<span class="cover-badge">New</span>`;
  return `<article class="vcard">
    <button type="button" class="vcard-hit" data-venue="${v.id}" aria-label="Book at ${esc(v.name)}, ${esc(v.area)}, rated ${v.rating}">
      ${coverHTML(v, badge)}
      <div class="vcard-body">
        <span class="vcard-name">${esc(v.name)}</span>
        ${ratingHTML(v)}
        <span class="vcard-area">${esc(placeOf(v.area))}</span>
        <span class="tag">${esc(catName(v.cat))}</span>
      </div>
    </button>
  </article>`;
}

function renderChips() {
  $("#chips").innerHTML = [`<button type="button" class="chip chip-lg chip-all" data-chip="" aria-pressed="${!filters.cat}">All</button>`]
    .concat(CATS.map(c => `<button type="button" class="chip chip-lg" data-chip="${c.id}" aria-pressed="${filters.cat === c.id}">
      <span class="chip-ic">${icon(c.ic)}</span>${esc(c.name)}${c.isNew ? '<span class="new">NEW</span>' : ""}</button>`))
    .join("");
}

function renderRails() {
  $("#railRecommended").innerHTML = VENUES.filter(v => v.rec).map(venueCard).join("");
  $("#railNew").innerHTML = VENUES.filter(v => v.isNew).map(venueCard).join("");
  $$(".rail-nav").forEach(nav => updateRailNav(nav));
}

function updateRailNav(nav) {
  const rail = document.getElementById(nav.dataset.rail);
  const [prev, next] = $$("button", nav);
  prev.disabled = rail.scrollLeft <= 4;
  next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
}

function renderTrending() {
  $("#trending").innerHTML = TRENDING.map(sid => {
    const offering = VENUES.filter(v => menuIds(v).includes(sid));
    const from = Math.min(...offering.map(v => priceOf(v, sid)));
    return `<button type="button" class="ttile" data-treatment="${sid}">
      <span class="sw" style="${gradientSwatch(offering[0])}"></span>
      <span><b>${esc(LIB[sid].n)}</b><small>from ${ugx(from)} · ${offering.length} venue${offering.length > 1 ? "s" : ""}</small></span>
    </button>`;
  }).join("");
}

function renderOccasions() {
  $("#bento").innerHTML = OCCASIONS.map(o => `<button type="button" class="occ tone-${o.tone}${o.big ? " occ-big" : ""}" data-occasion="${esc(o.q)}">
      <span class="occ-title">${esc(o.title)}</span>
      <span class="occ-foot"><span class="occ-sub">${esc(o.sub)}</span><span class="occ-go">Find the fix ${icon("arrow")}</span></span>
      ${icon(o.ic, "ic occ-art")}
    </button>`).join("");
}

function renderMarquee() {
  const run = MARQUEE.map(t => `<span>${esc(t)}</span>${icon("sparkle")}`).join("");
  $("#marquee").innerHTML = run + run;
}

let rotTimer = null;
function startRotator() {
  const el = $("#rot");
  if (rotTimer || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let i = 0;
  rotTimer = setInterval(() => {
    el.classList.remove("swap-in");
    el.classList.add("swap-out");
    setTimeout(() => {
      i = (i + 1) % ROTATING.length;
      el.textContent = ROTATING[i];
      el.classList.remove("swap-out");
      el.classList.add("swap-in");
    }, 280);
  }, 2600);
}

function renderReviews() {
  $(".score .stars").innerHTML = icon("star").repeat(5);
  $("#reviewRail").innerHTML = REVIEWS.map(r => {
    const v = venueById(r.venue);
    return `<article class="review">
      ${starsHTML()}
      <h3>${esc(r.title)}</h3>
      <p>${esc(r.text)}</p>
      <footer><span class="avatar" style="background:${v.pal[2]}">${initials(r.name)}</span>
        <span><b>${esc(r.name)}</b><small>${esc(r.area)} · booked ${esc(v.name)}</small></span></footer>
    </article>`;
  }).join("");
}

let activeRegion = "Kampala";
function renderAreas() {
  $("#areaTabs").innerHTML = Object.keys(REGIONS).map(r =>
    `<button type="button" class="area-tab" role="tab" data-region="${r}" aria-selected="${r === activeRegion}">${r}</button>`).join("");
  const links = [];
  for (const area of REGIONS[activeRegion]) {
    const here = VENUES.filter(v => v.area === area);
    for (const cat of [...new Set(here.map(v => v.cat))]) {
      const n = here.filter(v => v.cat === cat).length;
      links.push(`<button type="button" class="area-link" data-area-link="${area}" data-cat="${cat}">
        <b>${esc(catName(cat))} in ${esc(area)}</b><small>${n} venue${n > 1 ? "s" : ""}</small></button>`);
    }
  }
  $("#areaList").innerHTML = links.join("");
}

function fillAreaSelects() {
  const groups = Object.entries(REGIONS).map(([r, areas]) =>
    `<optgroup label="${r}">${areas.map(a => `<option value="${a}">${a}</option>`).join("")}</optgroup>`).join("");
  $("#area").innerHTML = `<option value="">All of Kampala</option>${groups}`;
  $("#joinArea").innerHTML = `<option value="">Choose your area</option>${groups}`;
}

// ---------- Search ----------
function venueMatches(v, q) {
  if (!q) return true;
  const hay = [v.name, catName(v.cat), v.cat, v.area, ...menuIds(v).map(id => LIB[id].n)].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(t => hay.includes(t) || hay.includes(t.replace(/s$/, "")));
}

function runSearch({ scroll = true } = {}) {
  const { q, area, cat } = filters;
  renderChips();
  const section = $("#results");
  if (!q && !area && !cat) { section.hidden = true; return; }
  const list = VENUES.filter(v => (!area || v.area === area) && (!cat || v.cat === cat) && venueMatches(v, q));
  const what = q ? `“${esc(q)}”` : cat ? esc(catName(cat).toLowerCase()) : "venues";
  const where = area ? ` in ${esc(area)}` : "";
  $("#resultsTitle").innerHTML = list.length
    ? `${list.length} ${list.length === 1 ? "match" : "matches"} for ${what}${where}`
    : `Nothing for ${what}${where} yet`;
  $("#resultsGrid").innerHTML = list.length
    ? list.map(venueCard).join("")
    : `<div class="empty" style="grid-column:1/-1"><b>Even our search has limits.</b>
        <p>Try “braids”, “fade”, “massage” or “laundry”, or widen the area. Or tell your favourite stylist to join reClain.</p>
        <button type="button" class="btn btn-ghost" id="emptyClear">Show everything</button></div>`;
  section.hidden = false;
  if (scroll) section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearSearch() {
  filters.q = ""; filters.area = ""; filters.cat = "";
  $("#q").value = ""; $("#area").value = "";
  runSearch();
  $("#recommended").scrollIntoView({ behavior: "smooth", block: "start" });
}

// Suggestions under the search box
let suggestIndex = -1;
function suggestions(q) {
  q = q.trim().toLowerCase();
  if (!q) {
    return [{ label: "Popular categories" }, ...["braids", "barber", "massage", "laundry", "escort"].map(id =>
      ({ kind: "cat", id, title: catName(id), sub: `${VENUES.filter(v => v.cat === id).length} venues`, ic: "search" }))];
  }
  const out = [];
  const cats = CATS.filter(c => c.name.toLowerCase().includes(q) || c.id.includes(q)).slice(0, 3);
  const treatments = Object.entries(LIB).filter(([, s]) => s.n.toLowerCase().includes(q)).slice(0, 4);
  const venues = VENUES.filter(v => v.name.toLowerCase().includes(q) || v.area.toLowerCase().includes(q)).slice(0, 4);
  if (cats.length) out.push({ label: "Categories" }, ...cats.map(c => ({ kind: "cat", id: c.id, title: c.name, sub: "Category", ic: "search" })));
  if (treatments.length) out.push({ label: "Treatments" }, ...treatments.map(([id, s]) => ({ kind: "treat", id, title: s.n, sub: durLabel(id) || "Service", ic: "clock" })));
  if (venues.length) out.push({ label: "Venues" }, ...venues.map(v => ({ kind: "venue", id: v.id, title: v.name, sub: `${v.area} · ${v.rating.toFixed(1)} ★`, ic: "store" })));
  return out;
}

function renderSuggest() {
  const box = $("#suggest");
  const items = suggestions($("#q").value);
  suggestIndex = -1;
  if (!items.some(i => i.kind)) { box.hidden = true; return; }
  box.innerHTML = items.map(i => i.label
    ? `<p class="suggest-label">${esc(i.label)}</p>`
    : `<button type="button" class="suggest-item" role="option" data-kind="${i.kind}" data-id="${i.id}">
         <span class="sw">${icon(i.ic)}</span><span><b>${esc(i.title)}</b><small>${esc(i.sub)}</small></span></button>`).join("");
  box.hidden = false;
}

function pickSuggestion(btn) {
  const { kind, id } = btn.dataset;
  $("#suggest").hidden = true;
  if (kind === "venue") { openFlow(id); return; }
  if (kind === "cat") { filters.cat = id; filters.q = ""; $("#q").value = ""; }
  if (kind === "treat") { filters.q = LIB[id].n; filters.cat = ""; $("#q").value = LIB[id].n; }
  filters.area = $("#area").value;
  runSearch();
}

// ---------- Booking flow ----------
const flow = { v: null, items: [], where: "venue", pro: null, date: null, time: null, step: 0, steps: [], done: null, sending: false };
const STEP_LABELS = { services: "Services", pro: "Professional", time: "Time", confirm: "Confirm" };

function preferredDate(v) {
  const today = new Date();
  const pref = $("#when").value;
  let start = today;
  if (pref === "tomorrow") start = addDays(today, 1);
  if (pref === "weekend") {
    const dow = today.getDay();
    start = dow === 6 || dow === 0 ? today : addDays(today, 6 - dow);
  }
  for (let i = 0; i < 14; i++) {
    const d = addDays(start, i);
    if (!v.closed.includes(d.getDay())) return ymd(d);
  }
  return ymd(start);
}

function openFlow(venueId, { service } = {}) {
  const v = venueById(venueId);
  if (!v) return;
  Object.assign(flow, {
    v, items: service && menuIds(v).includes(service) ? [service] : [], where: v.visit === "mobile" ? "home" : "venue",
    pro: v.skipPro ? "any" : null, date: preferredDate(v), time: null, step: 0, done: null, sending: false,
    steps: v.skipPro ? ["services", "time", "confirm"] : ["services", "pro", "time", "confirm"],
  });
  closeMenu();
  $("#suggest").hidden = true;
  const dlg = $("#flow");
  if (!dlg.open) dlg.showModal();
  renderFlow();
}

const totalMins = () => flow.items.reduce((s, id) => s + LIB[id].m, 0);
const blockMins = () => (flow.v.cat === "laundry" ? 30 : Math.max(totalMins(), 30));
const homeFee = () => (flow.v.visit === "both" && flow.where === "home" ? HOME_FEE : 0);
const subtotal = () => flow.items.reduce((s, id) => s + priceOf(flow.v, id), 0);
const total = () => subtotal() + homeFee();
const proName = () => (flow.pro === "any" || !flow.pro ? (flow.v.skipPro ? "" : "Any professional") : flow.pro);
const currentStep = () => flow.steps[flow.step];

function stepValid(step = currentStep()) {
  if (step === "services") return flow.items.length > 0;
  if (step === "pro") return !!flow.pro;
  if (step === "time") return !!flow.date && flow.time !== null;
  return true;
}

function nextLabel() {
  const step = currentStep();
  if (step !== "confirm") return "Continue";
  if (flow.sending) return "Sending payment prompt…";
  const pay = $("#payForm")?.elements.pay.value || "mtn";
  return pay in NETWORKS ? `Confirm and pay ${ugx(total())}` : "Confirm booking";
}

function renderFlow() {
  const dlg = $("#flow");
  dlg.classList.toggle("is-done", !!flow.done);
  $("#crumbs").innerHTML = flow.steps.map((s, i) => {
    const cls = flow.done || i < flow.step ? "done" : i === flow.step ? "current" : "";
    return `<li class="${cls}"${i === flow.step && !flow.done ? ' aria-current="step"' : ""}>${STEP_LABELS[s]}</li>`;
  }).join("");
  $("#flowBack").classList.toggle("is-hidden", !!flow.done);
  $("#flowBack").disabled = !!flow.done;
  $("#flowProgress").style.width = `${flow.done ? 100 : ((flow.step + 1) / (flow.steps.length + 1)) * 100}%`;
  const main = $("#flowMain");
  if (flow.done) main.innerHTML = doneHTML();
  else main.innerHTML = { services: servicesHTML, pro: proHTML, time: timeHTML, confirm: confirmHTML }[currentStep()]();
  if (currentStep() === "confirm" && !flow.done) wireConfirm();
  renderSummary();
  $("#flowScroll").scrollTop = 0;
}

function renderSummary() {
  const v = flow.v;
  const lines = flow.items.map(id => `<div class="sum-line"><span>${esc(LIB[id].n)}<small>${esc(durLabel(id))}</small></span><span class="amt">${ugx(priceOf(v, id))}</span></div>`).join("");
  const fee = homeFee() ? `<div class="sum-line"><span>Home visit<small>Travel to your place</small></span><span class="amt">${ugx(HOME_FEE)}</span></div>` : "";
  const when = flow.time !== null ? `<div class="sum-when">${icon("cal")}<span>${fmtDate(flow.date)} · ${hhmm(flow.time)}${totalMins() ? ` (${dur(totalMins())})` : ""}</span></div>` : "";
  const who = proName() && flow.pro ? `<div class="sum-when">${icon("user")}<span>${esc(proName())}</span></div>` : "";
  const where = `<div class="sum-when">${icon(flow.where === "home" ? "home" : "pin")}<span>${flow.where === "home" ? (v.cat === "laundry" ? "Pickup from your place" : "At your place") : `${esc(v.name)}, ${esc(v.area)}`}</span></div>`;
  const disabled = !stepValid() || flow.sending ? "disabled" : "";
  $("#summary").innerHTML = `
    <div class="sum-venue">${coverHTML(v)}<span><b>${esc(v.name)}</b><small>${v.rating.toFixed(1)} ★ (${v.reviews.toLocaleString("en-US")}) · ${esc(v.area)}</small></span></div>
    ${flow.items.length ? `<div class="sum-lines">${lines}${fee}</div>` : `<p class="sum-empty">Nothing selected yet. Go on, treat yourself.</p>`}
    ${flow.items.length ? `${where}${who}${when}` : ""}
    <div class="sum-total"><span>Total</span><span>${flow.items.length ? ugx(total()) : "free (for now)"}</span></div>
    <button type="button" class="btn btn-black btn-wide" data-next ${disabled}>${nextLabel()}</button>`;
  const count = flow.items.length;
  $("#flowBar").innerHTML = `
    <span class="bar-total"><b>${count ? ugx(total()) : "UGX 0"}</b><small>${count ? `${count} service${count > 1 ? "s" : ""}${totalMins() ? ` · ${dur(totalMins())}` : ""}` : "Pick a service"}</small></span>
    <button type="button" class="btn btn-black" data-next ${disabled}>${currentStep() === "confirm" ? (flow.sending ? "Sending…" : "Confirm") : "Continue"}</button>`;
}

function servicesHTML() {
  const v = flow.v;
  const today = new Date().getDay();
  const open = v.closed.includes(today) ? "Closed today" : `Open today ${hhmm(v.hours[0] * 60)}–${hhmm(v.hours[1] * 60)}`;
  let where = "";
  if (v.visit === "both") {
    where = `<div class="seg-toggle" role="group" aria-label="Where">
      <button type="button" data-where="venue" aria-pressed="${flow.where === "venue"}">${icon("store")}At the venue</button>
      <button type="button" data-where="home" aria-pressed="${flow.where === "home"}">${icon("home")}At my place <small>+${ugx(HOME_FEE)}</small></button>
    </div>
    <p class="toggle-note" id="whereNote">${flow.where === "home" ? "They bring the tools. You provide the chair." : `${esc(v.area)}. Directions come with your confirmation SMS.`}</p>`;
  } else if (v.visit === "mobile") {
    where = `<p class="toggle-note" style="margin-top:-8px">${icon("home")} ${v.cat === "laundry" ? "Free pickup and delivery to your door." : "They come to you. Travel is included in the price."}</p>`;
  }
  return `
    <div class="venue-head">
      <p class="eyebrow">${esc(catName(v.cat))}</p>
      <h2 id="flowHeading">${esc(v.name)}</h2>
      <div class="meta">${ratingHTML(v)}<span>${esc(v.area)}</span><span>${open}</span></div>
      <p class="venue-blurb">${esc(v.blurb)}</p>
    </div>
    ${where}
    <div class="menu-tabs" role="tablist" aria-label="Menu sections">${v.menu.map((g, i) =>
      `<button type="button" class="chip" data-jump="mg-${i}" aria-pressed="${i === 0}">${esc(g[0])}</button>`).join("")}</div>
    ${v.menu.map((g, i) => `<section class="menu-group" id="mg-${i}"><h3>${esc(g[0])}</h3>${g[1].map(svcRow).join("")}</section>`).join("")}`;
}

function svcRow(sid) {
  const s = LIB[sid], on = flow.items.includes(sid);
  return `<button type="button" class="svc" data-svc="${sid}" aria-pressed="${on}">
    <span><b>${esc(s.n)}</b><span class="dur">${esc(durLabel(sid))}</span><span class="desc">${esc(s.d)}</span><span class="price">${ugx(priceOf(flow.v, sid))}</span></span>
    <span class="svc-add">${icon(on ? "check" : "plus")}</span>
  </button>`;
}

function proHTML() {
  const v = flow.v;
  const any = `<button type="button" class="pro-card pro-any" data-pro="any" aria-pressed="${flow.pro === "any"}">
      <span class="avatar">${icon("user")}</span><b>Any professional</b><small>Whoever's free first. We vetted them all.</small></button>`;
  const team = v.team.map(([n, role, r], i) => `<button type="button" class="pro-card" data-pro="${esc(n)}" aria-pressed="${flow.pro === n}">
      <span class="avatar" style="background:${v.pal[(i + 1) % 3]};color:${i % 3 === 0 ? "#ffffff" : "#111013"}">${initials(n)}</span>
      <b>${esc(n)}</b><small>${esc(role)}</small><span class="rating">${r.toFixed(1)} ${starsHTML(1)}</span></button>`).join("");
  return `<h2 id="flowHeading">Select a professional</h2>
    <p class="step-note">Everyone here is ID-checked and skills-reviewed. Pick a favourite or let us match you.</p>
    <div class="pro-grid">${any}${team}</div>`;
}

function availableSlots(date) {
  const v = flow.v, need = blockMins();
  const [open, close] = v.hours.map(h => h * 60);
  const isToday = date === ymd(new Date());
  const now = new Date(), nowMins = now.getHours() * 60 + now.getMinutes();
  const staff = flow.pro && flow.pro !== "any" ? [v.team.findIndex(t => t[0] === flow.pro)] : v.team.map((_, i) => i);
  const out = [];
  for (let t = open; t + need <= close; t += 30) {
    if (isToday && t < nowMins + 60) continue;
    if (staff.some(i => hash(`${v.id}|${date}|${i}|${t}`) > 36)) out.push(t);
  }
  return out;
}

function timeHTML() {
  const v = flow.v, today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const label = parseYmd(flow.date).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const strip = days.map(d => {
    const key = ymd(d), closed = v.closed.includes(d.getDay());
    const wd = d.toLocaleDateString("en-GB", { weekday: "short" });
    return `<button type="button" class="day" data-date="${key}" aria-pressed="${key === flow.date}" ${closed ? "disabled" : ""}
      aria-label="${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${closed ? ", closed" : ""}">
      <span class="num">${d.getDate()}</span><span class="wd">${closed ? "Closed" : wd}</span></button>`;
  }).join("");
  const tooLong = blockMins() > (v.hours[1] - v.hours[0]) * 60;
  const slots = tooLong ? [] : availableSlots(flow.date);
  let body;
  if (tooLong) {
    body = `<div class="empty"><b>That's a marathon, not an appointment.</b>
      <p>Your selection takes ${dur(totalMins())}, longer than ${esc(v.name)} is open. Remove a service and book it as a second visit.</p></div>`;
  } else if (!slots.length) {
    body = `<div class="empty"><b>Fully booked. Popular for a reason.</b><p>Nothing left on ${fmtDate(flow.date)}${flow.pro && flow.pro !== "any" ? ` with ${esc(flow.pro.split(" ")[0])}` : ""}.</p>
      <button type="button" class="btn btn-ghost" id="nextAvail">Jump to the next free day</button></div>`;
  } else {
    body = `<div class="slots">${slots.map(t => `<button type="button" class="slot" data-time="${t}" aria-pressed="${flow.time === t}">${hhmm(t)}</button>`).join("")}</div>`;
  }
  return `<h2 id="flowHeading">${v.cat === "laundry" ? "Pick a pickup time" : "Select time"}</h2>
    ${flow.pro && flow.pro !== "any" ? `<p class="step-note">Showing times for ${esc(flow.pro)}.</p>` : ""}
    <p class="month">${label}</p>
    <div class="days">${strip}</div>
    ${body}`;
}

function confirmHTML() {
  const v = flow.v, d = store.data.details || {};
  const needsAddress = flow.where === "home";
  const user = store.data.user;
  return `<h2 id="flowHeading">Review and confirm</h2>
    <form id="payForm" class="form-grid" autocomplete="on">
      <label class="field">Full name<input id="fName" name="name" required autocomplete="name" value="${esc(d.name || "")}"></label>
      <label class="field">Phone number<input id="fPhone" name="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder="0772 123 456" value="${esc(d.phone || (user ? "0" + user.phone : ""))}"></label>
      ${needsAddress ? `<label class="field full">${v.cat === "laundry" ? "Pickup address" : "Your address"}
        <input id="fAddr" name="address" required autocomplete="street-address" placeholder="Plot, street and a landmark, e.g. blue gate opposite Shell Ntinda" value="${esc(d.address || "")}"></label>` : ""}
      <label class="field full">Notes for ${esc(v.skipPro ? v.name : proName() === "Any professional" ? "your professional" : proName().split(" ")[0])} <span class="hint">(optional)</span>
        <textarea id="fNotes" name="notes" placeholder="${v.cat === "laundry" ? "Gate code, fabric care, which shirt is the lucky one…" : "Allergies, hair length, the dog's name…"}"></textarea></label>
      <fieldset class="full">
        <legend>How would you like to pay?</legend>
        <div class="pay-grid">
          <label class="pay-opt"><input type="radio" name="pay" value="mtn" checked><span class="pay-logo mtn">MTN</span><span>MTN MoMo<small>Approve with your PIN</small></span></label>
          <label class="pay-opt"><input type="radio" name="pay" value="airtel"><span class="pay-logo airtel">airtel</span><span>Airtel Money<small>Approve with your PIN</small></span></label>
          <label class="pay-opt"><input type="radio" name="pay" value="card"><span class="pay-logo card">VISA</span><span>Card<small>Secure link sent by SMS</small></span></label>
          <label class="pay-opt"><input type="radio" name="pay" value="cash"><span class="pay-logo cash">UGX</span><span>Cash<small>Pay after your service</small></span></label>
        </div>
      </fieldset>
      <label class="field full" id="momoWrap">Mobile money number
        <input id="fMomo" name="momo" type="tel" inputmode="tel" placeholder="Same as phone number above" autocomplete="off">
        <small class="hint" id="momoHint">Leave blank to use the phone number above.</small>
      </label>
      <div class="policy full"><b>Your money, held safely</b>
        <span>Mobile money payments are held by reClain and released to ${esc(v.name)} after your service. Free cancellation until 4 hours before.</span></div>
      <p class="form-err full" id="payErr" role="alert"></p>
    </form>`;
}

function momoError(form) {
  const method = form.elements.pay.value;
  if (!(method in NETWORKS)) return "";
  const raw = form.elements.momo.value.trim() || form.elements.phone.value;
  const msisdn = normalizeMsisdn(raw);
  if (!msisdn) return "Enter a valid Ugandan mobile number, like 0772 123 456.";
  const net = networkOf(msisdn);
  if (net !== method) {
    return net
      ? `${prettyMsisdn(msisdn)} is on ${NETWORKS[net].label}. Switch the payment option or enter a ${method === "mtn" ? "MTN" : "Airtel"} number.`
      : `${prettyMsisdn(msisdn)} isn't on ${NETWORKS[method].label}. Enter a ${method === "mtn" ? "MTN" : "Airtel"} number.`;
  }
  return "";
}

function wireConfirm() {
  const form = $("#payForm");
  const hint = $("#momoHint");
  const sync = () => {
    const momo = form.elements.pay.value in NETWORKS;
    $("#momoWrap").hidden = !momo;
    form.elements.momo.setCustomValidity("");
    form.elements.momo.removeAttribute("aria-invalid");
    hint.classList.remove("is-error");
    hint.textContent = "Leave blank to use the phone number above.";
    renderSummary();
  };
  form.addEventListener("change", e => { if (e.target.name === "pay") sync(); });
  form.addEventListener("input", e => {
    if (e.target.name === "momo" || e.target.name === "phone") {
      form.elements.momo.setCustomValidity("");
      form.elements.momo.removeAttribute("aria-invalid");
      hint.classList.remove("is-error");
      hint.textContent = "Leave blank to use the phone number above.";
      form.elements.phone.setCustomValidity("");
    }
  });
  form.addEventListener("submit", e => { e.preventDefault(); submitBooking(form); });
  sync();
}

function validateConfirm(form) {
  const phone = form.elements.phone;
  phone.setCustomValidity(phone.value && !normalizeMsisdn(phone.value) ? "Enter a valid Ugandan mobile number, like 0772 123 456." : "");
  const err = momoError(form);
  const momo = form.elements.momo;
  momo.setCustomValidity(err);
  const hint = $("#momoHint");
  if (err) {
    momo.setAttribute("aria-invalid", "true");
    hint.textContent = err;
    hint.classList.add("is-error");
  }
}

async function submitBooking(form) {
  if (flow.sending) return;
  validateConfirm(form);
  if (!form.reportValidity()) return;
  const f = Object.fromEntries(new FormData(form));
  const v = flow.v;
  const booking = {
    ref: "RCL-" + Date.now().toString(36).toUpperCase().slice(-6),
    venue: v.id, venueName: v.name, area: v.area,
    items: flow.items.map(id => LIB[id].n), date: flow.date, time: hhmm(flow.time), mins: totalMins(),
    pro: proName(), where: flow.where, address: f.address || "", notes: f.notes || "",
    name: f.name.trim(), phone: normalizeMsisdn(f.phone), pay: f.pay, total: total(),
    status: f.pay in NETWORKS ? "Payment prompt sent" : "Confirmed", createdAt: new Date().toISOString(),
  };
  if (f.pay in NETWORKS) {
    flow.sending = true;
    renderSummary();
    booking.msisdn = normalizeMsisdn(f.momo.trim() || f.phone);
    try {
      await requestMobileMoneyPayment({ network: f.pay, msisdn: booking.msisdn, amount: booking.total, reference: booking.ref });
    } catch {
      flow.sending = false;
      renderSummary();
      $("#payErr").textContent = "We couldn't reach the mobile money network. Check your connection and try again.";
      return;
    }
    flow.sending = false;
  }
  store.data.bookings.unshift(booking);
  store.data.details = { name: booking.name, phone: "0" + booking.phone, address: booking.address || store.data.details?.address || "" };
  store.save();
  flow.done = booking;
  renderFlow();
}

function doneHTML() {
  const b = flow.done;
  const momo = b.pay in NETWORKS;
  const rows = [
    ["Venue", `${b.venueName}, ${b.area}`],
    ["When", `${fmtDate(b.date)} at ${b.time}`],
    ["Services", b.items.join(", ")],
    ...(b.pro ? [["Professional", b.pro]] : []),
    ["Where", b.where === "home" ? b.address : "At the venue"],
    ["Payment", PAY_LABELS[b.pay]],
    ["Total", ugx(b.total)],
    ["Reference", b.ref],
  ];
  return `<div class="done">
    <span class="done-tick">${icon("check")}</span>
    <h2 id="flowHeading">You're booked.</h2>
    <p>Your future self says thank you. We've sent the details by SMS to ${prettyMsisdn(b.phone)}.</p>
    ${momo ? `<div class="momo-callout">${icon("clock")}<span>Check ${prettyMsisdn(b.msisdn)} now: approve ${ugx(b.total)} on ${NETWORKS[b.pay].label} with your PIN. We hold it until you're happy.</span></div>` : ""}
    <div class="done-card">${rows.map(([k, val]) => `<div class="row"><span>${k}</span><span>${esc(val)}</span></div>`).join("")}</div>
    <div class="done-actions">
      <button type="button" class="btn btn-black" data-close-flow>Done</button>
      <button type="button" class="btn btn-ghost" data-action="bookings">View my bookings</button>
    </div>
  </div>`;
}

// First open date with free slots, starting at `from` (inclusive).
function nextAvailableDate(from, days = 21) {
  const v = flow.v, start = parseYmd(from);
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    if (v.closed.includes(d.getDay())) continue;
    if (availableSlots(ymd(d)).length) return ymd(d);
  }
  return null;
}

function nextStep() {
  if (!stepValid() || flow.sending) return;
  if (currentStep() === "confirm") { $("#payForm").requestSubmit(); return; }
  flow.step++;
  if (currentStep() === "time") {
    if (flow.time !== null && !availableSlots(flow.date).includes(flow.time)) flow.time = null;
    const fits = blockMins() <= (flow.v.hours[1] - flow.v.hours[0]) * 60;
    if (fits && !availableSlots(flow.date).length) flow.date = nextAvailableDate(flow.date) || flow.date;
  }
  renderFlow();
}

function prevStep() {
  if (flow.step === 0) { $("#flow").close(); return; }
  flow.step--;
  renderFlow();
}

function handleFlowClick(e) {
  const t = e.target;
  const svc = t.closest("[data-svc]");
  if (svc) {
    const id = svc.dataset.svc;
    flow.items = flow.items.includes(id) ? flow.items.filter(x => x !== id) : [...flow.items, id];
    const on = flow.items.includes(id);
    svc.setAttribute("aria-pressed", on);
    svc.querySelector(".svc-add").innerHTML = icon(on ? "check" : "plus");
    flow.time = null;
    renderSummary();
    return;
  }
  const where = t.closest("[data-where]");
  if (where) {
    flow.where = where.dataset.where;
    $$("[data-where]").forEach(b => b.setAttribute("aria-pressed", b === where));
    $("#whereNote").textContent = flow.where === "home" ? "They bring the tools. You provide the chair." : `${flow.v.area}. Directions come with your confirmation SMS.`;
    renderSummary();
    return;
  }
  const jump = t.closest("[data-jump]");
  if (jump) {
    $$("[data-jump]").forEach(b => b.setAttribute("aria-pressed", b === jump));
    document.getElementById(jump.dataset.jump).scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const pro = t.closest("[data-pro]");
  if (pro) {
    flow.pro = pro.dataset.pro;
    flow.time = null;
    $$("[data-pro]").forEach(b => b.setAttribute("aria-pressed", b === pro));
    renderSummary();
    setTimeout(() => { if (currentStep() === "pro" && flow.pro === pro.dataset.pro) nextStep(); }, 220);
    return;
  }
  const day = t.closest("[data-date]");
  if (day && !day.disabled) {
    flow.date = day.dataset.date;
    flow.time = null;
    const scroller = $(".days");
    const x = scroller.scrollLeft;
    $("#flowMain").innerHTML = timeHTML();
    $(".days").scrollLeft = x;
    renderSummary();
    return;
  }
  const slot = t.closest("[data-time]");
  if (slot) {
    flow.time = Number(slot.dataset.time);
    $$("[data-time]").forEach(b => b.setAttribute("aria-pressed", b === slot));
    renderSummary();
    return;
  }
  if (t.closest("#nextAvail")) {
    const next = nextAvailableDate(ymd(addDays(parseYmd(flow.date), 1)));
    if (next) flow.date = next;
    $("#flowMain").innerHTML = timeHTML();
    renderSummary();
    return;
  }
  if (t.closest("[data-next]")) { nextStep(); return; }
  if (t.closest("[data-close-flow]")) { $("#flow").close(); }
}

// ---------- Modals ----------
function openModal(id) {
  closeMenu();
  const dlg = document.getElementById(id);
  if (!dlg.open) dlg.showModal();
}

function openLogin() {
  const form = $("#loginForm");
  form.reset();
  form.dataset.step = "phone";
  $("#loginPhoneWrap").hidden = false;
  $("#loginCodeWrap").hidden = true;
  $("#loginErr").textContent = "";
  $("#loginSub").textContent = "Enter your phone number. We'll text you a 6-digit code.";
  $("#loginSubmit").textContent = "Send code";
  openModal("loginDlg");
}

function handleLogin(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const err = $("#loginErr");
  if (form.dataset.step === "phone") {
    const m = normalizeMsisdn($("#loginPhone").value);
    if (!m) { err.textContent = "That doesn't look like a Ugandan mobile number. Try 0772 123 456."; return; }
    form.dataset.step = "code";
    form.dataset.msisdn = m;
    err.textContent = "";
    $("#loginPhoneWrap").hidden = true;
    $("#loginCodeWrap").hidden = false;
    $("#loginSub").textContent = `We sent a code to ${prettyMsisdn(m)}. It expires in 10 minutes.`;
    $("#loginSubmit").textContent = "Log in";
    $("#loginCode").focus();
    return;
  }
  if (!/^\d{6}$/.test($("#loginCode").value.trim())) { err.textContent = "Enter the 6 digits from the SMS."; return; }
  store.data.user = { phone: form.dataset.msisdn };
  store.save();
  $("#loginDlg").close();
  updateNavUser();
  toast(`Welcome back. You're logged in as ${prettyMsisdn(form.dataset.msisdn)}.`);
}

function updateNavUser() {
  const btn = $("#navLogin");
  const user = store.data.user;
  btn.textContent = user ? "My bookings" : "Log in";
  btn.dataset.action = user ? "bookings" : "login";
  $("#menuLogin").textContent = user ? "Log out" : "Log in or sign up";
  $("#menuLogin").dataset.action = user ? "logout" : "login";
}

function openBookings() {
  const list = store.data.bookings;
  $("#bookingsList").innerHTML = list.length
    ? `<div class="bk-list">${list.map(b => `<div class="bk"><b>${esc(b.items.join(", "))}</b>
        <small>${esc(b.venueName)} · ${fmtDate(b.date)} at ${esc(b.time)} · ${ugx(b.total)}</small>
        <small>Ref ${esc(b.ref)} · ${esc(PAY_LABELS[b.pay])}</small><span class="pill">${esc(b.status)}</span></div>`).join("")}</div>`
    : `<div class="empty" style="margin-top:16px"><b>No bookings yet.</b><p>Your hair is waiting patiently. Mostly.</p>
        <button type="button" class="btn btn-black" data-close data-goto="recommended">Find a venue</button></div>`;
  openModal("bookingsDlg");
}

function openJoin() {
  $("#joinForm").reset();
  $("#joinForm").hidden = false;
  $("#joinDone").hidden = true;
  openModal("joinDlg");
}

function handleJoin(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const phone = form.elements.phone;
  phone.setCustomValidity(normalizeMsisdn(phone.value) ? "" : "Enter a valid Ugandan mobile number, like 0772 123 456.");
  if (!form.reportValidity()) return;
  const name = form.elements.name.value.trim();
  $("#joinDoneText").textContent = `Thanks, ${name}. Our partner team will call ${prettyMsisdn(normalizeMsisdn(phone.value))} within 48 hours. Meanwhile, start choosing your best profile photo.`;
  form.hidden = true;
  $("#joinDone").hidden = false;
}

// ---------- Menu ----------
function closeMenu() {
  $("#menuPanel").hidden = true;
  $("#menuBtn").setAttribute("aria-expanded", "false");
}

// ---------- Events ----------
document.addEventListener("click", e => {
  const t = e.target;
  // Close the menu and suggestions when clicking elsewhere
  if (!t.closest(".menu-wrap")) closeMenu();
  if (!t.closest(".search")) $("#suggest").hidden = true;

  const action = t.closest("[data-action]");
  if (action) {
    const a = action.dataset.action;
    if (a === "login") openLogin();
    else if (a === "bookings") { if ($("#flow").open) $("#flow").close(); openBookings(); }
    else if (a === "join") openJoin();
    else if (a === "logout") { store.data.user = null; store.save(); updateNavUser(); closeMenu(); toast("Logged out. Your bookings stay on this device."); }
    return;
  }
  const closeBtn = t.closest("[data-close]");
  if (closeBtn) {
    closeBtn.closest("dialog").close();
    if (closeBtn.dataset.goto) document.getElementById(closeBtn.dataset.goto).scrollIntoView({ behavior: "smooth" });
    return;
  }
  const venue = t.closest("[data-venue]");
  if (venue) { openFlow(venue.dataset.venue); return; }

  const chip = t.closest("[data-chip]");
  if (chip) {
    const id = chip.dataset.chip;
    filters.cat = filters.cat === id ? "" : id;
    filters.q = ""; $("#q").value = "";
    runSearch({ scroll: !!filters.cat });
    return;
  }
  const treat = t.closest("[data-treatment]");
  if (treat) {
    filters.q = LIB[treat.dataset.treatment].n; filters.cat = ""; filters.area = "";
    $("#q").value = filters.q; $("#area").value = "";
    runSearch();
    return;
  }
  const occ = t.closest("[data-occasion]");
  if (occ) {
    filters.q = occ.dataset.occasion; filters.cat = ""; filters.area = "";
    $("#q").value = filters.q; $("#area").value = "";
    runSearch();
    return;
  }
  const areaLink = t.closest("[data-area-link]");
  if (areaLink) {
    filters.area = areaLink.dataset.areaLink; filters.cat = areaLink.dataset.cat; filters.q = "";
    $("#area").value = filters.area; $("#q").value = "";
    runSearch();
    return;
  }
  const footCat = t.closest(".foot-link[data-cat]");
  if (footCat) {
    filters.cat = footCat.dataset.cat; filters.q = ""; filters.area = "";
    $("#q").value = ""; $("#area").value = "";
    runSearch();
    return;
  }
  const region = t.closest("[data-region]");
  if (region) { activeRegion = region.dataset.region; renderAreas(); return; }
  if (t.closest("#clearSearch") || t.closest("#emptyClear")) { clearSearch(); return; }
  const sug = t.closest(".suggest-item");
  if (sug) { pickSuggestion(sug); }
});

$("#menuBtn").addEventListener("click", () => {
  const panel = $("#menuPanel");
  panel.hidden = !panel.hidden;
  $("#menuBtn").setAttribute("aria-expanded", String(!panel.hidden));
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeMenu(); $("#suggest").hidden = true; }
});

$("#search").addEventListener("submit", e => {
  e.preventDefault();
  $("#suggest").hidden = true;
  filters.q = $("#q").value.trim();
  filters.area = $("#area").value;
  if (filters.q) filters.cat = "";
  if (!filters.q && !filters.area && !filters.cat && !$("#when").value) {
    $("#recommended").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (!filters.q && !filters.area && !filters.cat) {
    toast("Any venue will do? Here's what's recommended.");
    $("#recommended").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  runSearch();
});
$("#q").addEventListener("focus", renderSuggest);
$("#q").addEventListener("input", renderSuggest);
$("#q").addEventListener("keydown", e => {
  const box = $("#suggest");
  const items = $$(".suggest-item", box);
  if (box.hidden || !items.length) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    suggestIndex = (suggestIndex + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items.forEach((b, i) => b.classList.toggle("active", i === suggestIndex));
  } else if (e.key === "Enter" && suggestIndex >= 0) {
    e.preventDefault();
    pickSuggestion(items[suggestIndex]);
  }
});

$$(".rail-nav").forEach(nav => {
  const rail = document.getElementById(nav.dataset.rail);
  nav.addEventListener("click", e => {
    const b = e.target.closest("[data-dir]");
    if (b) rail.scrollBy({ left: Number(b.dataset.dir) * rail.clientWidth * 0.9, behavior: "smooth" });
  });
  rail.addEventListener("scroll", () => updateRailNav(nav), { passive: true });
});
window.addEventListener("resize", () => $$(".rail-nav").forEach(updateRailNav));
window.addEventListener("scroll", () => $("#nav").classList.toggle("scrolled", window.scrollY > 8), { passive: true });

$("#flow").addEventListener("click", handleFlowClick);
$("#flowBack").addEventListener("click", prevStep);
$("#flowClose").addEventListener("click", () => $("#flow").close());
$("#loginForm").addEventListener("submit", handleLogin);
$("#joinForm").addEventListener("submit", handleJoin);
// Close a modal when its backdrop is clicked
$$("dialog.modal").forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));

// "Appointments booked today" ticker, seeded by the time of day
(function ticker() {
  const now = new Date();
  let n = 900 + Math.floor((now.getHours() * 60 + now.getMinutes()) * 2.3);
  const el = $("#bookedCount");
  const show = () => { el.textContent = n.toLocaleString("en-US"); };
  show();
  setInterval(() => { n += 1 + Math.floor(Math.random() * 2); show(); }, 4200);
})();

// ---------- Init ----------
$("#year").textContent = new Date().getFullYear();
fillAreaSelects();
renderChips();
renderMarquee();
renderRails();
renderOccasions();
renderTrending();
renderReviews();
renderAreas();
updateNavUser();
startRotator();

// ===== Business dashboard preview =====
// A click-through copy of the real app's business dashboard (reclain-app/src/app/business), for
// The Braid Republic and its owner, Aisha Namuli. It opens at #dashboard (tabs at
// #dashboard/bookings and so on), so the back button works. Everything lives in memory: reload,
// or press "Start over", and it's back to the sample data. Bookings made at The Braid Republic in
// the customer flow are copied in. Every name in here starts pv or sits inside this function, so
// it can't collide with the customer side.
(() => {
  const root = document.getElementById("pvDash");
  if (!root) return;
  const view = $("#pvBody");

  // ---------- Kampala time: UTC+3 all year, whatever the viewer's own clock says ----------
  const OFFSET = 3 * 3600000, MIN = 60000, DAY = 86400000;
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = n => String(n).padStart(2, "0");
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
  function kParts(at) {
    const d = new Date(at + OFFSET);
    return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
  const kToday = now => kParts(now).date;
  const ymdParts = date => date.split("-").map(Number);
  function kAt(date, minutes) { const [y, m, d] = ymdParts(date); return Date.UTC(y, m - 1, d, 0, minutes) - OFFSET; }
  function kAdd(date, n) { const [y, m, d] = ymdParts(date); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
  function kWeekday(date) { const [y, m, d] = ymdParts(date); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
  const kDate = date => `${WD[kWeekday(date)]} ${Number(date.slice(8, 10))} ${MON[Number(date.slice(5, 7)) - 1]}`;
  const kTime = at => hhmm(kParts(at).minutes);
  const toMins = s => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };
  const realDate = s => {
    if (!DATE_RE.test(s)) return false;
    const [y, m, d] = ymdParts(s), t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCMonth() === m - 1 && t.getUTCDate() === d && y >= 2020 && y <= 2100;
  };
  const HALF_HOURS = Array.from({ length: 48 }, (_, i) => hhmm(i * 30));
  const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
  const firstName = name => String(name || "").trim().split(/\s+/)[0] || "";
  // "UGX 10,000", "10 000" or "10000" -> 10000; null when it isn't a whole number of shillings.
  const parseUgx = raw => { const c = String(raw).replace(/ugx/i, "").replace(/[\s,]/g, ""); return /^\d{1,9}$/.test(c) ? Number(c) : null; };
  const palStyle = p => `--c1:${p[0]};--c2:${p[1]};--c3:${p[2]}`;

  // ---------- Fixed choices (copied from reclain-app's dashboard options) ----------
  const VENUE = "braid-republic";
  const OWNER = "Aisha Namuli";
  const PALETTES = [
    { id: "jacaranda", name: "Jacaranda", colors: ["#2b1a4a", "#7b4fd6", "#f6b9a3"] },
    { id: "night-gold", name: "Night gold", colors: ["#141416", "#3c3b48", "#e0b252"] },
    { id: "rosewood", name: "Rosewood", colors: ["#3b1d2a", "#c0587a", "#ffd3c2"] },
    { id: "coffee", name: "Coffee", colors: ["#2a1d14", "#8a5a3b", "#f0c27a"] },
    { id: "forest", name: "Forest", colors: ["#0f3b33", "#2f8f78", "#cde9c9"] },
    { id: "lake", name: "Lake blue", colors: ["#0d2c4d", "#2f7fd1", "#bfe3ff"] },
    { id: "hibiscus", name: "Hibiscus", colors: ["#4a1030", "#e0457b", "#ffd0dc"] },
    { id: "mango", name: "Mango", colors: ["#3a2408", "#c8741c", "#ffd88a"] },
    { id: "slate", name: "Slate", colors: ["#151a22", "#34465c", "#9fb4cc"] },
    { id: "dusk", name: "Dusk", colors: ["#1f1a3a", "#4a3fa0", "#ff9e7a"] },
  ];
  const DURATIONS = [0, 15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 480, 540, 600, 720];
  const VISIT_MODES = [
    { value: "salon", title: "Customers come to you", body: "They book a time and turn up at your salon, shop or studio." },
    { value: "both", title: "Both", body: "Customers choose: they come to you, or you go to them and charge a home-visit fee." },
    { value: "mobile", title: "You go to them", body: "Every booking happens at the customer's place. Good for cleaning, laundry pickups, repairs and security." },
  ];
  const WEEK = [[1, "Mon", "Monday"], [2, "Tue", "Tuesday"], [3, "Wed", "Wednesday"], [4, "Thu", "Thursday"], [5, "Fri", "Friday"], [6, "Sat", "Saturday"], [0, "Sun", "Sunday"]];
  const METHOD = { mtn: "MTN MoMo", airtel: "Airtel Money", card: "Card", cash: "Cash" };
  const STATUS = {
    pending_payment: { label: "Awaiting payment", tone: "warn" },
    confirmed: { label: "Confirmed", tone: "ok" },
    completed: { label: "Completed", tone: "info" },
    cancelled: { label: "Cancelled", tone: "mute" },
    no_show: { label: "No-show", tone: "err" },
  };
  const FILTERS = [
    { key: "all", label: "All", statuses: [] },
    { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
    { key: "pending", label: "Awaiting payment", statuses: ["pending_payment"] },
    { key: "completed", label: "Completed", statuses: ["completed"] },
    { key: "no_show", label: "No-shows", statuses: ["no_show"] },
    { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
  ];
  const TABS = [
    { id: "overview", label: "Overview", ic: "chart", hash: "#dashboard" },
    { id: "bookings", label: "Bookings", ic: "cal", hash: "#dashboard/bookings" },
    { id: "services", label: "Services", ic: "list", hash: "#dashboard/services" },
    { id: "team", label: "Team", ic: "users", hash: "#dashboard/team" },
    { id: "settings", label: "Settings", ic: "settings", hash: "#dashboard/settings" },
  ];
  const LAST_ONE = "Bookings need someone to assign them to, so keep at least one person taking bookings. Add someone else first.";

  // ---------- Sample data: The Braid Republic from reclain-app's seed-data.json ----------
  const SEED_SERVICES = [
    ["Braids", "Knotless braids (mid-back)", "Medium parts. Braiding hair included in the colour of your choice.", 330, 120000],
    ["Braids", "Boho knotless braids", "Knotless with curly human-hair pieces left out. Clear your afternoon.", 390, 160000],
    ["Braids", "Passion twists", "Light, bouncy and unbothered by rainy season.", 240, 100000],
    ["Braids", "Cornrows", "Straight-back or freestyle. Edges laid, not fried.", 90, 40000],
    ["Locs", "Locs retwist & style", "Palm roll, retwist and a style of your choice.", 150, 60000],
    ["Locs", "Starter locs", "Comb coils or two-strand twists to start the journey.", 240, 150000],
    ["Care", "Wash, treat & blow-dry", "Deep-conditioning treatment and a bouncy finish.", 75, 45000],
  ];
  const SEED_STAFF = [["Aisha Nakato", "Senior braider"], ["Nana Achan", "Braider"], ["Joy Kemigisha", "Locs specialist"]];
  // d: days from today (Kampala). svc: indexes into SEED_SERVICES. staff: index into SEED_STAFF.
  const SEED_BOOKINGS = [
    { d: -4, at: "10:00", svc: [0], who: "Sarah Kansiime", tel: "772418903", pay: "mtn", staff: 0, status: "completed", paid: "paid" },
    { d: -2, at: "14:00", svc: [3], who: "Peace Atuhaire", tel: "701556218", pay: "cash", staff: 1, status: "completed", paid: "paid" },
    { d: -1, at: "09:00", svc: [4], who: "Ivan Mugisha", tel: "783220145", pay: "cash", staff: 2, paid: "unpaid",
      notes: "Haven't retwisted since March. Please be patient with my roots." },
    { d: -1, at: "15:00", svc: [6], who: "Juliet Nakimuli", tel: "756901337", pay: "cash", staff: 1, status: "no_show", paid: "unpaid" },
    { d: 0, at: "08:30", svc: [0], who: "Doreen Akello", tel: "774300982", pay: "mtn", staff: 0, paid: "paid", doneIfOver: true,
      notes: "Colour 1B please. I'm bringing my own snacks this time." },
    { d: 0, at: "10:00", svc: [3, 6], who: "Shamim Nakiwala", tel: "700812456", pay: "cash", staff: 1, paid: "unpaid",
      where: "home", address: "Kiwatule, Plot 14 Kiwatule Road, green gate after the petrol station" },
    { d: 0, at: "13:00", svc: [4], who: "Moses Ssekitoleko", tel: "752114770", pay: "airtel", staff: 2, paid: "paid",
      notes: "Might be 10 minutes late. My boda is stuck at the Ntinda lights." },
    { d: 0, at: "16:00", svc: [3], who: "Hadijah Namutebi", tel: "789445120", pay: "mtn", staff: 1, status: "cancelled", paid: "refunded" },
    { d: 0, at: "17:30", svc: [6], who: "Christine Achieng", tel: "771093388", pay: "card", staff: 0, paid: "paid" },
    { d: 1, at: "09:00", svc: [1], who: "Winnie Kyomuhendo", tel: "778650021", pay: "mtn", staff: 0, paid: "paid",
      notes: "Kwanjula on Saturday! Curls left a little longer at the front, please." },
    { d: 1, at: "11:00", svc: [2], who: "Rebecca Auma", tel: "702338914", pay: "airtel", staff: 1, status: "pending_payment", paid: "pending" },
    { d: 2, at: "10:00", svc: [5], who: "Agnes Tumusiime", tel: "785009163", pay: "cash", staff: 2, paid: "unpaid" },
    { d: 3, at: "08:00", svc: [0], who: "Martha Nabukenya", tel: "753772640", pay: "airtel", staff: 0, paid: "paid",
      where: "home", address: "Naguru, Kigoowa Road, flat 3B above the pharmacy" },
    { d: 5, at: "14:00", svc: [6, 3], who: "Faith Ainembabazi", tel: "776512309", pay: "cash", staff: 1, paid: "unpaid" },
  ];
  const REFS = ["RCL-8KQ2TA", "RCL-3MXW7P", "RCL-Q9D4LE", "RCL-T2H8VN", "RCL-6ZB1RC", "RCL-J5N7KD", "RCL-W4P9GS",
    "RCL-C8F3YM", "RCL-L1R6XU", "RCL-H7T2QB", "RCL-N3V8JA", "RCL-E9K5WD", "RCL-U6G4ZP", "RCL-B2S7MH"];

  // The customer side's own copy of the venue, kept so "Start over" can put it back exactly.
  const PUBLIC_KEYS = ["name", "blurb", "word", "pal", "area", "cat", "visit", "hours", "closed", "skipPro"];
  const ORIGINAL = (() => { const v = venueById(VENUE); return v ? JSON.parse(JSON.stringify(PUBLIC_KEYS.reduce((o, k) => ({ ...o, [k]: v[k] }), {}))) : null; })();

  let state, seq = 0;
  const newId = p => `${p}${++seq}`;
  const ui = { open: false, tab: "overview", date: null, filter: "all", confirm: null, editing: null, homeY: 0, opener: null, title: document.title };

  function fresh() {
    seq = 0;
    const now = Date.now(), today = kToday(now);
    const services = SEED_SERVICES.map(([groupName, name, description, durationMin, price], i) =>
      ({ id: newId("svc"), groupName, name, description, durationMin, durationLabel: "", price, latestStart: "", active: true, sort: i }));
    const staff = SEED_STAFF.map(([name, role], i) => ({ id: newId("st"), name, role, active: true, sort: i }));
    const bookings = SEED_BOOKINGS.map((s, i) => {
      const items = s.svc.map(k => ({ name: services[k].name, durationMin: services[k].durationMin, price: services[k].price }));
      const startsAt = kAt(kAdd(today, s.d), toMins(s.at));
      const endsAt = startsAt + items.reduce((t, x) => t + x.durationMin, 0) * MIN;
      const homeFee = s.where === "home" ? HOME_FEE : 0;
      const member = staff[s.staff];
      return {
        id: newId("bk"), ref: REFS[i], customerName: s.who, customerPhone: s.tel, items, startsAt, endsAt,
        location: s.where || "venue", address: s.address || "", staffId: member.id, staffName: member.name, notes: s.notes || "",
        homeFee, total: items.reduce((t, x) => t + x.price, 0) + homeFee, paymentMethod: s.pay, paymentStatus: s.paid,
        status: s.doneIfOver && endsAt <= now ? "completed" : s.status || "confirmed",
        expiresAt: s.status === "pending_payment" ? now + 14 * MIN : null,
      };
    });
    state = {
      biz: {
        name: "The Braid Republic", categoryId: "braids", area: "Ntinda",
        // Same words as the customer page, so the two agree until someone saves a change.
        blurb: ORIGINAL ? ORIGINAL.blurb : "Neat parts, gentle hands and a playlist good enough for a six-hour boho. Snacks encouraged.",
        address: "Plot 22, Ntinda Road, next to the taxi stage", phone: "752987654", visitMode: "both", homeVisitFee: HOME_FEE,
        opensAt: "08:00", closesAt: "20:00", closedDays: [], acceptsCash: true, skipProfessional: false,
        coverWord: "braids", palette: PALETTES[0].colors.slice(),
      },
      services, staff, bookings, imported: new Set(),
    };
  }

  // Bookings made at The Braid Republic on the customer side (kept in this browser by the
  // booking flow) are copied in once each. Returns the ones that are new.
  function syncCustomer() {
    const added = [];
    const list = Array.isArray(store.data.bookings) ? store.data.bookings : [];
    for (const c of list) {
      if (!c || c.venue !== VENUE || typeof c.ref !== "string" || state.imported.has(c.ref)) continue;
      state.imported.add(c.ref);
      if (!realDate(c.date) || !TIME_RE.test(c.time)) continue;
      const names = Array.isArray(c.items) ? c.items.map(String) : [];
      const items = names.map(n => {
        const s = state.services.find(x => x.name === n) || Object.values(LIB).find(x => x.n === n);
        return { name: n, durationMin: s ? (s.durationMin ?? s.m) : 0, price: s ? (s.price ?? s.p) : 0 };
      });
      const mins = Number(c.mins) || items.reduce((t, x) => t + x.durationMin, 0);
      const startsAt = kAt(c.date, toMins(c.time));
      const created = Date.parse(c.createdAt) || Date.now();
      const pay = METHOD[c.pay] ? c.pay : "cash";
      const member = state.staff.find(s => s.name === c.pro) || state.staff.find(s => s.active);
      const prepaid = pay !== "cash";
      const b = {
        id: newId("bk"), ref: c.ref, customerName: String(c.name || "").slice(0, 80), customerPhone: String(c.phone || ""),
        items, startsAt, endsAt: startsAt + Math.max(mins, 30) * MIN, location: c.where === "home" ? "home" : "venue",
        address: String(c.address || ""), staffId: member ? member.id : null, staffName: member ? member.name : "", notes: String(c.notes || ""),
        homeFee: c.where === "home" ? HOME_FEE : 0, total: Number(c.total) || 0, paymentMethod: pay,
        // The flow sends a payment prompt; nobody approves it in a preview, so it waits like a real one.
        paymentStatus: prepaid ? "pending" : "unpaid", status: prepaid ? "pending_payment" : "confirmed",
        expiresAt: prepaid ? created + 15 * MIN : null,
      };
      state.bookings.push(b);
      added.push(b);
    }
    return added;
  }

  // Saved settings show up on the customer side too: card, venue page and booking flow.
  // With `restore`, the venue goes back to exactly how the customer side had it.
  function syncPublic(restore = false) {
    const v = venueById(VENUE), b = state.biz;
    if (!v) return;
    if (restore) { if (ORIGINAL) { const copy = JSON.parse(JSON.stringify(ORIGINAL)); for (const k of PUBLIC_KEYS) v[k] = copy[k]; } }
    else {
      Object.assign(v, {
        name: b.name, blurb: b.blurb, word: b.coverWord, pal: b.palette.slice(), area: b.area, cat: b.categoryId, visit: b.visitMode,
        hours: [toMins(b.opensAt) / 60, toMins(b.closesAt) / 60], closed: b.closedDays.slice(), skipPro: b.skipProfessional || undefined,
      });
    }
    try {
      renderRails(); renderAreas(); renderReviews();
      if (!$("#results").hidden) runSearch({ scroll: false });
    } catch (err) { console.error(err); }
  }

  // ---------- Booking rules (from reclain-app's dashboard logic) ----------
  const holdExpired = (b, now) => b.status === "pending_payment" && !!b.expiresAt && b.expiresAt <= now;
  const isLive = (b, now) => b.status === "confirmed" || (b.status === "pending_payment" && !holdExpired(b, now));
  const isTaking = b => b.status !== "cancelled" && b.paymentStatus !== "refunded" && (b.status === "completed" || b.paymentStatus === "paid");
  const takings = list => list.reduce((sum, b) => (isTaking(b) ? sum + b.total : sum), 0);
  const byStart = (a, b) => a.startsAt - b.startsAt;
  const onDay = date => state.bookings.filter(b => b.startsAt >= kAt(date, 0) && b.startsAt < kAt(kAdd(date, 1), 0)).sort(byStart);
  const staffOf = b => state.staff.find(s => s.id === b.staffId)?.name || b.staffName || "";

  function refusal(op, b, now) {
    const started = b.startsAt <= now, ended = b.endsAt <= now;
    if (op === "complete" || op === "no_show") {
      if (b.status !== "confirmed") return b.status === "pending_payment" ? "This booking is still waiting for its payment, so it can't be closed yet." : "This booking is already closed.";
      if (!started) return op === "complete" ? "You can mark it completed once it has started." : "You can mark a no-show once the start time has passed.";
      return null;
    }
    if (op === "cancel") {
      if (!isLive(b, now)) return "This booking can no longer be cancelled.";
      if (ended) return "This booking has already finished. Mark it completed or a no-show instead.";
      return null;
    }
    if (op === "cash_paid") {
      if (b.paymentMethod !== "cash") return "Only cash bookings are marked paid by hand.";
      if (b.paymentStatus === "paid") return "This booking is already marked as paid.";
      if (b.status !== "confirmed" && b.status !== "completed") return "Only a confirmed or completed booking can be marked paid.";
      return null;
    }
    return "Something about that request looked off.";
  }
  const allowed = (b, now) => ({ complete: !refusal("complete", b, now), noShow: !refusal("no_show", b, now), cancel: !refusal("cancel", b, now), cashPaid: !refusal("cash_paid", b, now) });
  const statusPill = (b, now) => (holdExpired(b, now) ? { label: "Hold expired", tone: "mute" } : STATUS[b.status]);
  function paymentPill(b) {
    const method = METHOD[b.paymentMethod];
    if (b.paymentStatus === "refunded") return { label: "Refunded", tone: "info" };
    if (b.paymentStatus === "paid") {
      if (b.status === "cancelled") return { label: "Paid · refund due", tone: "err" };
      return { label: b.paymentMethod === "cash" ? "Paid in cash" : `Paid · ${method}`, tone: "ok" };
    }
    if (b.status === "cancelled" || b.status === "no_show") return { label: "Not charged", tone: "mute" };
    if (b.paymentMethod === "cash") return { label: "Cash on the day", tone: "mute" };
    if (b.paymentStatus === "failed") return { label: `${method} failed`, tone: "err" };
    if (b.paymentStatus === "pending") return { label: `Waiting for ${method}`, tone: "warn" };
    return { label: `Not paid yet · ${method}`, tone: "warn" };
  }
  const pill = p => `<span class="pv-pill pv-pill-${p.tone}">${esc(p.label)}</span>`;
  // True when the change would leave nobody on the team taking bookings.
  function leavesNobodyActive(change) {
    const staff = state.staff;
    if (!staff.some(s => s.active)) return false;
    return !staff.filter(s => !(change.remove && s.id === change.id))
      .map(s => (s.id === change.id && change.active !== undefined ? { ...s, active: change.active } : s))
      .some(s => s.active);
  }
  function greeting(now) {
    const h = Math.floor(kParts(now).minutes / 60);
    return h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
  }

  // ---------- Small pieces of markup ----------
  function phoneHTML(msisdn) {
    if (!/^\d{9}$/.test(msisdn)) return msisdn ? `<span class="dash-bk-line">${esc(msisdn)}</span>` : "";
    return `<a class="dash-tel" href="tel:+256${msisdn}">${icon("phone")}<span><span class="sr-only">Call </span>${prettyMsisdn(msisdn)}</span></a>`;
  }
  function titleHTML(tab, now) {
    if (tab === "overview") return `<h1 class="pv-title dash-title" tabindex="-1">${greeting(now)}, <span class="pv-em">${esc(firstName(OWNER))}</span>.</h1>`;
    const [a, em, z] = { bookings: ["Bookings, ", "sorted", "."], services: ["Your ", "menu", ""], team: ["Your ", "team", ""], settings: ["Your ", "shopfront", ""] }[tab];
    return `<h1 class="pv-title dash-title" tabindex="-1">${a}<span class="pv-em">${em}</span>${z}</h1>`;
  }
  const empty = (title, body) => `<div class="empty"><b>${title}</b><p>${body}</p></div>`;
  const methodWord = m => (m === "card" ? "card" : METHOD[m]);

  // The buttons on a booking, or the question that replaces them while confirming.
  function actionsHTML(b, now, who, when, extra = "") {
    const c = ui.confirm;
    if (c && c.kind === "bk" && c.id === b.id) {
      const paid = b.paymentStatus === "paid";
      const q = c.op === "cancel"
        ? `<b>Cancel ${esc(who)}'s booking at ${esc(when)}?</b> We'll text ${esc(who)} to let them know${paid ? ` and refund the ${esc(methodWord(b.paymentMethod))} payment` : ""}.`
        : `<b>Mark ${esc(who)} as a no-show?</b> This closes the booking for good.`;
      return `<div class="dash-actions"><div class="dash-confirm" role="group" aria-labelledby="pv-q-${b.id}">
        <p id="pv-q-${b.id}" tabindex="-1">${q}</p>
        <div class="dash-confirm-btns">
          <button type="button" class="btn pv-btn-danger pv-btn-sm" data-pv-yes="${c.op}" data-pv-bk="${b.id}">${c.op === "cancel" ? "Yes, cancel it" : "Yes, mark no-show"}</button>
          <button type="button" class="btn btn-ghost pv-btn-sm" data-pv-keep>Keep it</button>
        </div></div></div>`;
    }
    const a = allowed(b, now);
    if (!a.complete && !a.cashPaid && !a.noShow && !a.cancel && !extra) return "";
    const whose = `<span class="sr-only">: ${esc(who)}, ${esc(when)}</span>`;
    const btn = (cls, attr, label) => `<button type="button" class="btn ${cls} pv-btn-sm" ${attr} data-pv-bk="${b.id}">${label}${whose}</button>`;
    return `<div class="dash-actions"><div class="dash-actions-btns">
      ${a.complete ? btn("btn-black", 'data-pv-op="complete"', "Mark completed") : ""}
      ${a.cashPaid ? btn("btn-ghost", 'data-pv-op="cash_paid"', "Mark cash paid") : ""}
      ${a.noShow ? btn("btn-ghost", 'data-pv-ask="no_show"', "Mark no-show") : ""}
      ${a.cancel ? btn("pv-btn-danger", 'data-pv-ask="cancel"', "Cancel booking") : ""}
      ${extra}
    </div></div>`;
  }

  // One booking as the venue sees it: when, who (tap to call), what, where, the money, the buttons.
  function bookingCard(b, now, showDate = false) {
    const start = kTime(b.startsAt), end = kTime(b.endsAt), date = kDate(kParts(b.startsAt).date);
    const mins = b.items.reduce((s, i) => s + i.durationMin, 0);
    const closed = b.status === "cancelled" || b.status === "no_show" || holdExpired(b, now);
    const name = b.customerName.trim(), staff = staffOf(b);
    return `<article class="dash-bk${closed ? " is-closed" : ""}" id="pv-bk-${b.id}" aria-labelledby="pv-bkh-${b.id}">
      <div class="dash-bk-when" aria-hidden="true">
        ${showDate ? `<span class="dash-bk-date">${date}</span>` : ""}
        <b class="display">${start}</b><span class="pv-muted">${end}</span>${mins ? `<small class="pv-muted">${dur(mins)}</small>` : ""}
      </div>
      <div class="dash-bk-who">
        <h3 id="pv-bkh-${b.id}" tabindex="-1"><span class="sr-only">${showDate ? `${date}, ` : ""}${start} to ${end}${mins ? ` (${dur(mins)})` : ""}: </span>${esc(name || "Customer")}</h3>
        ${phoneHTML(b.customerPhone)}
        <p class="dash-bk-line">${icon(b.location === "home" ? "home" : "store")}<span>${b.location === "home" ? `Home visit: ${esc(b.address || "address not given")}` : "At the venue"}</span></p>
        ${staff ? `<p class="dash-bk-line">${icon("user")}<span>With ${esc(staff)}</span></p>` : ""}
      </div>
      <div class="dash-bk-what">
        <ul class="dash-bk-items">${b.items.map(i => `<li>${esc(i.name)}</li>`).join("")}</ul>
        ${b.notes.trim() ? `<p class="dash-bk-notes"><span class="sr-only">Notes from the customer: </span>${esc(b.notes.trim())}</p>` : ""}
      </div>
      <div class="dash-bk-money">
        <b>${ugx(b.total)}</b>
        ${b.homeFee ? `<small class="pv-muted">Includes ${ugx(b.homeFee)} home-visit fee</small>` : ""}
        <span class="dash-pills">${pill(statusPill(b, now))}${pill(paymentPill(b))}</span>
        <small class="pv-muted dash-bk-ref">Ref ${esc(b.ref)}</small>
      </div>
      ${actionsHTML(b, now, firstName(name) || "the customer", showDate ? `${date}, ${start}` : start)}
    </article>`;
  }

  // A picture of the day from opening to closing time. Decorative: the list says it in words.
  function stripHTML(list, date, now) {
    const open = toMins(state.biz.opensAt), close = toMins(state.biz.closesAt), span = close - open;
    if (span <= 0) return "";
    const r1 = n => Math.round(n * 10) / 10, clamp = n => Math.min(span, Math.max(0, n)), day0 = kAt(date, 0);
    const blocks = list.filter(b => b.status !== "cancelled" && !holdExpired(b, now)).map(b => {
      const s = clamp((b.startsAt - day0) / MIN - open), e = clamp((b.endsAt - day0) / MIN - open);
      return { left: r1((s / span) * 100), width: r1(Math.max(((e - s) / span) * 100, 1.5)), past: b.endsAt <= now };
    }).filter(b => b.left < 100);
    const step = span > 600 ? 120 : 60, ticks = [];
    for (let t = Math.ceil(open / 60) * 60; t <= close; t += step) ticks.push(`<span style="left:${r1(((t - open) / span) * 100)}%">${pad(t / 60)}</span>`);
    const p = kParts(now);
    const marker = p.date === date && p.minutes >= open && p.minutes <= close ? r1(((p.minutes - open) / span) * 100) : null;
    return `<div class="dash-strip" aria-hidden="true"><div class="dash-strip-bar">
      ${blocks.map(b => `<span class="dash-strip-block${b.past ? " is-past" : ""}" style="left:${b.left}%;width:${b.width}%"></span>`).join("")}
      ${marker !== null ? `<span class="dash-strip-now" style="left:${marker}%"></span>` : ""}
    </div><div class="dash-strip-ticks">${ticks.join("")}</div></div>`;
  }

  // ---------- Overview ----------
  function viewOverview(now) {
    const b = state.biz, today = kToday(now), tomorrow = kAdd(today, 1);
    const todays = onDay(today);
    const timeline = todays.filter(x => x.status !== "cancelled" && !holdExpired(x, now));
    const dropped = todays.length - timeline.length;
    const weekStart = kAdd(today, -((kWeekday(today) + 6) % 7)), weekEnd = kAdd(weekStart, 6);
    const thisWeek = state.bookings.filter(x => x.startsAt >= kAt(weekStart, 0) && x.startsAt < kAt(kAdd(weekStart, 7), 0));
    const next7 = state.bookings.filter(x => isLive(x, now) && x.startsAt >= now && x.startsAt < now + 7 * DAY).length;
    const comingUp = state.bookings.filter(x => x.startsAt >= kAt(tomorrow, 0) && x.startsAt < kAt(kAdd(today, 61), 0) && isLive(x, now)).sort(byStart).slice(0, 5);
    const earlier = state.bookings.filter(x => x.status === "confirmed" && x.startsAt >= kAt(kAdd(today, -14), 0) && x.startsAt < kAt(today, 0)).sort(byStart);
    const stillOpen = earlier.slice(0, 5);
    const nowAt = timeline.findIndex(x => x.startsAt > now);
    const wd = kWeekday(today), closedToday = b.closedDays.includes(wd);
    const nowLine = `<li class="dash-now" aria-hidden="true"><span>Now · ${kTime(now)}</span></li>`;

    const tl = timeline.length
      ? `<ol class="dash-tl">${timeline.map((x, i) => `${i === nowAt ? nowLine : ""}<li>${bookingCard(x, now)}</li>`).join("")}${nowAt === -1 ? nowLine : ""}</ol>`
      : empty(closedToday ? "A day off. Enjoy it." : "Nothing booked today.", "A quiet day is a good day to polish your menu or add a new service.");

    return `${titleHTML("overview", now)}
      <section class="dash-stats" aria-label="This week in numbers">
        <div class="dash-stat"><span class="dash-stat-label">Today</span><b class="display">${timeline.length}</b><span class="pv-muted">${timeline.length === 1 ? "booking" : "bookings"}</span></div>
        <div class="dash-stat"><span class="dash-stat-label">Next 7 days</span><b class="display">${next7}</b><span class="pv-muted">still to come</span></div>
        <div class="dash-stat dash-stat-money"><span class="dash-stat-label">Takings this week</span><b class="display">${ugx(takings(thisWeek))}</b>
          <span class="pv-muted">Completed or paid, ${kDate(weekStart)} to ${kDate(weekEnd)}</span></div>
      </section>

      <section class="dash-section" aria-labelledby="pv-today-h">
        <div class="dash-section-head">
          <div><h2 id="pv-today-h">Today, ${kDate(today)}</h2>
            <p class="pv-muted">${closedToday ? `You're closed on ${WD_LONG[wd]}s.` : `Open ${esc(b.opensAt)} to ${esc(b.closesAt)}, Kampala time.`}${dropped ? ` ${plural(dropped, "booking")} cancelled or unpaid.` : ""}</p></div>
          <a class="btn btn-ghost pv-btn-sm" href="#dashboard/bookings" data-pv-goto="${today}">Open the day view</a>
        </div>
        ${closedToday ? "" : stripHTML(timeline, today, now)}
        ${tl}
      </section>

      ${stillOpen.length ? `<section class="dash-section" aria-labelledby="pv-open-h">
        <div class="dash-section-head"><div><h2 id="pv-open-h">Still open from earlier</h2>
          <p class="pv-muted">Mark these completed or no-shows so your takings add up.</p></div></div>
        <ul class="dash-list">${stillOpen.map(x => `<li>${bookingCard(x, now, true)}</li>`).join("")}</ul>
        ${earlier.length > stillOpen.length ? `<p class="pv-muted dash-more">And ${plural(earlier.length - stillOpen.length, "more")}. Find them by date in Bookings.</p>` : ""}
      </section>` : ""}

      <section class="dash-section" aria-labelledby="pv-next-h">
        <div class="dash-section-head"><h2 id="pv-next-h">Coming up</h2>
          <a class="link-btn" href="#dashboard/bookings" data-pv-goto="${tomorrow}">See tomorrow</a></div>
        ${comingUp.length ? upcomingTable(comingUp, now) : empty("Nothing booked after today yet.", "New bookings land here the moment they're made.")}
      </section>`;
  }

  // The next few bookings as a table with quick actions. It turns into cards on smaller screens.
  function upcomingTable(list, now) {
    const rows = list.map(b => {
      const date = kParts(b.startsAt).date, start = kTime(b.startsAt);
      const name = b.customerName.trim(), who = firstName(name) || "the customer", staff = staffOf(b);
      const when = `${kDate(date)}, ${start}`;
      return `<tr id="pv-bk-${b.id}">
        <td data-label="When" class="pv-table-when"><div><a class="pv-day-link" href="#dashboard/bookings" data-pv-goto="${date}"><span class="sr-only">Open the day view for </span>${kDate(date)}</a><span>${start} to ${kTime(b.endsAt)}</span></div></td>
        <th scope="row" data-label="Customer"><span class="pv-table-name" id="pv-bkh-${b.id}" tabindex="-1">${esc(name || "Customer")}</span>${phoneHTML(b.customerPhone)}${b.location === "home" ? `<span class="pv-table-sub">${icon("home")}Home visit</span>` : ""}</th>
        <td data-label="Services"><div>${b.items.map(i => esc(i.name)).join(", ")}${staff ? `<span class="pv-table-sub">With ${esc(staff)}</span>` : ""}</div></td>
        <td data-label="Total" class="pv-table-num"><div>${ugx(b.total)}</div></td>
        <td data-label="Status"><div class="dash-pills">${pill(statusPill(b, now))}${pill(paymentPill(b))}</div></td>
        <td class="pv-table-acts">${actionsHTML(b, now, who, when)}</td>
      </tr>`;
    }).join("");
    return `<div class="pv-table-wrap"><table class="pv-table">
      <caption class="sr-only">The next ${plural(list.length, "booking")} after today</caption>
      <thead><tr><th scope="col">When</th><th scope="col">Customer</th><th scope="col">Services</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  // ---------- Bookings: the day view ----------
  function viewBookings(now) {
    const today = kToday(now), date = ui.date || today;
    const all = onDay(date);
    const f = FILTERS.find(x => x.key === ui.filter) || FILTERS[0];
    const pick = x => (x.statuses.length ? all.filter(b => x.statuses.includes(b.status)) : all);
    const list = pick(f);
    const wd = kWeekday(date), closed = state.biz.closedDays.includes(wd);
    const rel = date === today ? "Today" : date === kAdd(today, 1) ? "Tomorrow" : date === kAdd(today, -1) ? "Yesterday" : "";
    const earned = takings(list);
    let emptyBody = "Bookings appear here the moment a customer makes one.";
    if (f.key !== "all") emptyBody = `<button type="button" class="link-btn" data-pv-filter="all">Show every booking that day</button>`;
    else if (closed) emptyBody = "You're closed that day, so customers can't book it.";
    else if (date < today) emptyBody = "Nothing to tidy up here.";

    return `${titleHTML("bookings")}
      <div class="dash-day">
        <div class="dash-day-nav">
          <button type="button" class="icon-btn" data-pv-day="-1" aria-label="Previous day, ${kDate(kAdd(date, -1))}">${icon("left")}</button>
          <h2 class="dash-day-label" id="pvDayLabel" tabindex="-1">${rel ? `<span class="dash-day-rel">${rel}</span>` : ""}${kDate(date)}</h2>
          <button type="button" class="icon-btn" data-pv-day="1" aria-label="Next day, ${kDate(kAdd(date, 1))}">${icon("right")}</button>
        </div>
        <form class="dash-day-form" data-pv-form="day" novalidate>
          <div class="field"><label for="pvDate">Go to a date</label><input type="date" id="pvDate" name="date" value="${date}" required></div>
          <button type="submit" class="btn btn-black pv-btn-sm">Show day</button>
          ${date !== today ? `<button type="button" class="link-btn" data-pv-today>Back to today</button>` : ""}
        </form>
      </div>
      <div role="group" aria-label="Filter by status">
        <ul class="chips dash-tabs dash-filter">${FILTERS.map(x => {
          const n = pick(x).length;
          return `<li><button type="button" class="chip" data-pv-filter="${x.key}" aria-pressed="${x.key === f.key}">${x.label}<span class="dash-count">${n}<span class="sr-only"> ${n === 1 ? "booking" : "bookings"}</span></span></button></li>`;
        }).join("")}</ul>
      </div>
      <p class="pv-muted dash-summary">${plural(list.length, "booking")}${f.key !== "all" ? ` (${f.label.toLowerCase()})` : ""}${earned ? ` · ${ugx(earned)} completed or paid` : ""}${closed ? ` · You're closed on ${WD_LONG[wd]}s` : ""}</p>
      ${list.length
        ? `<ul class="dash-list">${list.map(b => `<li>${bookingCard(b, now)}</li>`).join("")}</ul>`
        : `<div class="empty"><b>${f.key === "all" ? `Nothing booked for ${kDate(date)}.` : `No ${f.label.toLowerCase()} bookings on ${kDate(date)}.`}</b><p>${emptyBody}</p></div>`}`;
  }

  // ---------- Services ----------
  function serviceGroups() {
    const groups = [];
    for (const s of [...state.services].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))) {
      const name = s.groupName.trim() || "Services";
      let g = groups.find(x => x.name === name);
      if (!g) groups.push((g = { name, services: [] }));
      g.services.push(s);
    }
    return groups;
  }
  // A labelled control with an optional hint and a slot for its error message.
  function field(id, name, label, control, { hint = "", optional = false, full = false, cls = "" } = {}) {
    return `<div class="field${full ? " full" : ""}${cls ? ` ${cls}` : ""}">
      <label for="${id}">${label}${optional ? ' <span class="hint">(optional)</span>' : ""}</label>
      ${control}
      ${hint ? `<small class="hint" id="${id}-hint">${hint}</small>` : ""}
      <small class="hint is-error" id="${id}-err" data-pv-err="${name}" hidden></small>
    </div>`;
  }
  const desc = (id, hint) => (hint ? ` aria-describedby="${id}-hint"` : "");
  const sel = (on) => (on ? " selected" : "");

  function viewServices() {
    const groups = serviceGroups(), n = state.services.length, on = state.services.filter(s => s.active).length;
    const ed = ui.editing && ui.editing.kind === "svc" ? ui.editing.id : null;
    return `${titleHTML("services")}
      <p class="dash-lede">What customers can book, grouped the way they see it on your page. Prices are what they pay; the time decides how long the slot is held.</p>
      <div class="dash-menu">
        <div class="dash-toolbar">
          <p class="pv-muted">${n ? `${plural(n, "service")}, ${on} on show.` : "Nothing on the menu yet."}</p>
          ${ed !== "new" ? `<button type="button" class="btn btn-black" data-pv-add="svc">${icon("plus")}Add a service</button>` : ""}
        </div>
        ${ed === "new" ? serviceForm(null, groups) : ""}
        ${!groups.length && ed !== "new" ? empty("Your menu is empty.", "Add your first service so customers have something to book. Start with the one people ask for most.") : ""}
        ${groups.map((g, gi) => `<section class="dash-group" aria-labelledby="pv-grp-${gi}"><h2 id="pv-grp-${gi}">${esc(g.name)}</h2>
          <ul class="dash-rows">${g.services.map(s => `<li>${ed === s.id ? serviceForm(s, groups) : serviceRow(s)}</li>`).join("")}</ul></section>`).join("")}
      </div>`;
  }

  function serviceRow(s) {
    const asking = ui.confirm && ui.confirm.kind === "svc" && ui.confirm.id === s.id;
    const what = `<span class="sr-only"> ${esc(s.name)}</span>`;
    return `<article class="dash-row${s.active ? "" : " is-hidden"}" aria-labelledby="pv-svc-${s.id}">
      <div class="dash-row-main">
        <h3 id="pv-svc-${s.id}">${esc(s.name)}${s.active ? "" : ' <span class="pv-pill pv-pill-mute">Hidden</span>'}</h3>
        ${s.description ? `<p class="pv-muted">${esc(s.description)}</p>` : ""}
        ${s.latestStart ? `<p class="dash-row-note">Last start ${esc(s.latestStart)}</p>` : ""}
      </div>
      <p class="dash-row-len">${icon("clock")}${esc(s.durationLabel || dur(s.durationMin) || "No set time")}</p>
      <p class="dash-row-price">${s.price === 0 ? "Free" : ugx(s.price)}</p>
      ${asking
        ? `<div class="dash-confirm" role="group" aria-labelledby="pv-q-${s.id}">
            <p id="pv-q-${s.id}" tabindex="-1"><b>Delete ${esc(s.name)}?</b> Past bookings keep their details. To take it off the menu for a while, edit it and untick “Show on your menu” instead.</p>
            <div class="dash-confirm-btns">
              <button type="button" class="btn pv-btn-danger pv-btn-sm" data-pv-yes="delete" data-pv-svc-id="${s.id}">Yes, delete it</button>
              <button type="button" class="btn btn-ghost pv-btn-sm" data-pv-keep>Keep it</button>
            </div></div>`
        : `<div class="dash-row-btns">
            <button type="button" class="btn btn-ghost pv-btn-sm" id="pv-edit-${s.id}" data-pv-edit="svc" data-pv-id="${s.id}">${icon("edit")}Edit${what}</button>
            <button type="button" class="btn pv-btn-danger pv-btn-sm" data-pv-del="svc" data-pv-id="${s.id}">${icon("trash")}Delete${what}</button>
          </div>`}
    </article>`;
  }

  function serviceForm(s, groups) {
    const f = s ? `pvs-${s.id}` : "pvs-new", H = s ? "h3" : "h2", { opensAt, closesAt } = state.biz;
    const current = s ? s.durationMin : 60;
    const durs = DURATIONS.includes(current) ? DURATIONS : [...DURATIONS, current].sort((a, b) => a - b);
    const times = HALF_HOURS.filter(t => (s && t === s.latestStart) || (t >= opensAt && t < closesAt));
    const v = k => esc(s ? s[k] : "");
    return `<form class="pv-card dash-form" data-pv-form="svc" data-pv-id="${s ? s.id : "new"}" novalidate aria-labelledby="${f}-title">
      <${H} id="${f}-title" tabindex="-1">${s ? `Edit ${esc(s.name)}` : "Add a service"}</${H}>
      <div class="form-grid">
        ${field(`${f}-name`, "name", "Name", `<input id="${f}-name" name="name" value="${v("name")}" maxlength="80" required autocomplete="off" placeholder="Knotless braids, mid-back">`)}
        ${field(`${f}-group`, "groupName", "Group", `<input id="${f}-group" name="groupName" list="${f}-groups" value="${v("groupName")}" maxlength="40" autocomplete="off" placeholder="Braids">
          <datalist id="${f}-groups">${groups.map(g => `<option value="${esc(g.name)}"></option>`).join("")}</datalist>`, { optional: true })}
        ${field(`${f}-desc`, "description", "Description", `<textarea id="${f}-desc" name="description" maxlength="300" rows="2" placeholder="What's included, how long it lasts, what to bring.">${v("description")}</textarea>`, { optional: true, full: true })}
        ${field(`${f}-dur`, "durationMin", "How long it takes", `<select id="${f}-dur" name="durationMin">${durs.map(d => `<option value="${d}"${sel(d === current)}>${d === 0 ? "No set time (pickup or drop-off)" : dur(d)}</option>`).join("")}</select>`)}
        ${field(`${f}-lab`, "durationLabel", "Length note", `<input id="${f}-lab" name="durationLabel" value="${v("durationLabel")}" maxlength="40" autocomplete="off" placeholder="Back next working day"${desc(`${f}-lab`, true)}>`,
          { optional: true, hint: "Shown instead of the time, for things like laundry." })}
        ${field(`${f}-price`, "price", "Price (UGX)", `<input id="${f}-price" name="price" inputmode="numeric" value="${s ? s.price : ""}" required autocomplete="off" placeholder="45000">`)}
        ${field(`${f}-latest`, "latestStart", "Latest start time", `<select id="${f}-latest" name="latestStart"${desc(`${f}-latest`, true)}><option value="">Any time we're open</option>${times.map(t => `<option value="${t}"${sel(s && t === s.latestStart)}>${t}</option>`).join("")}</select>`,
          { optional: true, hint: "For things that must start early, like a full set of knotless." })}
        <label class="pv-check full"><input type="checkbox" name="active"${!s || s.active ? " checked" : ""}>Show on your menu</label>
      </div>
      <div class="dash-live" role="status" aria-live="polite" data-pv-msg></div>
      <div class="dash-form-btns">
        <button type="submit" class="btn btn-black">${s ? "Save changes" : "Add to menu"}</button>
        <button type="button" class="btn btn-ghost" data-pv-close>Close without saving</button>
      </div>
    </form>`;
  }

  // ---------- Team ----------
  function upcomingFor(id, now) { return state.bookings.filter(b => b.staffId === id && b.startsAt >= now && isLive(b, now)).length; }
  function viewTeam(now) {
    const team = [...state.staff].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
    const active = team.filter(s => s.active).length;
    const ed = ui.editing && ui.editing.kind === "staff" ? ui.editing.id : null;
    return `${titleHTML("team")}
      <p class="dash-lede">${state.biz.skipProfessional ? "Customers don't pick a professional at your place, so new bookings go to whoever is free." : "Customers can pick who they'd like, or let us choose whoever is free."} Only people taking bookings are offered.</p>
      <div class="dash-menu">
        <div class="dash-toolbar">
          <p class="pv-muted">${team.length ? `${plural(team.length, "person", "people")}, ${active} taking bookings.` : "Nobody on the team yet."}</p>
          ${ed !== "new" ? `<button type="button" class="btn btn-black" data-pv-add="staff">${icon("plus")}Add someone</button>` : ""}
        </div>
        ${ed === "new" ? staffForm(null, false) : ""}
        <section aria-labelledby="pv-team-h"><h2 id="pv-team-h" class="sr-only">People on the team</h2>
          <ul class="dash-rows">${team.map(s => {
            const last = leavesNobodyActive({ id: s.id, remove: true });
            return `<li>${ed === s.id ? staffForm(s, last) : staffRow(s, last, upcomingFor(s.id, now))}</li>`;
          }).join("")}</ul>
        </section>
      </div>`;
  }

  function staffRow(s, last, upcoming) {
    const asking = ui.confirm && ui.confirm.kind === "staff" && ui.confirm.id === s.id;
    const first = firstName(s.name), who = `<span class="sr-only"> ${esc(s.name)}</span>`;
    let confirm = "";
    if (asking && last) {
      confirm = `<div class="dash-confirm" role="group" aria-labelledby="pv-q-${s.id}">
        <p id="pv-q-${s.id}" tabindex="-1"><b>${esc(first)} is the only person taking bookings.</b> Bookings need someone to go to, so add someone else first.</p>
        <div class="dash-confirm-btns"><button type="button" class="btn btn-ghost pv-btn-sm" data-pv-keep>Got it</button></div></div>`;
    } else if (asking) {
      confirm = `<div class="dash-confirm" role="group" aria-labelledby="pv-q-${s.id}">
        <p id="pv-q-${s.id}" tabindex="-1"><b>Remove ${esc(s.name)} from the team?</b> ${upcoming
          ? `${esc(first)} has ${plural(upcoming, "upcoming booking")}. They stay booked, just without a name on them.`
          : "Past bookings keep their details."} To pause ${esc(first)} instead, edit them and untick “Taking bookings”.</p>
        <div class="dash-confirm-btns">
          <button type="button" class="btn pv-btn-danger pv-btn-sm" data-pv-yes="remove" data-pv-staff-id="${s.id}">Yes, remove</button>
          <button type="button" class="btn btn-ghost pv-btn-sm" data-pv-keep>Keep ${esc(first)}</button>
        </div></div>`;
    }
    return `<article class="dash-row dash-person${s.active ? "" : " is-hidden"}" aria-labelledby="pv-st-${s.id}">
      <span class="avatar" aria-hidden="true">${esc(initials(s.name))}</span>
      <div class="dash-row-main"><h3 id="pv-st-${s.id}">${esc(s.name)}</h3><p class="pv-muted">${esc(s.role || "No role set")}</p></div>
      <p class="dash-row-len">${s.active ? pill({ label: "Taking bookings", tone: "ok" }) : pill({ label: "Not taking bookings", tone: "mute" })}${upcoming ? `<span class="pv-muted">${upcoming} upcoming</span>` : ""}</p>
      ${confirm || `<div class="dash-row-btns">
        <button type="button" class="btn btn-ghost pv-btn-sm" id="pv-edit-${s.id}" data-pv-edit="staff" data-pv-id="${s.id}">${icon("edit")}Edit${who}</button>
        <button type="button" class="btn pv-btn-danger pv-btn-sm" data-pv-del="staff" data-pv-id="${s.id}">${icon("trash")}Remove${who}</button>
      </div>`}
    </article>`;
  }

  function staffForm(s, last) {
    const f = s ? `pvt-${s.id}` : "pvt-new", H = s ? "h3" : "h2";
    return `<form class="pv-card dash-form" data-pv-form="staff" data-pv-id="${s ? s.id : "new"}" novalidate aria-labelledby="${f}-title">
      <${H} id="${f}-title" tabindex="-1">${s ? `Edit ${esc(s.name)}` : "Add someone to the team"}</${H}>
      <div class="form-grid">
        ${field(`${f}-name`, "name", "Name", `<input id="${f}-name" name="name" value="${esc(s ? s.name : "")}" maxlength="60" required autocomplete="off" placeholder="Joy Kemigisha">`)}
        ${field(`${f}-role`, "role", "Role", `<input id="${f}-role" name="role" value="${esc(s ? s.role : "")}" maxlength="40" autocomplete="off" placeholder="Senior braider">`, { optional: true })}
        <div class="full">
          ${last
            ? `<input type="hidden" name="active" value="on"><p class="pv-check">${icon("check")}<span>Taking bookings. ${esc(firstName(s.name))} is the only one, so this stays on until you add someone else.</span></p>`
            : `<label class="pv-check"><input type="checkbox" name="active"${!s || s.active ? " checked" : ""}>Taking bookings</label>`}
          <small class="hint is-error" id="${f}-active-err" data-pv-err="active" hidden></small>
        </div>
      </div>
      <div class="dash-live" role="status" aria-live="polite" data-pv-msg></div>
      <div class="dash-form-btns">
        <button type="submit" class="btn btn-black">${s ? "Save changes" : "Add to the team"}</button>
        <button type="button" class="btn btn-ghost" data-pv-close>Close without saving</button>
      </div>
    </form>`;
  }

  // ---------- Settings ----------
  function previewCard(v) {
    let badge = "";
    if (v.visitMode === "both") badge = `<span class="cover-badge">${icon("home")}Home visits</span>`;
    else if (v.visitMode === "mobile") badge = `<span class="cover-badge">${icon("home")}Comes to you</span>`;
    const venue = venueById(VENUE);
    return `<div class="cover" style="${palStyle(v.palette)}">${badge}<span class="cover-word">${esc(v.coverWord.trim() || "hello")}</span></div>
      <div class="vcard-body">
        <span class="vcard-name">${esc(v.name.trim() || "Your business")}</span>
        ${venue ? ratingHTML(venue) : ""}
        <span class="vcard-area">${esc(v.area ? placeOf(v.area) : "Your area")}</span>
        <span class="tag">${esc(catName(v.categoryId))}</span>
      </div>`;
  }

  function viewSettings() {
    const b = state.biz, f = "pvf";
    const paletteId = (PALETTES.find(p => p.colors.join() === b.palette.join()) || PALETTES[0]).id;
    const areas = Object.entries(REGIONS).map(([r, list]) => `<optgroup label="${esc(r)}">${list.map(a => `<option value="${esc(a)}"${sel(a === b.area)}>${esc(a)}</option>`).join("")}</optgroup>`).join("");
    const hours = cur => HALF_HOURS.map(t => `<option value="${t}"${sel(t === cur)}>${t}</option>`).join("");
    return `${titleHTML("settings")}
      <p class="dash-lede">What customers see on your page and in search, and when they can book you.</p>
      <form class="dash-bform" data-pv-form="settings" novalidate>
        <fieldset class="pv-card dash-fieldset"><legend>The basics</legend>
          <div class="form-grid">
            ${field(`${f}-name`, "name", "Business name", `<input id="${f}-name" name="name" value="${esc(b.name)}" maxlength="80" required autocomplete="organization" placeholder="The Braid Republic">`, { full: true })}
            ${field(`${f}-cat`, "categoryId", "What you do", `<select id="${f}-cat" name="categoryId">${CATS.map(c => `<option value="${c.id}"${sel(c.id === b.categoryId)}>${esc(c.name)}</option>`).join("")}</select>`)}
            ${field(`${f}-area`, "area", "Area", `<select id="${f}-area" name="area">${areas}</select>`)}
            ${field(`${f}-blurb`, "blurb", "A line or two about you", `<textarea id="${f}-blurb" name="blurb" maxlength="400" rows="3" placeholder="Neat parts, gentle hands and a playlist good enough for a six-hour boho."${desc(`${f}-blurb`, true)}>${esc(b.blurb)}</textarea>`,
              { optional: true, full: true, hint: `<span data-pv-count="blurb">${b.blurb.length}</span> of 400 characters. Shown at the top of your page.` })}
            ${field(`${f}-addr`, "address", "Address", `<input id="${f}-addr" name="address" value="${esc(b.address)}" maxlength="200" autocomplete="street-address" placeholder="Plot 12, Ntinda Road, opposite the petrol station"${desc(`${f}-addr`, true)}>`,
              { optional: true, full: true, hint: "Directions people can follow. Landmarks beat plot numbers." })}
            ${field(`${f}-phone`, "phone", "Mobile number", `<input id="${f}-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${b.phone ? prettyMsisdn(b.phone) : ""}" placeholder="0772 123 456"${desc(`${f}-phone`, true)}>`,
              { optional: true, hint: "We text new bookings here. Customers see it on their booking." })}
          </div>
        </fieldset>

        <fieldset class="pv-card dash-fieldset" data-pv-group="visitMode"><legend>Where bookings happen</legend>
          <div class="dash-options">${VISIT_MODES.map(m => `<label class="dash-option"><input type="radio" name="visitMode" value="${m.value}"${m.value === b.visitMode ? " checked" : ""}>
            <span><b>${m.title}</b><span class="pv-muted">${m.body}</span></span></label>`).join("")}</div>
          <small class="hint is-error" id="${f}-visit-err" data-pv-err="visitMode" hidden></small>
          <div data-pv-fee${b.visitMode === "both" ? "" : " hidden"}>
            ${field(`${f}-fee`, "homeVisitFee", "Home-visit fee (UGX)", `<input id="${f}-fee" name="homeVisitFee" inputmode="numeric" value="${b.homeVisitFee}" autocomplete="off"${desc(`${f}-fee`, true)}>`,
              { cls: "dash-fee", hint: "Added to the bill when a customer picks “At my place”. Use 0 for free home visits." })}
          </div>
        </fieldset>

        <fieldset class="pv-card dash-fieldset"><legend>Opening hours</legend>
          <div class="form-grid">
            ${field(`${f}-opens`, "opensAt", "Opens at", `<select id="${f}-opens" name="opensAt">${hours(b.opensAt)}</select>`)}
            ${field(`${f}-closes`, "closesAt", "Closes at", `<select id="${f}-closes" name="closesAt">${hours(b.closesAt)}</select>`)}
          </div>
          <fieldset class="dash-subfieldset" data-pv-group="closedDays" aria-describedby="${f}-days-hint"><legend>Closed on</legend>
            <div class="dash-daychips">${WEEK.map(([d, short, long]) => `<label class="dash-daychip"><input type="checkbox" name="closedDays" value="${d}"${b.closedDays.includes(d) ? " checked" : ""}><span aria-hidden="true">${short}</span><span class="sr-only">${long}</span></label>`).join("")}</div>
            <small class="hint" id="${f}-days-hint">Tick the days you don't take bookings. Times are Kampala time.</small>
            <small class="hint is-error" id="${f}-days-err" data-pv-err="closedDays" hidden></small>
          </fieldset>
        </fieldset>

        <fieldset class="pv-card dash-fieldset"><legend>Booking options</legend>
          <label class="pv-check dash-check-row"><input type="checkbox" name="acceptsCash"${b.acceptsCash ? " checked" : ""}>
            <span><b>Take cash after the service</b><span class="pv-muted">Cash bookings are confirmed straight away. Mark them paid here when the money's in your hand.</span></span></label>
          <label class="pv-check dash-check-row"><input type="checkbox" name="skipProfessional"${b.skipProfessional ? " checked" : ""}>
            <span><b>Skip the “pick a professional” step</b><span class="pv-muted">Customers book a time and we give it to whoever is free. Good for laundry, cleaning crews and call-outs.</span></span></label>
        </fieldset>

        <fieldset class="pv-card dash-fieldset"><legend>Your cover</legend>
          <p class="pv-muted dash-fieldset-note">Until you add photos, your card is a splash of colour with one big word. Make it yours.</p>
          <div class="dash-cover-grid">
            <div class="dash-cover-fields">
              ${field(`${f}-word`, "coverWord", "Cover word", `<input id="${f}-word" name="coverWord" value="${esc(b.coverWord)}" maxlength="12" autocomplete="off" placeholder="braids"${desc(`${f}-word`, true)}>`,
                { hint: `<span data-pv-count="coverWord">${b.coverWord.length}</span> of 12 characters. One word works best.` })}
              <fieldset class="dash-subfieldset" data-pv-group="palette"><legend>Colours</legend>
                <div class="dash-swatches">${PALETTES.map(p => `<label class="dash-swatch"><input type="radio" name="palette" value="${p.id}"${p.id === paletteId ? " checked" : ""}>
                  <span class="dash-swatch-art" aria-hidden="true" style="${palStyle(p.colors)}"></span><span class="dash-swatch-name">${p.name}</span></label>`).join("")}</div>
              </fieldset>
            </div>
            <figure class="dash-preview"><div class="vcard" aria-hidden="true" data-pv-preview>${previewCard(b)}</div>
              <figcaption class="hint">How your card looks in search.</figcaption></figure>
          </div>
        </fieldset>

        <div class="dash-submit">
          <div class="dash-live" role="status" aria-live="polite" data-pv-msg></div>
          <button type="submit" class="btn btn-black">Save changes</button>
        </div>
      </form>`;
  }

  // What the settings form says right now, before any checks.
  function readSettings(form) {
    const fd = new FormData(form), t = k => String(fd.get(k) ?? "");
    return {
      name: t("name"), categoryId: t("categoryId"), area: t("area"), blurb: t("blurb"), address: t("address"), phone: t("phone"),
      visitMode: t("visitMode"), homeVisitFee: t("homeVisitFee"), opensAt: t("opensAt"), closesAt: t("closesAt"),
      closedDays: fd.getAll("closedDays").map(Number), acceptsCash: fd.get("acceptsCash") === "on", skipProfessional: fd.get("skipProfessional") === "on",
      coverWord: t("coverWord"), palette: (PALETTES.find(p => p.id === t("palette")) || PALETTES[0]).colors.slice(),
    };
  }

  // Counters, the fee field, the hours check and the cover preview, as you type.
  function liveSettings(form) {
    const v = readSettings(form);
    const set = (k, n) => { const el = $(`[data-pv-count="${k}"]`, form); if (el) el.textContent = n; };
    set("blurb", v.blurb.length);
    set("coverWord", v.coverWord.length);
    $("[data-pv-fee]", form).hidden = v.visitMode !== "both";
    const clash = toMins(v.closesAt) <= toMins(v.opensAt);
    showErrors(form, { closesAt: clash ? "Closing time must be after opening time." : "" }, { only: ["closesAt"] });
    $("[data-pv-preview]", form).innerHTML = previewCard(v);
  }

  // ---------- Form errors: shown in place, so nothing typed is lost ----------
  function showErrors(form, errors, { only = null, focus = false } = {}) {
    let firstBad = null;
    for (const slot of $$("[data-pv-err]", form)) {
      const name = slot.dataset.pvErr;
      if (only && !only.includes(name)) continue;
      const msg = errors[name] || "";
      slot.textContent = msg;
      slot.hidden = !msg;
      const group = form.querySelector(`[data-pv-group="${name}"]`);
      const ctl = group || form.querySelector(`[name="${name}"]:not([type="hidden"])`);
      if (!ctl) continue;
      if (ctl.dataset.pvDesc === undefined) ctl.dataset.pvDesc = ctl.getAttribute("aria-describedby") || "";
      const base = ctl.dataset.pvDesc;
      if (msg) {
        if (!group) ctl.setAttribute("aria-invalid", "true");
        ctl.setAttribute("aria-describedby", [slot.id, base].filter(Boolean).join(" "));
        if (!firstBad) firstBad = group ? group.querySelector("input") : ctl;
      } else {
        ctl.removeAttribute("aria-invalid");
        if (base) ctl.setAttribute("aria-describedby", base); else ctl.removeAttribute("aria-describedby");
      }
    }
    if (focus && firstBad) firstBad.focus();
    return firstBad;
  }
  function formMessage(form, text) {
    const box = $("[data-pv-msg]", form);
    if (box) box.innerHTML = text ? `<p class="form-err dash-msg">${esc(text)}</p>` : "";
  }
  function refuse(form, errors, summary) {
    showErrors(form, errors, { focus: true });
    const n = Object.values(errors).filter(Boolean).length;
    formMessage(form, summary || (n === 1 ? "One field needs a look. It's highlighted above." : `${n} fields need a look. They're highlighted above.`));
  }

  function saveService(form) {
    const fd = new FormData(form), t = k => String(fd.get(k) ?? "").trim();
    const { opensAt, closesAt } = state.biz, open = toMins(opensAt), close = toMins(closesAt);
    const errors = {};
    const name = t("name"), groupName = t("groupName"), description = t("description"), durationLabel = t("durationLabel");
    if (name.length < 2) errors.name = "Give the service a name of at least 2 characters.";
    else if (name.length > 80) errors.name = "Keep the name under 80 characters.";
    if (groupName.length > 40) errors.groupName = "Keep the group name under 40 characters.";
    if (description.length > 300) errors.description = "Keep the description under 300 characters.";
    if (durationLabel.length > 40) errors.durationLabel = "Keep the length note under 40 characters.";
    const durationMin = /^\d{1,3}$/.test(t("durationMin")) ? Number(t("durationMin")) : NaN;
    if (Number.isNaN(durationMin) || durationMin > 720 || durationMin % 5 !== 0) errors.durationMin = "Pick how long it takes from the list.";
    else if (close > open && durationMin > close - open) errors.durationMin = `That's longer than you're open (${opensAt} to ${closesAt}), so nobody could book it. Pick a shorter time or change your hours in Settings.`;
    const price = parseUgx(t("price"));
    if (price === null) errors.price = "Enter the price in shillings, like 45000.";
    else if (price > 10000000) errors.price = "That price looks high. Keep it under UGX 10,000,000.";
    const latestStart = t("latestStart");
    if (latestStart) {
      if (!TIME_RE.test(latestStart)) errors.latestStart = "Pick a latest start time from the list, or leave it empty.";
      else if (toMins(latestStart) < open) errors.latestStart = `You open at ${opensAt}, so the latest start can't be before that.`;
      else if (close > open && toMins(latestStart) >= close) errors.latestStart = `You close at ${closesAt}, so the latest start has to be earlier than that.`;
    }
    if (Object.keys(errors).length) { refuse(form, errors, "Check the highlighted fields and try again."); return; }
    const value = { groupName: groupName || "Services", name, description, durationMin, durationLabel, price, latestStart, active: fd.get("active") === "on" };
    const existing = state.services.find(s => s.id === form.dataset.pvId);
    let id;
    if (existing) { Object.assign(existing, value); id = existing.id; }
    else {
      id = newId("svc");
      state.services.push({ id, sort: state.services.reduce((m, s) => Math.max(m, s.sort), -1) + 1, ...value });
    }
    ui.editing = null;
    render({ focus: `#pv-edit-${id}` });
    say(existing ? `Saved ${name}.` : `Added ${name} to your menu.`);
  }

  function saveStaff(form) {
    const fd = new FormData(form), t = k => String(fd.get(k) ?? "").trim();
    const errors = {};
    const name = t("name"), role = t("role"), active = fd.get("active") === "on";
    if (name.length < 2) errors.name = "Add their name, at least 2 characters.";
    else if (name.length > 60) errors.name = "Keep the name under 60 characters.";
    if (role.length > 40) errors.role = "Keep the role under 40 characters.";
    const existing = state.staff.find(s => s.id === form.dataset.pvId);
    if (!errors.name && existing && leavesNobodyActive({ id: existing.id, active })) errors.active = LAST_ONE;
    if (Object.keys(errors).length) { refuse(form, errors, errors.active || "Check the highlighted fields and try again."); return; }
    let id;
    if (existing) { Object.assign(existing, { name, role, active }); id = existing.id; }
    else {
      id = newId("st");
      state.staff.push({ id, name, role, active, sort: state.staff.reduce((m, s) => Math.max(m, s.sort), -1) + 1 });
    }
    ui.editing = null;
    render({ focus: `#pv-edit-${id}` });
    say(existing ? `Saved ${name}.` : `Added ${name} to the team.`);
  }

  function saveSettings(form) {
    const v = readSettings(form), errors = {};
    const name = v.name.trim(), coverWord = v.coverWord.trim();
    if (name.length < 2) errors.name = "Give your business a name of at least 2 characters.";
    else if (name.length > 80) errors.name = "Keep the name under 80 characters.";
    if (v.blurb.trim().length > 400) errors.blurb = "Keep the description under 400 characters.";
    if (v.address.trim().length > 200) errors.address = "Keep the address under 200 characters.";
    if (!CATS.some(c => c.id === v.categoryId)) errors.categoryId = "Pick the category that fits you best.";
    if (!ALL_AREAS.includes(v.area)) errors.area = "Pick the area you work from.";
    let phone = "";
    if (v.phone.trim()) { phone = normalizeMsisdn(v.phone); if (!phone) errors.phone = "Enter a Ugandan mobile number, like 0772 123 456."; }
    if (!VISIT_MODES.some(m => m.value === v.visitMode)) errors.visitMode = "Choose where your bookings happen.";
    let fee = state.biz.homeVisitFee;
    if (v.visitMode === "both") {
      fee = parseUgx(v.homeVisitFee);
      if (fee === null) errors.homeVisitFee = "Enter the fee in shillings, like 10000. Use 0 for free home visits.";
      else if (fee > 500000) errors.homeVisitFee = "That fee looks high. Keep it under UGX 500,000.";
    }
    if (!HALF_HOURS.includes(v.opensAt)) errors.opensAt = "Pick an opening time from the list.";
    if (!HALF_HOURS.includes(v.closesAt)) errors.closesAt = "Pick a closing time from the list.";
    else if (!errors.opensAt && toMins(v.closesAt) <= toMins(v.opensAt)) errors.closesAt = "Closing time must be after opening time.";
    const closedDays = [...new Set(v.closedDays.filter(d => d >= 0 && d <= 6))].sort();
    if (closedDays.length === 7) errors.closedDays = "You can't be closed every day. Untick at least one.";
    if (!coverWord) errors.coverWord = "Pick a word for your cover, like braids or shine.";
    else if (coverWord.length > 12) errors.coverWord = "Keep the cover word to 12 characters or fewer.";
    showErrors(form, errors);
    if (Object.keys(errors).length) { refuse(form, errors); return; }
    Object.assign(state.biz, {
      name, categoryId: v.categoryId, area: v.area, blurb: v.blurb.trim(), address: v.address.trim(), phone, visitMode: v.visitMode,
      homeVisitFee: fee, opensAt: v.opensAt, closesAt: v.closesAt, closedDays, acceptsCash: v.acceptsCash,
      skipProfessional: v.skipProfessional, coverWord, palette: v.palette,
    });
    formMessage(form, "");
    renderHead();
    syncPublic();
    say("Saved. Your public page is up to date.");
  }

  // ---------- Toast and screen-reader notes ----------
  let toastTimer;
  function say(text) {
    const live = $("#pvLive");
    $("#toast").hidden = true; // one message on screen at a time
    clearTimeout(toastTimer);
    live.innerHTML = "";
    const p = document.createElement("p");
    p.className = "toast pv-toast";
    p.tabIndex = -1;
    p.textContent = text;
    live.appendChild(p);
    const hide = () => { if (document.activeElement === p) { toastTimer = setTimeout(hide, 2000); return; } live.innerHTML = ""; };
    toastTimer = setTimeout(hide, 5000);
  }
  const srSay = text => { const el = $("#pvSr"); el.textContent = ""; requestAnimationFrame(() => { el.textContent = text; }); };

  // ---------- Rendering ----------
  function renderHead() {
    const b = state.biz;
    $("#pvHead").innerHTML = `<div class="dash-id">
        <div class="cover dash-mini" style="${palStyle(b.palette)}" aria-hidden="true"><span class="cover-word">${esc(b.coverWord)}</span></div>
        <div class="dash-id-text"><p class="eyebrow">Your business</p><p class="dash-id-name">${esc(b.name)}</p>
          <p class="pv-muted dash-id-meta">${esc(catName(b.categoryId))} · ${esc(placeOf(b.area))}</p></div>
      </div>
      <p class="pv-owner pv-muted">${icon("user")}Logged in as ${esc(OWNER)}</p>`;
  }
  function renderTabs() {
    const row = $("#pvTabs");
    row.innerHTML = TABS.map(t => `<li><a class="chip" href="${t.hash}"${t.id === ui.tab ? ' aria-current="page"' : ""}>${icon(t.ic)}${t.label}</a></li>`).join("");
    // On a phone the row scrolls sideways: keep the current tab in sight.
    const cur = $('[aria-current="page"]', row);
    if (cur && row.scrollWidth > row.clientWidth) {
      if (cur.offsetLeft < row.scrollLeft) row.scrollLeft = cur.offsetLeft - 8;
      else if (cur.offsetLeft + cur.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollLeft = cur.offsetLeft + cur.offsetWidth - row.clientWidth + 8;
    }
  }
  function render({ focus = null } = {}) {
    const now = Date.now();
    view.innerHTML = { overview: viewOverview, bookings: viewBookings, services: viewServices, team: viewTeam, settings: viewSettings }[ui.tab](now);
    renderTabs();
    if (focus) {
      const el = typeof focus === "string" ? $(focus, root) : focus;
      (el || $("h1", view))?.focus();
    }
  }
  function focusBooking(id) {
    const card = document.getElementById(`pv-bk-${id}`);
    const target = card && ($("[data-pv-op], [data-pv-ask]", card) || document.getElementById(`pv-bkh-${id}`));
    (target || $("h1", view)).focus();
  }

  // ---------- Opening, closing and the address bar ----------
  const TAB_RE = /^#dashboard(?:\/(bookings|services|team|settings))?\/?$/;
  function openDash(tab) {
    const wasOpen = ui.open;
    let added = [];
    if (!wasOpen) {
      // Seeded on first open rather than at page load, so "today" is today even on a page left open for hours.
      if (!state) fresh();
      ui.homeY = window.scrollY;
      const a = document.activeElement;
      ui.opener = a && a !== document.body && !root.contains(a) ? a : null;
      ui.title = document.title;
      closeMenu();
      $("#top").hidden = true;
      $(".footer").hidden = true;
      root.hidden = false;
      $("#pvFlag").hidden = false;
      document.body.classList.add("pv-on");
      ui.open = true;
      added = syncCustomer();
      renderHead();
    }
    if (!wasOpen || ui.tab !== tab) { ui.editing = null; ui.confirm = null; }
    ui.tab = tab;
    if (!ui.date) ui.date = kToday(Date.now());
    render();
    document.title = `${TABS.find(t => t.id === tab).label} · Dashboard · reClain`;
    if (!wasOpen) window.scrollTo({ top: 0, behavior: "instant" });
    $("h1", view).focus({ preventScroll: !wasOpen });
    if (added.length) {
      const b = added[added.length - 1];
      say(added.length === 1
        ? `New booking from ${firstName(b.customerName) || "a customer"}: ${kDate(kParts(b.startsAt).date)} at ${kTime(b.startsAt)}.`
        : `${added.length} new bookings from the customer side are in.`);
    }
  }
  function closeDash() {
    if (!ui.open) return;
    ui.open = false;
    ui.editing = null;
    ui.confirm = null;
    root.hidden = true;
    $("#top").hidden = false;
    $(".footer").hidden = false;
    $("#pvFlag").hidden = true;
    document.body.classList.remove("pv-on");
    document.title = ui.title;
    $("#pvLive").innerHTML = "";
    let target = null;
    try { target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; } catch { /* odd hash */ }
    if (target && !root.contains(target)) { target.scrollIntoView({ block: "start" }); return; }
    window.scrollTo({ top: ui.homeY, behavior: "instant" });
    if (ui.opener && ui.opener.isConnected && ui.opener.offsetParent) ui.opener.focus({ preventScroll: true });
  }
  function route(hash = location.hash) {
    const m = TAB_RE.exec(hash);
    if (m) openDash(m[1] || "overview");
    else closeDash();
  }
  // Go to a #dashboard address by setting it from script rather than following the link: a page
  // shown in an iframe can resolve "#..." links against its parent's address and navigate away.
  function go(hash) {
    if (location.hash === hash) { route(hash); return; }
    try { location.hash = hash; } catch { /* sandboxed */ }
    if (location.hash !== hash) route(hash);
  }
  // Back to the homepage, leaving #dashboard in the history so the back button returns here.
  function goHome() {
    try { history.pushState(null, "", location.pathname + location.search); closeDash(); }
    catch { location.hash = ""; }
  }
  window.addEventListener("hashchange", () => route());
  // Every link to the dashboard (menu, business band, log-in modal, tabs, day links) goes through go().
  document.addEventListener("click", e => {
    const a = e.target instanceof Element ? e.target.closest('a[href^="#dashboard"]') : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (a.dataset.pvGoto && realDate(a.dataset.pvGoto)) { ui.date = a.dataset.pvGoto; ui.filter = "all"; }
    go(a.getAttribute("href"));
  });

  // ---------- Actions ----------
  const OP_DONE = { complete: "Marked as completed.", no_show: "Marked as a no-show.", cash_paid: "Cash payment recorded." };
  function doOp(id, op) {
    const b = state.bookings.find(x => x.id === id);
    ui.confirm = null;
    if (!b) { render({ focus: "h1" }); say("We couldn't find that booking any more."); return; }
    const refused = refusal(op, b, Date.now());
    if (refused) { render(); focusBooking(id); say(refused); return; }
    if (op === "complete") b.status = "completed";
    else if (op === "no_show") b.status = "no_show";
    else if (op === "cancel") b.status = "cancelled";
    else if (op === "cash_paid") b.paymentStatus = "paid";
    render();
    focusBooking(id);
    say(op === "cancel" ? `Cancelled. We'll text ${firstName(b.customerName) || "the customer"} to let them know.` : OP_DONE[op]);
  }
  function openerFor(c) {
    if (c.kind === "bk") return `[data-pv-ask="${c.op}"][data-pv-bk="${c.id}"]`;
    return `[data-pv-del="${c.kind}"][data-pv-id="${c.id}"]`;
  }

  root.addEventListener("click", e => {
    const el = e.target.closest("a, button");
    if (!el || !root.contains(el)) return;
    const d = el.dataset;
    if (el.id === "pvBack") { e.preventDefault(); goHome(); return; }
    if (el.matches('a[href^="#dashboard"]')) return; // handled by go(), below
    if ("pvPublic" in d) { openFlow(VENUE); return; }
    if ("pvReset" in d) {
      fresh(); syncCustomer(); syncPublic(true); renderHead();
      ui.editing = null; ui.confirm = null; ui.date = kToday(Date.now()); ui.filter = "all";
      render({ focus: "h1" });
      say("Fresh start. Everything's back to how Aisha left it.");
      return;
    }
    if (d.pvOp) { doOp(d.pvBk, d.pvOp); return; }
    if (d.pvAsk) { ui.confirm = { kind: "bk", id: d.pvBk, op: d.pvAsk }; render({ focus: `#pv-q-${d.pvBk}` }); return; }
    if (d.pvYes) {
      const c = ui.confirm;
      if (d.pvYes === "delete") {
        const s = state.services.find(x => x.id === d.pvSvcId);
        state.services = state.services.filter(x => x.id !== d.pvSvcId);
        ui.confirm = null;
        render({ focus: '[data-pv-add="svc"]' });
        if (s) say(`Deleted ${s.name}. Past bookings keep their details.`);
        return;
      }
      if (d.pvYes === "remove") {
        const s = state.staff.find(x => x.id === d.pvStaffId);
        ui.confirm = null;
        if (!s) { render({ focus: "h1" }); return; }
        if (leavesNobodyActive({ id: s.id, remove: true })) { render({ focus: `#pv-edit-${s.id}` }); say(LAST_ONE); return; }
        const now = Date.now();
        for (const b of state.bookings) {
          if (b.staffId !== s.id) continue;
          b.staffId = null;
          // Upcoming bookings stay booked, just without a name on them. Past ones keep it.
          b.staffName = b.startsAt >= now ? "" : s.name;
        }
        state.staff = state.staff.filter(x => x.id !== s.id);
        render({ focus: '[data-pv-add="staff"]' });
        say(`Removed ${s.name} from the team.`);
        return;
      }
      if (c && c.kind === "bk") doOp(d.pvBk, d.pvYes);
      return;
    }
    if ("pvKeep" in d) {
      const c = ui.confirm;
      ui.confirm = null;
      render({ focus: c ? openerFor(c) : "h1" });
      return;
    }
    if (d.pvAdd) { ui.editing = { kind: d.pvAdd, id: "new" }; ui.confirm = null; render({ focus: `#${d.pvAdd === "svc" ? "pvs" : "pvt"}-new-title` }); return; }
    if (d.pvEdit) { ui.editing = { kind: d.pvEdit, id: d.pvId }; ui.confirm = null; render({ focus: `#${d.pvEdit === "svc" ? "pvs" : "pvt"}-${d.pvId}-title` }); return; }
    if (d.pvDel) { ui.confirm = { kind: d.pvDel, id: d.pvId }; ui.editing = null; render({ focus: `#pv-q-${d.pvId}` }); return; }
    if ("pvClose" in d) {
      const ed = ui.editing;
      ui.editing = null;
      render({ focus: ed && ed.id !== "new" ? `#pv-edit-${ed.id}` : `[data-pv-add="${ed ? ed.kind : "svc"}"]` });
      return;
    }
    if (d.pvDay) {
      ui.date = kAdd(ui.date || kToday(Date.now()), Number(d.pvDay));
      ui.confirm = null;
      render({ focus: `[data-pv-day="${d.pvDay}"]` });
      srSay(`${kDate(ui.date)}. ${plural(onDay(ui.date).length, "booking")}.`);
      return;
    }
    if (d.pvFilter) {
      ui.filter = d.pvFilter;
      ui.confirm = null;
      render({ focus: `[data-pv-filter="${d.pvFilter}"]` });
      const f = FILTERS.find(x => x.key === ui.filter);
      const n = onDay(ui.date).filter(b => !f.statuses.length || f.statuses.includes(b.status)).length;
      srSay(`${f.label}: ${plural(n, "booking")}.`);
      return;
    }
    if ("pvToday" in d) {
      ui.date = kToday(Date.now());
      render({ focus: "#pvDayLabel" });
      srSay(`Today, ${kDate(ui.date)}.`);
    }
  });

  view.addEventListener("submit", e => {
    const form = e.target.closest("form[data-pv-form]");
    if (!form) return;
    e.preventDefault();
    const kind = form.dataset.pvForm;
    if (kind === "svc") saveService(form);
    else if (kind === "staff") saveStaff(form);
    else if (kind === "settings") saveSettings(form);
    else if (kind === "day") {
      const value = String(new FormData(form).get("date") || "");
      if (!realDate(value)) { $("#pvDate").focus(); srSay("Pick a date first."); return; }
      ui.date = value;
      ui.confirm = null;
      render({ focus: "#pvDayLabel" });
      srSay(`${kDate(value)}. ${plural(onDay(value).length, "booking")}.`);
    }
  });
  const onSettingsEdit = e => { const form = e.target.closest('form[data-pv-form="settings"]'); if (form) liveSettings(form); };
  view.addEventListener("input", onSettingsEdit);
  view.addEventListener("change", onSettingsEdit);

  // Escape: close a question or a form first, then go back to the homepage. Runs before the
  // customer side's own Escape handler, so an open menu or dialog gets to close itself instead.
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape" || !ui.open || e.defaultPrevented) return;
    if (document.querySelector("dialog[open]") || !$("#menuPanel").hidden) return;
    const t = e.target instanceof Element ? e.target : null;
    const ask = t && t.closest(".dash-confirm");
    if (ask) { e.preventDefault(); $("[data-pv-keep]", ask)?.click(); return; }
    const form = t && t.closest('form[data-pv-form="svc"], form[data-pv-form="staff"]');
    if (form) { e.preventDefault(); $("[data-pv-close]", form)?.click(); return; }
    e.preventDefault();
    goHome();
  }, true);

  // A booking made in the customer flow lands here when the flow closes.
  $("#flow").addEventListener("close", () => {
    if (!ui.open) return;
    const added = syncCustomer();
    if (!added.length) return;
    if (ui.tab === "overview" || ui.tab === "bookings") render();
    const b = added[added.length - 1];
    say(`New booking from ${firstName(b.customerName) || "a customer"}: ${kDate(kParts(b.startsAt).date)} at ${kTime(b.startsAt)}.`);
  });

  if (TAB_RE.test(location.hash)) route();
})();
