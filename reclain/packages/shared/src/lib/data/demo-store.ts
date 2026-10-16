import "server-only";
// Demo mode: the whole back end in memory, seeded from seed-data.json.
// It follows the same rules as the database functions so the app behaves the same.
// Data resets when the server restarts. Nothing here is used once Supabase keys are set.

import seed from "./seed-data.json";
import { getSessionUser, DEMO_USERS, setDemoProfile } from "../auth";
import { slugify } from "../format";
import { SECURITY_CATEGORY, site } from "../../config/site";
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

export interface StoredBooking extends Omit<Booking, "business" | "staffName" | "hasReview"> {
  cancelledAt: string | null;
}

// A slow checkout can run a little past the lead time; create_booking() allows the same grace.
export const GRACE_MIN = site.leadGraceMinutes;

export interface Store {
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
  staffTallies: Record<string, { sum: number; count: number }>; // the same for each professional
}

export let counter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;
export const now = () => new Date().toISOString();

export function buildStore(): Store {
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
    staffTallies: {},
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
      tier: "registered",
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
        peopleNeeded: 1,
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
export function addSampleBookings(s: Store, now: Date = new Date()) {
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
      crewNames: [],
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

// A sample professional's rating stands for this many earlier reviews, so one new review
// nudges it instead of replacing it (the database migration uses the same number).
export const SAMPLE_STAFF_REVIEWS = 20;

// Keep one store across hot reloads in development.
export const g = globalThis as unknown as { __reclainDemo?: Store };
export const db = (): Store => (g.__reclainDemo ??= buildStore());

export async function me(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new DataError("auth", "Log in first.");
  return user;
}

export function withServiceNames(b: Business): Business {
  return { ...b, serviceNames: db().services.filter(s => s.businessId === b.id && s.active).map(s => s.name.toLowerCase()) };
}

export function detail(b: Business, activeOnly: boolean): BusinessDetail {
  const services = db()
    .services.filter(s => s.businessId === b.id && (!activeOnly || s.active))
    .sort((a, c) => a.sort - c.sort);
  const staff = db()
    .staff.filter(s => s.businessId === b.id && (!activeOnly || s.active))
    .sort((a, c) => a.sort - c.sort);
  return { ...b, services, staff };
}

export function hydrate(b: StoredBooking): Booking {
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
    crewNames: [],
  };
}

export const owns = (user: SessionUser, businessId: string) =>
  user.isAdmin || db().businesses.some(b => b.id === businessId && b.ownerId === user.id);

export const holding = (b: StoredBooking) =>
  b.status === "confirmed" || (b.status === "pending_payment" && (!b.expiresAt || b.expiresAt > now()));

export function releaseExpired(businessId: string) {
  for (const b of db().bookings) {
    if (b.businessId === businessId && b.status === "pending_payment" && b.expiresAt && b.expiresAt < now()) {
      b.status = "cancelled";
      b.cancelledAt = now();
      b.cancelledBy = "expired";
    }
  }
}

export function overlaps(staffId: string, start: string, end: string, exceptId?: string) {
  return db().bookings.some(b => b.id !== exceptId && b.staffId === staffId && holding(b) && b.startsAt < end && b.endsAt > start);
}

export function findBooking(id: string): StoredBooking {
  const b = db().bookings.find(x => x.id === id);
  if (!b) throw new DataError("not_found", "Booking not found.");
  return b;
}
