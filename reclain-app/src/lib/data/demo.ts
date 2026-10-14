import "server-only";
// Demo mode: the whole back end in memory, seeded from seed-data.json.
// It follows the same rules as the database functions so the app behaves the same.
// Data resets when the server restarts. Nothing here is used once Supabase keys are set.

import seed from "./seed-data.json";
import { getSessionUser, DEMO_USERS, setDemoProfile } from "../auth";
import { slugify } from "../format";
import { site } from "../../config/site";
import { features } from "../../config/features";
import { latestStart, priceBooking, effectiveLocation } from "../booking/rules";
import { addDays, localParts, parseHHMM, toInstant, todayLocal } from "../time";
import { DataError } from "./errors";
import { applyFilter } from "./search";
import type { DataSource, ServiceIndexEntry } from "./source";
import type {
  Area,
  Booking,
  BookingStatus,
  Business,
  BusinessDetail,
  Category,
  Payment,
  Review,
  ReviewWithBusiness,
  Service,
  SessionUser,
  Staff,
} from "../types";

interface StoredBooking extends Omit<Booking, "business" | "staffName" | "hasReview"> {
  cancelledAt: string | null;
}

// A slow checkout can run a little past the lead time; create_booking() allows the same grace.
const GRACE_MIN = site.leadGraceMinutes;

interface Store {
  categories: Category[];
  areas: Area[];
  businesses: Business[];
  services: Service[];
  staff: Staff[];
  bookings: StoredBooking[];
  payments: Payment[];
  reviews: Review[];
  profiles: Record<string, { fullName: string | null; phone: string | null }>;
  sms: unknown[];
  ratingSums: Record<string, number>; // exact totals behind each rounded average
}

let counter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;
const now = () => new Date().toISOString();

function buildStore(): Store {
  const s: Store = {
    categories: seed.categories,
    areas: seed.areas,
    businesses: [],
    services: [],
    staff: [],
    bookings: [],
    payments: [],
    reviews: [],
    profiles: {},
    sms: [],
    ratingSums: {},
  };
  for (const b of seed.businesses) {
    const id = `biz-${b.slug}`;
    s.businesses.push({
      id,
      slug: b.slug,
      // The demo business owner runs The Braid Republic.
      ownerId: b.slug === "braid-republic" ? DEMO_USERS.provider.id : null,
      name: b.name,
      categoryId: b.categoryId,
      areaId: b.areaId,
      blurb: b.blurb,
      address: "",
      phone: b.slug === "braid-republic" ? DEMO_USERS.provider.phone : null,
      visitMode: b.visitMode as Business["visitMode"],
      opensAt: b.opensAt,
      closesAt: b.closesAt,
      closedDays: b.closedDays,
      homeVisitFee: b.homeVisitFee,
      acceptsCash: b.acceptsCash,
      skipProfessional: b.skipProfessional,
      coverWord: b.coverWord,
      palette: b.palette as [string, string, string],
      imageUrl: null,
      status: "published",
      isFeatured: b.isFeatured,
      isNew: b.isNew,
      ratingAvg: b.ratingAvg,
      ratingCount: b.ratingCount,
      sort: b.sort,
      createdAt: "2026-10-01T00:00:00Z",
    });
    for (const sv of b.services) {
      s.services.push({
        id: `svc-${b.slug}-${sv.key}`,
        businessId: id,
        groupName: sv.groupName,
        name: sv.name,
        description: sv.description,
        durationMin: sv.durationMin,
        durationLabel: sv.durationLabel,
        price: sv.price,
        latestStart: sv.latestStart ?? null,
        sort: sv.sort,
        active: true,
      });
    }
    for (const st of b.staff) {
      s.staff.push({ id: `staff-${b.slug}-${st.sort}`, businessId: id, name: st.name, role: st.role, rating: st.rating, sort: st.sort, active: true });
    }
  }
  for (const r of seed.reviews) {
    s.reviews.push({
      id: `review-${r.businessSlug}-${r.authorName}`,
      businessId: `biz-${r.businessSlug}`,
      bookingId: null,
      rating: r.rating,
      title: r.title,
      body: r.body,
      authorName: r.authorName,
      authorArea: r.authorArea,
      isSample: true,
      createdAt: "2026-10-01T00:00:00Z",
    });
  }
  // One application waiting for the admin, so the approval screen has something to show.
  s.businesses.push({
    ...s.businesses[0],
    id: "biz-nile-nails",
    slug: "nile-nails",
    ownerId: "demo-applicant",
    name: "Nile Nails Studio",
    categoryId: "nails",
    areaId: "ntinda",
    blurb: "Gel, acrylic and nail art two minutes from Ntinda Shopping Centre.",
    phone: "701234567",
    visitMode: "salon",
    coverWord: "nails",
    palette: ["#3d1430", "#c2447a", "#ffc9da"],
    status: "pending",
    isFeatured: false,
    isNew: true,
    ratingAvg: 0,
    ratingCount: 0,
    sort: 99,
  });
  addSampleBookings(s);
  return s;
}

// A few days of bookings at The Braid Republic, so the owner's dashboard has something in it
// and Grace has a past booking to review. Times are around today in Kampala.
function addSampleBookings(s: Store, now: Date = new Date()) {
  const bizId = "biz-braid-republic";
  const biz = s.businesses.find(b => b.id === bizId);
  if (!biz) return;
  const svc = (key: string) => s.services.find(x => x.id === `svc-braid-republic-${key}`);
  const staff = (i: number) => `staff-braid-republic-${i}`;
  const today = todayLocal(now);
  type Plan = [day: number, start: string, pro: number, services: string[], who: string, phone: string, pay: Booking["paymentMethod"], extra?: Partial<StoredBooking>];
  const plans: Plan[] = [
    [-3, "09:00", 0, ["knotless"], "grace", "", "mtn"],
    [-3, "10:00", 2, ["locs-retwist"], "Brian Ssekandi", "783445566", "cash"],
    [-2, "08:30", 1, ["twists"], "Patience Akello", "704556677", "airtel"],
    [-2, "14:00", 2, ["cornrows"], "Daniel Mugisha", "772334455", "cash", { status: "no_show" }],
    [-1, "11:00", 0, ["boho"], "Sandra Namuli", "756112233", "card"],
    [-1, "15:00", 1, ["wash-blow"], "Esther Atim", "701223344", "mtn", { status: "cancelled", cancelledBy: "customer" }],
    [0, "08:00", 1, ["cornrows"], "Ruth Nabirye", "778990011", "cash"],
    [0, "10:00", 0, ["knotless"], "Faith Kyomuhendo", "759334411", "mtn", { location: "home", address: "Plot 14, Kigoowa Road, Ntinda" }],
    [0, "13:30", 2, ["starter-locs"], "Ivan Okello", "740778899", "cash", { notes: "First time with locs, a bit nervous." }],
    [0, "16:00", 1, ["wash-blow", "cornrows"], "Martha Nalwoga", "752667788", "airtel"],
    [1, "09:30", 2, ["locs-retwist"], "Joel Byaruhanga", "781556644", "card"],
    [1, "12:00", 0, ["twists"], "Diana Kisakye", "703887766", "cash"],
    [2, "10:00", 0, ["boho"], "grace", "", "cash", { notes: "Mid-back length, colour 1B please." }],
    [3, "14:00", 1, ["knotless"], "Annet Nakimuli", "774112299", "mtn"],
  ];
  plans.forEach(([day, start, pro, keys, who, phone, pay, extra], i) => {
    const services = keys.map(svc).filter((x): x is Service => !!x);
    if (!services.length) return;
    const date = addDays(today, day);
    const location = extra?.location ?? "venue";
    const price = priceBooking(biz, services, location);
    const startAt = toInstant(date, parseHHMM(start));
    const endAt = new Date(startAt.getTime() + price.blockMin * 60_000);
    const isGrace = who === "grace";
    const past = endAt.getTime() < now.getTime();
    const status: BookingStatus = extra?.status ?? (past ? "completed" : "confirmed");
    const paid = status === "completed" || (pay !== "cash" && status === "confirmed");
    s.bookings.push({
      id: `bk-sample-${i + 1}`,
      ref: `RCL-S${String(i + 1).padStart(2, "0")}${["K", "M", "T", "Q"][i % 4]}X`,
      businessId: bizId,
      customerId: isGrace ? DEMO_USERS.customer.id : `demo-guest-${i + 1}`,
      staffId: staff(pro),
      startsAt: startAt.toISOString(),
      endsAt: endAt.toISOString(),
      location,
      address: extra?.address ?? "",
      notes: extra?.notes ?? "",
      customerName: isGrace ? DEMO_USERS.customer.fullName! : who,
      customerPhone: isGrace ? DEMO_USERS.customer.phone! : phone,
      subtotal: price.subtotal,
      homeFee: price.homeFee,
      total: price.total,
      currency: site.currency,
      status,
      paymentMethod: pay,
      paymentStatus: status === "cancelled" ? (pay === "cash" ? "unpaid" : "refunded") : paid || (status === "no_show" && pay !== "cash") ? "paid" : "unpaid",
      expiresAt: null,
      reminderSentAt: null,
      cancelledAt: status === "cancelled" ? new Date(startAt.getTime() - 86_400_000).toISOString() : null,
      cancelledBy: status === "cancelled" ? (extra?.cancelledBy ?? "customer") : null,
      createdAt: new Date(startAt.getTime() - 3 * 86_400_000).toISOString(),
      items: services.map(x => ({ id: `item-sample-${i + 1}-${x.id}`, serviceId: x.id, name: x.name, price: x.price, durationMin: x.durationMin })),
    });
  });
}

// Keep one store across hot reloads in development.
const g = globalThis as unknown as { __reclainDemo?: Store };
const db = (): Store => (g.__reclainDemo ??= buildStore());

async function me(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new DataError("auth", "Log in first.");
  return user;
}

function withServiceNames(b: Business): Business {
  return { ...b, serviceNames: db().services.filter(s => s.businessId === b.id && s.active).map(s => s.name.toLowerCase()) };
}

function detail(b: Business, activeOnly: boolean): BusinessDetail {
  const services = db()
    .services.filter(s => s.businessId === b.id && (!activeOnly || s.active))
    .sort((a, c) => a.sort - c.sort);
  const staff = db()
    .staff.filter(s => s.businessId === b.id && (!activeOnly || s.active))
    .sort((a, c) => a.sort - c.sort);
  return { ...b, services, staff };
}

function hydrate(b: StoredBooking): Booking {
  const biz = db().businesses.find(x => x.id === b.businessId)!;
  return {
    ...b,
    staffName: db().staff.find(s => s.id === b.staffId)?.name ?? null,
    business: {
      id: biz.id,
      slug: biz.slug,
      name: biz.name,
      areaId: biz.areaId,
      categoryId: biz.categoryId,
      coverWord: biz.coverWord,
      palette: biz.palette,
      address: biz.address,
      phone: biz.phone,
    },
    hasReview: db().reviews.some(r => r.bookingId === b.id),
  };
}

const owns = (user: SessionUser, businessId: string) =>
  user.isAdmin || db().businesses.some(b => b.id === businessId && b.ownerId === user.id);

const holding = (b: StoredBooking) =>
  b.status === "confirmed" || (b.status === "pending_payment" && (!b.expiresAt || b.expiresAt > now()));

function releaseExpired(businessId: string) {
  for (const b of db().bookings) {
    if (b.businessId === businessId && b.status === "pending_payment" && b.expiresAt && b.expiresAt < now()) {
      b.status = "cancelled";
      b.cancelledAt = now();
      b.cancelledBy = "expired";
    }
  }
}

function overlaps(staffId: string, start: string, end: string, exceptId?: string) {
  return db().bookings.some(b => b.id !== exceptId && b.staffId === staffId && holding(b) && b.startsAt < end && b.endsAt > start);
}

function findBooking(id: string): StoredBooking {
  const b = db().bookings.find(x => x.id === id);
  if (!b) throw new DataError("not_found", "Booking not found.");
  return b;
}

export const demoSource: DataSource = {
  mode: "demo",

  async listCategories() {
    return [...db().categories].sort((a, b) => a.sort - b.sort);
  },
  async listAreas() {
    return [...db().areas].sort((a, b) => a.sort - b.sort);
  },
  async listBusinesses(filter = {}) {
    const published = db().businesses.filter(b => b.status === "published").map(withServiceNames);
    return applyFilter(published, filter, db().categories, db().areas);
  },
  async getBusinessBySlug(slug) {
    const b = db().businesses.find(x => x.slug === slug && x.status === "published");
    return b ? detail(b, true) : null;
  },
  async listReviews(opts = {}) {
    const list = db()
      .reviews.filter(r => !opts.businessId || r.businessId === opts.businessId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, opts.limit ?? 100);
    return list.map((r): ReviewWithBusiness => {
      const b = db().businesses.find(x => x.id === r.businessId)!;
      return { ...r, business: { slug: b.slug, name: b.name, palette: b.palette } };
    });
  },
  async listServiceIndex() {
    const published = new Set(db().businesses.filter(b => b.status === "published").map(b => b.id));
    return db()
      .services.filter(sv => sv.active && published.has(sv.businessId))
      .map((sv): ServiceIndexEntry => ({ businessId: sv.businessId, name: sv.name, price: sv.price }));
  },
  async getBusySlots(businessId, fromIso, toIso) {
    return db()
      .bookings.filter(b => b.businessId === businessId && holding(b) && b.startsAt < toIso && b.endsAt > fromIso)
      .map(b => ({ staffId: b.staffId, startsAt: b.startsAt, endsAt: b.endsAt }));
  },

  // ---- Customer ----
  async getMyProfile() {
    const user = await getSessionUser();
    if (!user) return null;
    const p = db().profiles[user.id];
    return { ...user, ...(p ?? {}) };
  },
  async updateMyProfile(patch) {
    const user = await me();
    db().profiles[user.id] = { fullName: patch.fullName.trim(), phone: patch.phone };
    setDemoProfile(user.id, { fullName: patch.fullName.trim(), phone: patch.phone });
    return { ...user, fullName: patch.fullName.trim(), phone: patch.phone };
  },

  async createBooking(input) {
    const user = await me();
    // Same limits as create_booking() in the database.
    const mine = db().bookings.filter(b => b.customerId === user.id);
    if (mine.filter(b => holding(b) && b.startsAt > now()).length >= 6) {
      throw new DataError("invalid", "You already have 6 upcoming bookings. Cancel one, or wait until one is done, to book another.");
    }
    if (mine.filter(b => b.createdAt > new Date(Date.now() - 86_400_000).toISOString()).length >= 10) {
      throw new DataError("invalid", "That's a lot of bookings for one day. Try again tomorrow, or call the venue.");
    }
    const biz = db().businesses.find(b => b.id === input.businessId && b.status === "published");
    if (!biz) throw new DataError("not_found", "This venue is not taking bookings.");
    if (!input.serviceIds.length) throw new DataError("invalid", "Pick at least one service.");
    const ids = [...new Set(input.serviceIds)];
    const services = db().services.filter(s => ids.includes(s.id) && s.businessId === biz.id && s.active);
    if (services.length !== ids.length) throw new DataError("invalid", "One of those services is no longer available.");

    const location = effectiveLocation(biz.visitMode, input.location);
    if (location === "home" && !input.address.trim()) throw new DataError("invalid", "Add the address where the pro should come.");
    const price = priceBooking(biz, services, location);
    // Nothing to pay: confirmed straight away, like cash.
    const method = price.total === 0 ? "cash" : input.paymentMethod;
    if (method === "cash" && price.total > 0 && !biz.acceptsCash) throw new DataError("invalid", "This venue does not take cash.");
    const start = new Date(input.startsAt);
    const end = new Date(start.getTime() + price.blockMin * 60_000);
    if (start.getTime() < Date.now()) throw new DataError("invalid", "That time has already passed.");
    const ls = localParts(start);
    const le = localParts(end);
    if (biz.closedDays.includes(ls.weekday)) throw new DataError("invalid", "The venue is closed that day.");
    if (ls.minutes < parseHHMM(biz.opensAt) || le.date !== ls.date || le.minutes > parseHHMM(biz.closesAt)) {
      throw new DataError("invalid", "That time is outside opening hours.");
    }
    if (start.getTime() < Date.now() + Math.max(site.minLeadMinutes - GRACE_MIN, 0) * 60_000) {
      throw new DataError("invalid", "That time is too soon. Pick a later slot.");
    }
    if (ls.date >= addDays(todayLocal(), site.bookingWindowDays)) {
      throw new DataError("invalid", `Pick a day in the next ${site.bookingWindowDays} days.`);
    }
    if (start.getUTCSeconds() !== 0 || start.getUTCMilliseconds() !== 0 || (ls.minutes - parseHHMM(biz.opensAt)) % site.slotStepMinutes !== 0) {
      throw new DataError("invalid", "Pick one of the times shown.");
    }
    const cutoff = latestStart(services);
    if (cutoff !== null && ls.minutes > cutoff) throw new DataError("invalid", "One of those services has to start earlier in the day.");

    releaseExpired(biz.id);
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const team = db().staff.filter(s => s.businessId === biz.id && s.active).sort((a, b) => a.sort - b.sort);
    let staffId: string | undefined;
    if (input.staffId) {
      if (!team.some(s => s.id === input.staffId)) throw new DataError("invalid", "That professional is not available.");
      if (overlaps(input.staffId, startIso, endIso)) throw new DataError("conflict", "That slot was just taken. Pick another time.");
      staffId = input.staffId;
    } else {
      staffId = team.find(s => !overlaps(s.id, startIso, endIso))?.id;
      if (!staffId) throw new DataError("conflict", "That slot was just taken. Pick another time.");
    }

    const cash = method === "cash";
    const id = newId("bk");
    const stored: StoredBooking = {
      id,
      ref: "RCL-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      businessId: biz.id,
      customerId: user.id,
      staffId,
      startsAt: startIso,
      endsAt: endIso,
      location,
      address: location === "home" ? input.address.trim() : "",
      notes: input.notes.slice(0, 500),
      customerName: input.customerName.trim().slice(0, 80),
      customerPhone: input.customerPhone,
      subtotal: price.subtotal,
      homeFee: price.homeFee,
      total: price.total,
      currency: site.currency,
      status: cash ? "confirmed" : "pending_payment",
      paymentMethod: method,
      paymentStatus: "unpaid",
      expiresAt: cash ? null : new Date(Date.now() + site.pendingPaymentMinutes * 60_000).toISOString(),
      reminderSentAt: null,
      cancelledAt: null,
      cancelledBy: null,
      createdAt: now(),
      items: services.map(s => ({ id: newId("item"), serviceId: s.id, name: s.name, price: s.price, durationMin: s.durationMin })),
    };
    db().bookings.push(stored);
    return hydrate(stored);
  },

  async listMyBookings() {
    const user = await me();
    return db()
      .bookings.filter(b => b.customerId === user.id)
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
      .map(hydrate);
  },
  async getBooking(id) {
    const user = await getSessionUser();
    const b = db().bookings.find(x => x.id === id);
    if (!b || !user || (b.customerId !== user.id && !owns(user, b.businessId))) return null;
    return hydrate(b);
  },
  async cancelBooking(id) {
    const user = await me();
    const b = findBooking(id);
    const isOwner = db().businesses.some(x => x.id === b.businessId && x.ownerId === user.id);
    const by = isOwner ? "venue" : user.isAdmin ? "admin" : b.customerId === user.id ? "customer" : null;
    if (!by) throw new DataError("not_found", "Booking not found.");
    if (b.status !== "pending_payment" && b.status !== "confirmed") throw new DataError("invalid", "This booking can no longer be cancelled.");
    if (by === "customer" && b.startsAt <= now()) {
      throw new DataError("invalid", "This booking has already started. Call the venue if something is wrong.");
    }
    b.status = "cancelled";
    b.cancelledAt = now();
    b.cancelledBy = by;
    return hydrate(b);
  },
  async createReview(input) {
    const user = await me();
    const b = findBooking(input.bookingId);
    if (b.customerId !== user.id) throw new DataError("not_found", "Booking not found.");
    if (db().businesses.some(x => x.id === b.businessId && x.ownerId === user.id)) {
      throw new DataError("forbidden", "You can't review your own business.");
    }
    if (b.status !== "completed") throw new DataError("forbidden", "You can review a booking once it's completed.");
    if (db().reviews.some(r => r.bookingId === b.id)) throw new DataError("conflict", "You've already reviewed this booking.");
    const parts = (user.fullName?.trim() || "A customer").split(/\s+/);
    const review: Review = {
      id: newId("rv"),
      businessId: b.businessId,
      bookingId: b.id,
      rating: Math.max(1, Math.min(5, Math.round(input.rating))),
      title: input.title.trim().slice(0, 80),
      body: input.body.trim().slice(0, 600),
      authorName: parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0],
      authorArea: db().areas.find(a => a.id === db().businesses.find(x => x.id === b.businessId)?.areaId)?.name ?? "",
      isSample: false,
      createdAt: now(),
    };
    db().reviews.push(review);
    const biz = db().businesses.find(x => x.id === b.businessId)!;
    // Keep the exact total, so every review moves the average (rounding each time would freeze it).
    const sum = (db().ratingSums[biz.id] ?? biz.ratingAvg * biz.ratingCount) + review.rating;
    db().ratingSums[biz.id] = sum;
    biz.ratingCount += 1;
    biz.ratingAvg = Math.round((sum / biz.ratingCount) * 10) / 10;
    return review;
  },

  // ---- Business owner ----
  async getMyBusinesses() {
    const user = await me();
    return db().businesses.filter(b => b.ownerId === user.id);
  },
  async getMyBusiness(id) {
    const user = await me();
    const b = db().businesses.find(x => x.id === id && x.ownerId === user.id);
    return b ? detail(b, false) : null;
  },
  async createBusiness(input, ownerName) {
    const user = await me();
    const base = slugify(input.slug || input.name) || "venue";
    let slug = base;
    while (db().businesses.some(b => b.slug === slug)) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const b: Business = {
      id: newId("biz"),
      slug,
      ownerId: user.id,
      name: input.name.trim(),
      categoryId: input.categoryId,
      areaId: input.areaId,
      blurb: input.blurb.trim(),
      address: input.address.trim(),
      phone: input.phone,
      visitMode: input.visitMode,
      opensAt: input.opensAt,
      closesAt: input.closesAt,
      closedDays: input.closedDays,
      homeVisitFee: input.homeVisitFee,
      acceptsCash: input.acceptsCash,
      skipProfessional: input.skipProfessional,
      coverWord: input.coverWord.trim().slice(0, 12),
      palette: input.palette,
      imageUrl: null,
      status: "draft",
      isFeatured: false,
      isNew: true,
      ratingAvg: 0,
      ratingCount: 0,
      sort: 50,
      createdAt: now(),
    };
    if (parseHHMM(b.closesAt) <= parseHHMM(b.opensAt)) throw new DataError("invalid", "Closing time must be after opening time.");
    db().businesses.push(b);
    db().staff.push({ id: newId("staff"), businessId: b.id, name: ownerName.trim() || "Owner", role: "Owner", rating: 5, sort: 0, active: true });
    return b;
  },
  async updateBusiness(id, patch) {
    const user = await me();
    const b = db().businesses.find(x => x.id === id && (x.ownerId === user.id || user.isAdmin));
    if (!b) throw new DataError("not_found", "Business not found.");
    const next = { ...b, ...patch, coverWord: (patch.coverWord ?? b.coverWord).slice(0, 12) };
    if (parseHHMM(next.closesAt) <= parseHHMM(next.opensAt)) throw new DataError("invalid", "Closing time must be after opening time.");
    Object.assign(b, next);
    return b;
  },
  async submitBusinessForReview(id) {
    const user = await me();
    const b = db().businesses.find(x => x.id === id && x.ownerId === user.id);
    if (!b || b.status !== "draft") throw new DataError("invalid", "Only a draft can be sent for review.");
    // With approval switched off, owners publish straight away.
    b.status = features.businessApproval ? "pending" : "published";
    return b;
  },
  async upsertService(businessId, input) {
    const user = await me();
    if (!owns(user, businessId)) throw new DataError("forbidden", "You don't have access to that.");
    const fields = {
      groupName: input.groupName.trim() || "Services",
      name: input.name.trim(),
      description: input.description.trim(),
      durationMin: input.durationMin,
      durationLabel: input.durationLabel?.trim() || null,
      price: input.price,
      latestStart: input.latestStart || null,
      active: input.active,
    };
    if (input.id) {
      const s = db().services.find(x => x.id === input.id && x.businessId === businessId);
      if (!s) throw new DataError("not_found", "Service not found.");
      Object.assign(s, fields, input.sort !== undefined ? { sort: input.sort } : {});
      return s;
    }
    const s: Service = { id: newId("svc"), businessId, sort: input.sort ?? db().services.filter(x => x.businessId === businessId).length, ...fields };
    db().services.push(s);
    return s;
  },
  async deleteService(id) {
    const user = await me();
    const s = db().services.find(x => x.id === id);
    if (!s || !owns(user, s.businessId)) throw new DataError("not_found", "Service not found.");
    db().services = db().services.filter(x => x.id !== id);
  },
  async upsertStaff(businessId, input) {
    const user = await me();
    if (!owns(user, businessId)) throw new DataError("forbidden", "You don't have access to that.");
    if (input.id) {
      const s = db().staff.find(x => x.id === input.id && x.businessId === businessId);
      if (!s) throw new DataError("not_found", "Team member not found.");
      Object.assign(s, { name: input.name.trim(), role: input.role.trim(), active: input.active }, input.sort !== undefined ? { sort: input.sort } : {});
      return s;
    }
    const s: Staff = {
      id: newId("staff"),
      businessId,
      name: input.name.trim(),
      role: input.role.trim(),
      rating: 5,
      sort: input.sort ?? db().staff.filter(x => x.businessId === businessId).length,
      active: input.active,
    };
    db().staff.push(s);
    return s;
  },
  async deleteStaff(id) {
    const user = await me();
    const s = db().staff.find(x => x.id === id);
    if (!s || !owns(user, s.businessId)) throw new DataError("not_found", "Team member not found.");
    db().staff = db().staff.filter(x => x.id !== id);
    for (const b of db().bookings) if (b.staffId === id) b.staffId = null;
  },
  async listBusinessBookings(businessId, opts = {}) {
    const user = await me();
    if (!owns(user, businessId)) throw new DataError("forbidden", "You don't have access to that.");
    return db()
      .bookings.filter(
        b =>
          b.businessId === businessId &&
          (!opts.fromIso || b.startsAt >= opts.fromIso) &&
          (!opts.toIso || b.startsAt < opts.toIso) &&
          (!opts.status?.length || opts.status.includes(b.status)),
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map(hydrate);
  },
  async setBookingStatus(id, status) {
    const user = await me();
    const b = findBooking(id);
    if (!owns(user, b.businessId)) throw new DataError("not_found", "Booking not found.");
    const closed: BookingStatus[] = ["completed", "cancelled", "no_show"];
    if (closed.includes(b.status) && status !== b.status) throw new DataError("invalid", "This booking is already closed.");
    if (status === "confirmed" && b.status !== "pending_payment") throw new DataError("invalid", "Only an unpaid booking can be confirmed.");
    if ((status === "completed" || status === "no_show") && b.startsAt > now()) throw new DataError("invalid", "This booking hasn't started yet.");
    b.status = status;
    if (status === "cancelled") {
      b.cancelledAt = now();
      b.cancelledBy = db().businesses.some(x => x.id === b.businessId && x.ownerId === user.id) ? "venue" : "admin";
    }
    if (status === "confirmed") b.expiresAt = null;
    return hydrate(b);
  },
  async markCashPaid(id) {
    const user = await me();
    const b = findBooking(id);
    if (!owns(user, b.businessId)) throw new DataError("not_found", "Booking not found.");
    if (b.paymentMethod !== "cash") throw new DataError("invalid", "Only cash bookings are marked paid by hand.");
    if (b.status === "cancelled") throw new DataError("invalid", "This booking was cancelled.");
    b.paymentStatus = "paid";
    return hydrate(b);
  },

  // ---- Admin ----
  async listBusinessesForAdmin(status) {
    const user = await me();
    if (!user.isAdmin) throw new DataError("forbidden", "Admins only.");
    return db()
      .businesses.filter(b => !status || b.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async setBusinessStatus(id, status) {
    const user = await me();
    if (!user.isAdmin) throw new DataError("forbidden", "Admins only.");
    const b = db().businesses.find(x => x.id === id);
    if (!b) throw new DataError("not_found", "Business not found.");
    b.status = status;
    return b;
  },

  // ---- Server jobs ----
  server: {
    async getBooking(id) {
      const b = db().bookings.find(x => x.id === id);
      return b ? hydrate(b) : null;
    },
    async createPayment(input) {
      const p: Payment = { id: newId("pay"), currency: site.currency, status: "pending", createdAt: now(), ...input };
      db().payments.push(p);
      const b = db().bookings.find(x => x.id === input.bookingId);
      if (b && (b.paymentStatus === "unpaid" || b.paymentStatus === "failed")) b.paymentStatus = "pending";
      return p;
    },
    async getPaymentByTxRef(txRef) {
      return db().payments.find(p => p.txRef === txRef) ?? null;
    },
    async listPaymentsForBooking(bookingId) {
      return db().payments.filter(p => p.bookingId === bookingId).reverse();
    },
    // Same rules as record_payment_result() in the database.
    async applyPaymentResult(input) {
      const p = db().payments.find(x => x.txRef === input.txRef);
      if (!p) throw new DataError("not_found", "Unknown payment reference.");
      if (input.status === "paid" && input.amount !== p.amount) throw new DataError("invalid", "Paid amount does not match the booking.");
      const b = findBooking(p.bookingId);
      // Settled already (webhooks repeat): nothing changes.
      if (p.status === "paid") return { booking: hydrate(b), becamePaid: false };
      // The same answer again: nothing to do.
      if (p.status === input.status) return { booking: hydrate(b), becamePaid: false };
      const wasPaid = b.paymentStatus === "paid";
      const otherWaiting = db().payments.some(x => x.bookingId === b.id && x.id !== p.id && x.status === "pending");
      p.status = input.status;
      p.providerRef = input.providerRef || p.providerRef;
      // Once paid, a late "failed" from another attempt doesn't undo it.
      if (!wasPaid && (input.status === "paid" || !otherWaiting)) b.paymentStatus = input.status;
      // Paying revives a hold that ran out, but never a booking someone cancelled.
      const revivable = b.status === "pending_payment" || (b.status === "cancelled" && b.cancelledBy === "expired");
      if (input.status === "paid" && revivable) {
        // Paid too late and the slot went to someone else: keep it cancelled, money recorded for a refund.
        const clash = b.staffId ? overlaps(b.staffId, b.startsAt, b.endsAt, b.id) : false;
        if (!clash) {
          b.status = "confirmed";
          b.expiresAt = null;
          if (b.cancelledBy === "expired") {
            b.cancelledAt = null;
            b.cancelledBy = null;
          }
        }
      }
      if (input.status === "paid") b.expiresAt = null;
      return { booking: hydrate(b), becamePaid: input.status === "paid" && !wasPaid && b.status === "confirmed" };
    },
    async listRemindersDue(fromIso, toIso) {
      return db()
        .bookings.filter(b => b.status === "confirmed" && !b.reminderSentAt && b.startsAt >= fromIso && b.startsAt < toIso)
        .map(hydrate);
    },
    async countBookingsSince(fromIso) {
      return db().bookings.filter(b => b.createdAt >= fromIso).length;
    },
    async claimReminder(bookingId) {
      const b = findBooking(bookingId);
      if (b.reminderSentAt) return false;
      b.reminderSentAt = now();
      return true;
    },
    async releaseReminder(bookingId) {
      findBooking(bookingId).reminderSentAt = null;
    },
    async logSms(entry) {
      db().sms.push({ ...entry, createdAt: now() });
    },
  },
};
