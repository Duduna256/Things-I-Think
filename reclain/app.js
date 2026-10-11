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
      { id: "massage", icon: "🌿", name: "Massage", desc: "Swedish or deep tissue, at home.", price: 80000, duration: "1 hr" },
    ]
  },
  {
    id: "cleaning", name: "Cleaning", services: [
      { id: "home-clean", icon: "🧽", name: "Home cleaning", desc: "Full clean for apartments and houses.", price: 70000, duration: "3–4 hrs" },
      { id: "laundry", icon: "👕", name: "Laundry & ironing", desc: "Pickup, wash, iron and delivery.", price: 30000, duration: "Next day" },
      { id: "sofa", icon: "🛋️", name: "Sofa & carpet cleaning", desc: "Deep steam clean and stain removal.", price: 90000, duration: "2–3 hrs" },
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
  { name: "Peter Ssali", initials: "PS", role: "Home cleaning team lead", rating: 4.7, reviews: 389, area: "Wakiso", color: "#3b6ea5", category: "cleaning", tags: ["Deep clean", "Sofa"] },
  { name: "Moses Kato", initials: "MK", role: "Electrician & handyman", rating: 4.8, reviews: 276, area: "Mukono", color: "#555", category: "repairs", tags: ["Electrical", "Plumbing"] },
];

const HOME_FEE = 10000;
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
form.addEventListener("change", e => { if (e.target.name === "where") updateTotal(); });
$("#closeModal").addEventListener("click", () => modal.close());

form.addEventListener("submit", e => {
  if (!$("#bookDone").hidden) return; // second click on "Done" closes the dialog
  e.preventDefault();
  if (!form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form));
  const service = findService(data.service);
  const booking = {
    ...data,
    serviceName: service.name,
    total: service.price + (data.where === "home" ? HOME_FEE : 0),
    createdAt: new Date().toISOString(),
  };
  saveBooking(booking);

  const when = new Date(`${data.date}T${data.time}`).toLocaleString("en-UG", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  $("#bookSummary").innerHTML =
    `<strong>${service.name}</strong> with ${data.pro || "the next available pro"}<br>${when} · ${data.where === "home" ? "At your home" : "At the salon"}<br>Total: <strong>${ugx(booking.total)}</strong><br><small>We'll confirm by SMS to ${data.phone}.</small>`;
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
