// Reclain front end. Venues, services and reviews below are sample content:
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
  { id: "hair", name: "Hair salons" },
  { id: "braids", name: "Braids & locs" },
  { id: "barber", name: "Barbers" },
  { id: "massage", name: "Massage & spa", isNew: true },
  { id: "nails", name: "Nails & beauty" },
  { id: "bridal", name: "Bridal & events" },
  { id: "laundry", name: "Laundry", isNew: true },
  { id: "cleaning", name: "Home cleaning" },
  { id: "escort", name: "Security & escort", isNew: true },
  { id: "repairs", name: "Repairs" },
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
  $("#chips").innerHTML = [`<button type="button" class="chip" data-chip="" aria-pressed="${!filters.cat}">All</button>`]
    .concat(CATS.map(c => `<button type="button" class="chip" data-chip="${c.id}" aria-pressed="${filters.cat === c.id}">${esc(c.name)}${c.isNew ? '<span class="new">NEW</span>' : ""}</button>`))
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
  $("#area").innerHTML = `<option value="">Anywhere near Kampala</option>${groups}`;
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
        <p>Try “braids”, “fade”, “massage” or “laundry”, or widen the area. Or tell your favourite stylist to join Reclain.</p>
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
  $("#flowBack").hidden = !!flow.done;
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
        <span>Mobile money payments are held by Reclain and released to ${esc(v.name)} after your service. Free cancellation until 4 hours before.</span></div>
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

function nextStep() {
  if (!stepValid() || flow.sending) return;
  if (currentStep() === "confirm") { $("#payForm").requestSubmit(); return; }
  flow.step++;
  if (currentStep() === "time" && flow.time !== null && !availableSlots(flow.date).includes(flow.time)) flow.time = null;
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
    const v = flow.v, start = parseYmd(flow.date);
    for (let i = 1; i <= 21; i++) {
      const d = addDays(start, i);
      if (v.closed.includes(d.getDay())) continue;
      if (availableSlots(ymd(d)).length) { flow.date = ymd(d); break; }
    }
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
renderRails();
renderTrending();
renderReviews();
renderAreas();
updateNavUser();
