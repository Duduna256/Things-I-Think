// Reclain front-end: renders catalogue, handles search and booking.
// Data is static for now; swap CATEGORIES/PROS for an API when a backend exists.

const CATEGORIES = [
  {
    id: "hair", name: "Hair Dressing", isNew: true, services: [
      { id: "knotless", icon: "💇🏾‍♀️", name: "Knotless braids", desc: "Medium or small, waist length. Hair can be supplied.", price: 120000, duration: "5–6 hrs" },
      { id: "cornrows", icon: "🧵", name: "Cornrows", desc: "Straight-back or designer patterns.", price: 40000, duration: "1–2 hrs" },
      { id: "locs", icon: "🌀", name: "Locs retwist & style", desc: "Retwist, palm roll and a style of your choice.", price: 60000, duration: "2–3 hrs" },
      { id: "wash-set", icon: "🫧", name: "Wash, treat & blow-dry", desc: "Deep-conditioning treatment and silk press finish.", price: 45000, duration: "1.5 hrs" },
      { id: "relaxer", icon: "✨", name: "Relaxer / retouch", desc: "Scalp-safe relaxer with treatment and set.", price: 50000, duration: "2 hrs" },
      { id: "wig", icon: "👑", name: "Wig install & styling", desc: "Frontal or closure install, cut and style.", price: 70000, duration: "2 hrs" },
      { id: "haircut", icon: "💈", name: "Men's haircut & beard", desc: "Fade, taper or classic cut, plus beard line-up.", price: 20000, duration: "45 min" },
      { id: "kids", icon: "🎀", name: "Kids' hair", desc: "Gentle braids, cuts and styling for children.", price: 25000, duration: "1 hr" },
      { id: "bridal", icon: "💐", name: "Bridal & event styling", desc: "Trial session plus styling on the day.", price: 250000, duration: "Half day" },
    ]
  },
  {
    id: "beauty", name: "Beauty", services: [
      { id: "nails", icon: "💅🏾", name: "Manicure & pedicure", desc: "Gel or classic, with hand and foot massage.", price: 35000, duration: "1.5 hrs" },
      { id: "makeup", icon: "💄", name: "Make-up", desc: "Soft glam or full glam for any occasion.", price: 60000, duration: "1 hr" },
      { id: "lashes", icon: "👁️", name: "Lash extensions", desc: "Classic, hybrid or volume sets.", price: 50000, duration: "1.5 hrs" },
    ]
  },
  {
    id: "massage", name: "Massage & Spa", isNew: true, services: [
      { id: "swedish", icon: "🌿", name: "Swedish massage", desc: "Full-body relaxation massage by a certified therapist.", price: 80000, duration: "1 hr" },
      { id: "deep-tissue", icon: "💪🏾", name: "Deep tissue massage", desc: "Firm pressure for muscle tension and back pain.", price: 95000, duration: "1 hr" },
      { id: "hot-stone", icon: "🪨", name: "Hot stone massage", desc: "Heated stones to ease stiffness and stress.", price: 110000, duration: "75 min" },
      { id: "sports", icon: "🏃🏾", name: "Sports & recovery massage", desc: "Pre- or post-workout recovery and stretching.", price: 90000, duration: "1 hr" },
      { id: "foot-reflex", icon: "🦶🏾", name: "Foot reflexology", desc: "Pressure-point foot and lower-leg massage.", price: 50000, duration: "45 min" },
      { id: "couples", icon: "💞", name: "Couples massage", desc: "Two therapists, side-by-side sessions at home.", price: 170000, duration: "1 hr" },
    ]
  },
  {
    id: "laundry", name: "Laundry", isNew: true, services: [
      { id: "wash-fold", icon: "🧺", name: "Wash & fold", desc: "Priced per 5 kg bag. Free pickup and delivery.", price: 25000, duration: "Next day" },
      { id: "wash-iron", icon: "👕", name: "Wash & iron", desc: "Shirts, trousers and dresses washed and pressed.", price: 35000, duration: "Next day" },
      { id: "dry-clean", icon: "🧥", name: "Dry cleaning", desc: "Suits, gomesi, kanzu and delicate fabrics.", price: 20000, duration: "2 days" },
      { id: "bedding", icon: "🛏️", name: "Bedding & curtains", desc: "Duvets, sheets, blankets and curtains.", price: 40000, duration: "2 days" },
      { id: "express", icon: "⚡", name: "Express same-day", desc: "Picked up by 10:00, back by 18:00.", price: 45000, duration: "Same day" },
    ]
  },
  {
    id: "cleaning", name: "Cleaning", services: [
      { id: "home-clean", icon: "🧽", name: "Home cleaning", desc: "Full clean for apartments and houses.", price: 70000, duration: "3–4 hrs" },
      { id: "sofa", icon: "🛋️", name: "Sofa & carpet cleaning", desc: "Deep steam clean and stain removal.", price: 90000, duration: "2–3 hrs" },
    ]
  },
  {
    id: "escort", name: "Security & Escort", isNew: true, services: [
      { id: "personal-escort", icon: "🛡️", name: "Personal security escort", desc: "Licensed guard to accompany you to meetings, banks or events.", price: 150000, duration: "Half day" },
      { id: "airport-escort", icon: "✈️", name: "Airport pickup & escort", desc: "Meet-and-greet at Entebbe with a vetted driver and escort.", price: 120000, duration: "Per trip" },
      { id: "event-security", icon: "🎟️", name: "Event security", desc: "Guards for weddings, parties and introductions.", price: 100000, duration: "Per guard / day" },
      { id: "child-escort", icon: "🎒", name: "School run escort", desc: "Vetted escort to take children to and from school.", price: 60000, duration: "Per week" },
    ]
  },
  {
    id: "repairs", name: "Repairs", services: [
      { id: "plumbing", icon: "🔧", name: "Plumbing", desc: "Leaks, blockages and installations.", price: 50000, duration: "From 1 hr" },
      { id: "electrical", icon: "💡", name: "Electrical", desc: "Wiring, sockets, lights and fault finding.", price: 50000, duration: "From 1 hr" },
      { id: "appliance", icon: "🧊", name: "Appliance repair", desc: "Fridges, washers, cookers and more.", price: 60000, duration: "From 1 hr" },
    ]
  },
];

const PROS = [
  { name: "Aisha Nakato", initials: "AN", role: "Braids & locs specialist", rating: 4.9, reviews: 312, area: "Ntinda", color: "#2f6b5a", category: "hair", tags: ["Knotless", "Locs", "At-home"] },
  { name: "Brian Okello", initials: "BO", role: "Master barber", rating: 4.8, reviews: 540, area: "Kampala Central", color: "#b4462f", category: "hair", tags: ["Fades", "Beard", "Kids"] },
  { name: "Joan Atim", initials: "JA", role: "Bridal hair & make-up", rating: 5.0, reviews: 128, area: "Kira", color: "#7a4e9b", category: "hair", tags: ["Bridal", "Wigs", "Make-up"] },
  { name: "Ruth Namubiru", initials: "RN", role: "Natural hair stylist", rating: 4.9, reviews: 204, area: "Entebbe", color: "#c2873a", category: "hair", tags: ["Silk press", "Treatments"] },
  { name: "Esther Achieng", initials: "EA", role: "Certified massage therapist", rating: 4.9, reviews: 187, area: "Kololo", color: "#6a8f3a", category: "massage", tags: ["Swedish", "Deep tissue", "At-home"] },
  { name: "Fresh Fold Laundry", initials: "FF", role: "Laundry & dry cleaning", rating: 4.8, reviews: 451, area: "Kampala Central", color: "#2a7fa8", category: "laundry", tags: ["Pickup", "Same-day", "Dry clean"] },
  { name: "Guardline Security", initials: "GS", role: "Licensed security escorts", rating: 4.7, reviews: 96, area: "Kampala", color: "#33424f", category: "escort", tags: ["Personal", "Events", "Airport"] },
  { name: "Peter Ssali", initials: "PS", role: "Home cleaning team lead", rating: 4.7, reviews: 389, area: "Wakiso", color: "#3b6ea5", category: "cleaning", tags: ["Deep clean", "Sofa"] },
  { name: "Moses Kato", initials: "MK", role: "Electrician & handyman", rating: 4.8, reviews: 276, area: "Mukono", color: "#555", category: "repairs", tags: ["Electrical", "Plumbing"] },
];

const HOME_FEE = 10000;

// Uganda mobile money prefixes (after the leading 0).
const NETWORKS = {
  mtn: { label: "MTN MoMo", prefixes: ["76", "77", "78", "39"] },
  airtel: { label: "Airtel Money", prefixes: ["70", "74", "75", "20"] },
};
const PAYMENT_LABELS = { mtn: "MTN MoMo", airtel: "Airtel Money", card: "Card", cash: "Cash after service" };

// Accepts 0772123456, 772123456, +256772123456 or 256 772 123 456; returns 9 digits or null.
function normalizeMsisdn(raw) {
  const digits = raw.replace(/\D/g, "").replace(/^256/, "").replace(/^0/, "");
  return /^\d{9}$/.test(digits) ? digits : null;
}

function networkOf(msisdn) {
  return Object.keys(NETWORKS).find(k => NETWORKS[k].prefixes.includes(msisdn.slice(0, 2)));
}

// Placeholder for the real collection request. In production this should call
// your backend, which talks to the MTN MoMo / Airtel Money Collections APIs
// (API keys must never live in front-end code).
async function requestMobileMoneyPayment({ network, msisdn, amount, reference }) {
  return { status: "PENDING", network, msisdn: "+256" + msisdn, amount, reference };
}
const allServices = CATEGORIES.flatMap(c => c.services.map(s => ({ ...s, category: c.id })));
const findService = id => allServices.find(s => s.id === id);
const ugx = n => "UGX " + n.toLocaleString("en-UG");

const $ = sel => document.querySelector(sel);

// ---------- Rendering ----------
function serviceCard(s) {
  return `
    <article class="service">
      <div class="icon" aria-hidden="true">${s.icon}</div>
      <h3>${s.name}</h3>
      <p>${s.desc}</p>
      <div class="meta">
        <span class="price"><small>from</small> ${ugx(s.price)}</span>
        <button class="link-btn" data-book data-service="${s.id}">Book →</button>
      </div>
    </article>`;
}

function renderCategory(id) {
  const cat = CATEGORIES.find(c => c.id === id);
  $("#serviceGrid").innerHTML = cat.services.map(serviceCard).join("");
  document.querySelectorAll("#catTabs button").forEach(b =>
    b.setAttribute("aria-selected", String(b.dataset.cat === id)));
}

function renderTabs() {
  $("#catTabs").innerHTML = CATEGORIES.map(c =>
    `<button role="tab" data-cat="${c.id}">${c.name}${c.isNew ? '<span class="new">NEW</span>' : ""}</button>`
  ).join("");
  $("#catTabs").addEventListener("click", e => {
    const btn = e.target.closest("button[data-cat]");
    if (btn) renderCategory(btn.dataset.cat);
  });
  renderCategory("hair");
}

function renderHairList() {
  const hair = CATEGORIES.find(c => c.id === "hair").services.slice(0, 6);
  $("#hairList").innerHTML = hair.map(s => `
    <div class="hair-row">
      <div><strong>${s.name}</strong><small>${s.duration}</small></div>
      <span class="price">${ugx(s.price)}</span>
    </div>`).join("");
}

function renderPros() {
  $("#proGrid").innerHTML = PROS.map(p => `
    <article class="pro">
      <div class="pro-top">
        <div class="avatar" style="background:${p.color}">${p.initials}</div>
        <div><h3>${p.name}</h3><small>${p.role} · ${p.area}</small></div>
      </div>
      <p>★ ${p.rating.toFixed(1)} <small>(${p.reviews} reviews)</small></p>
      <div class="tags">${p.tags.map(t => `<span>${t}</span>`).join("")}</div>
      <button class="btn btn-ghost" data-book data-pro="${p.name}" data-category="${p.category}">Book ${p.name.split(" ")[0]}</button>
    </article>`).join("");
}

function fillSelects() {
  $("#serviceList").innerHTML = allServices.map(s => `<option value="${s.name}">`).join("");
  $("#bookService").innerHTML = CATEGORIES.map(c =>
    `<optgroup label="${c.name}">${c.services.map(s =>
      `<option value="${s.id}">${s.name} — from ${ugx(s.price)}</option>`).join("")}</optgroup>`
  ).join("");
}

// ---------- Booking ----------
const modal = $("#bookModal");
const form = $("#bookForm");

function updateProOptions() {
  const service = findService($("#bookService").value);
  const current = $("#bookPro").value;
  const pros = PROS.filter(p => p.category === service.category);
  $("#bookPro").innerHTML = `<option value="">Any available pro</option>` +
    pros.map(p => `<option ${p.name === current ? "selected" : ""}>${p.name}</option>`).join("");
}

function updatePayment() {
  const momo = form.payment.value in NETWORKS;
  $("#momoWrap").hidden = !momo;
  form.momo.setCustomValidity("");
  $("#momoHint").classList.remove("error");
  if (momo) {
    $("#momoNumber").placeholder = form.payment.value === "mtn" ? "077X XXX XXX" : "075X XXX XXX";
    $("#momoHint").textContent = "Leave blank to use your contact phone. You'll get a prompt on it to approve with your PIN.";
  }
}

// Payment number, falling back to the contact phone.
const momoInput = () => form.momo.value.trim() || form.phone.value;

// Returns an error message, or "" if the number fits the chosen network.
function momoError() {
  const method = form.payment.value;
  if (!(method in NETWORKS)) return "";
  const msisdn = normalizeMsisdn(momoInput());
  if (!msisdn) return "Enter a valid Ugandan number, e.g. 0772 123 456.";
  const net = networkOf(msisdn);
  if (net !== method) {
    return net ? `That number is on ${NETWORKS[net].label}. Switch the payment option or enter a number on ${NETWORKS[method].label}.`
               : `That number isn't on ${NETWORKS[method].label}.`;
  }
  return "";
}

function updateTotal() {
  const service = findService($("#bookService").value);
  const home = form.where.value === "home";
  $("#addressWrap").hidden = !home;
  form.address.required = home;
  $("#bookTotal").textContent = ugx(service.price + (home ? HOME_FEE : 0));
}

function openBooking({ service, category, pro } = {}) {
  form.reset();
  $("#bookFields").hidden = false;
  $("#bookDone").hidden = true;
  $("#bookSubmit").textContent = "Confirm booking";

  const firstInCat = category && CATEGORIES.find(c => c.id === category)?.services[0].id;
  $("#bookService").value = service || firstInCat || "knotless";
  updateProOptions();
  if (pro) $("#bookPro").value = pro;

  const today = new Date();
  const iso = d => d.toISOString().slice(0, 10);
  $("#bookDate").min = iso(today);
  $("#bookDate").value = iso(new Date(today.getTime() + 86400000));

  updateTotal();
  updatePayment();
  modal.showModal();
}

document.addEventListener("click", e => {
  const trigger = e.target.closest("[data-book]");
  if (!trigger) return;
  e.preventDefault();
  closeMenu();
  openBooking(trigger.dataset);
});

$("#bookService").addEventListener("change", () => { updateProOptions(); updateTotal(); });
form.addEventListener("change", e => {
  if (e.target.name === "where") updateTotal();
  if (e.target.name === "payment") updatePayment();
});
form.momo.addEventListener("input", () => {
  form.momo.setCustomValidity("");
  $("#momoHint").classList.remove("error");
});
$("#closeModal").addEventListener("click", () => modal.close());

form.addEventListener("submit", async e => {
  if (!$("#bookDone").hidden) return; // second click on "Done" closes the dialog
  e.preventDefault();
  const err = momoError();
  form.momo.setCustomValidity(err);
  if (err) {
    $("#momoHint").textContent = err;
    $("#momoHint").classList.add("error");
  }
  if (!form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form));
  const service = findService(data.service);
  const booking = {
    ...data,
    serviceName: service.name,
    total: service.price + (data.where === "home" ? HOME_FEE : 0),
    reference: "RCL-" + Date.now().toString(36).toUpperCase(),
    createdAt: new Date().toISOString(),
  };

  let payLine = `Payment: ${PAYMENT_LABELS[data.payment]}`;
  if (data.payment in NETWORKS) {
    $("#bookSubmit").disabled = true;
    const msisdn = normalizeMsisdn(momoInput());
    booking.payment_request = await requestMobileMoneyPayment({
      network: data.payment, msisdn, amount: booking.total, reference: booking.reference,
    });
    $("#bookSubmit").disabled = false;
    payLine = `Check <strong>0${msisdn}</strong> for the ${NETWORKS[data.payment].label} prompt and enter your PIN to pay <strong>${ugx(booking.total)}</strong>. It's held until your service is done.`;
  }
  saveBooking(booking);

  const when = new Date(`${data.date}T${data.time}`).toLocaleString("en-UG", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  $("#bookSummary").innerHTML =
    `<strong>${service.name}</strong> with ${data.pro || "the next available pro"}<br>${when} · ${data.where === "home" ? "At your home" : "At the salon"}<br>Total: <strong>${ugx(booking.total)}</strong> · Ref ${booking.reference}<br>${payLine}<br><small>We'll confirm by SMS to ${data.phone}.</small>`;
  $("#bookFields").hidden = true;
  $("#bookDone").hidden = false;
  $("#bookSubmit").textContent = "Done";
});

function saveBooking(booking) {
  try {
    const list = JSON.parse(localStorage.getItem("reclain-bookings") || "[]");
    list.push(booking);
    localStorage.setItem("reclain-bookings", JSON.stringify(list));
  } catch { /* storage unavailable: booking still confirmed on screen */ }
}

// ---------- Search ----------
$("#heroSearch").addEventListener("submit", e => {
  e.preventDefault();
  const q = $("#searchService").value.trim().toLowerCase();
  const match = q && allServices.find(s => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
  if (match) {
    openBooking({ service: match.id });
  } else {
    renderCategory("hair");
    $("#services").scrollIntoView();
  }
});

// ---------- Join form ----------
$("#joinForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = e.target.name.value.trim().split(" ")[0];
  $("#joinMsg").textContent = `Thanks ${name}! Our partner team will call you within 48 hours.`;
  e.target.reset();
});

// ---------- Mobile menu ----------
const menuBtn = $("#menuToggle");
function closeMenu() {
  $("#navLinks").classList.remove("open");
  menuBtn.setAttribute("aria-expanded", "false");
}
menuBtn.addEventListener("click", () => {
  const open = $("#navLinks").classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
});
$("#navLinks").addEventListener("click", e => { if (e.target.matches("a")) closeMenu(); });

// ---------- Init ----------
$("#year").textContent = new Date().getFullYear();
renderTabs();
renderHairList();
renderPros();
fillSelects();
