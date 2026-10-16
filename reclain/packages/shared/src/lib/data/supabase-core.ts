import "server-only";
import { getSessionUser } from "../auth";
import { safePalette } from "../format";
import { DataError, fromPostgrest } from "./errors";
import type {
  Booking,
  Business,
  BusinessDetail,
  BusinessInput,
  Payment,
  Review,
  Service,
  Staff,
} from "../types";

// ---------- Row mappers (database snake_case -> app camelCase) ----------
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

export const hhmm = (t: string | null) => (t ? t.slice(0, 5) : t);

export function mapBusiness(r: Row): Business {
  return {
    id: r.id,
    slug: r.slug,
    ownerId: r.owner_id,
    name: r.name,
    categoryId: r.category_id,
    areaId: r.area_id,
    blurb: r.blurb,
    address: r.address,
    phone: r.phone,
    visitMode: r.visit_mode,
    opensAt: hhmm(r.opens_at)!,
    closesAt: hhmm(r.closes_at)!,
    closedDays: r.closed_days ?? [],
    homeVisitFee: r.home_visit_fee,
    acceptsCash: r.accepts_cash,
    skipProfessional: r.skip_professional,
    coverWord: r.cover_word,
    palette: safePalette(r.palette),
    imageUrl: r.image_url,
    status: r.status,
    isFeatured: r.is_featured,
    isNew: r.is_new,
    ratingAvg: Number(r.rating_avg),
    ratingCount: r.rating_count,
    tier: r.tier ?? "registered",
    sort: r.sort,
    createdAt: r.created_at,
    serviceNames: Array.isArray(r.services) ? r.services.filter((s: Row) => s.active !== false).map((s: Row) => String(s.name).toLowerCase()) : undefined,
  };
}

export function mapService(r: Row): Service {
  return {
    id: r.id,
    businessId: r.business_id,
    groupName: r.group_name,
    name: r.name,
    description: r.description,
    durationMin: r.duration_min,
    durationLabel: r.duration_label,
    price: r.price,
    latestStart: hhmm(r.latest_start),
    peopleNeeded: r.people_needed ?? 1,
    sort: r.sort,
    active: r.active,
  };
}

export function mapStaff(r: Row): Staff {
  return { id: r.id, businessId: r.business_id, name: r.name, role: r.role, rating: Number(r.rating), sort: r.sort, active: r.active };
}

export function mapDetail(r: Row, activeOnly: boolean): BusinessDetail {
  const services = ((r.services ?? []) as Row[]).map(mapService).filter(s => !activeOnly || s.active);
  const staff = ((r.staff ?? []) as Row[]).map(mapStaff).filter(s => !activeOnly || s.active);
  services.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  staff.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  return { ...mapBusiness({ ...r, services: undefined }), services, staff };
}

export function mapReview(r: Row): Review {
  return {
    id: r.id,
    businessId: r.business_id,
    bookingId: r.booking_id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    authorName: r.author_name,
    authorArea: r.author_area,
    isSample: r.is_sample,
    createdAt: r.created_at,
  };
}

export const BOOKING_SELECT =
  "*, booking_items(*), businesses(id, slug, name, area_id, category_id, cover_word, palette, address, phone), staff(name), reviews(id)";

export function mapBooking(r: Row): Booking {
  const biz = r.businesses ?? {};
  const review = Array.isArray(r.reviews) ? r.reviews[0] : r.reviews;
  return {
    id: r.id,
    ref: r.ref,
    businessId: r.business_id,
    customerId: r.customer_id,
    staffId: r.staff_id,
    staffName: r.staff?.name ?? null,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    location: r.location,
    address: r.address,
    notes: r.notes,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    subtotal: r.subtotal,
    homeFee: r.home_fee,
    total: r.total,
    currency: r.currency,
    status: r.status,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    expiresAt: r.expires_at,
    reminderSentAt: r.reminder_sent_at,
    cancelledBy: r.cancelled_by ?? null,
    createdAt: r.created_at,
    items: ((r.booking_items ?? []) as Row[]).map(i => ({ id: i.id, serviceId: i.service_id, name: i.name, price: i.price, durationMin: i.duration_min })),
    // If the database hides the business (it was suspended before the customer could see it),
    // keep the page working with a plain stand-in rather than crashing.
    business: {
      id: biz.id ?? r.business_id,
      slug: biz.slug ?? "",
      name: biz.name ?? "This business",
      areaId: biz.area_id ?? "",
      categoryId: biz.category_id ?? "",
      coverWord: biz.cover_word ?? "",
      palette: safePalette(biz.palette),
      address: biz.address ?? "",
      phone: biz.phone ?? null,
    },
    crewNames: Array.isArray(r.booking_crew) ? r.booking_crew.map((c: Row) => c.staff?.name).filter(Boolean) : [],
    hasReview: !!review,
  };
}

export function mapPayment(r: Row): Payment {
  return {
    id: r.id,
    bookingId: r.booking_id,
    provider: r.provider,
    method: r.method,
    amount: r.amount,
    currency: r.currency,
    msisdn: r.msisdn,
    status: r.status,
    txRef: r.tx_ref,
    providerRef: r.provider_ref,
    checkoutUrl: r.checkout_url,
    createdAt: r.created_at,
  };
}

export function businessRow(input: Partial<BusinessInput>): Row {
  const row: Row = {};
  if (input.name !== undefined) row.name = input.name.trim();
  if (input.categoryId !== undefined) row.category_id = input.categoryId;
  if (input.areaId !== undefined) row.area_id = input.areaId;
  if (input.blurb !== undefined) row.blurb = input.blurb.trim();
  if (input.address !== undefined) row.address = input.address.trim();
  if (input.phone !== undefined) row.phone = input.phone;
  if (input.visitMode !== undefined) row.visit_mode = input.visitMode;
  if (input.opensAt !== undefined) row.opens_at = input.opensAt;
  if (input.closesAt !== undefined) row.closes_at = input.closesAt;
  if (input.closedDays !== undefined) row.closed_days = input.closedDays;
  if (input.homeVisitFee !== undefined) row.home_visit_fee = input.homeVisitFee;
  if (input.acceptsCash !== undefined) row.accepts_cash = input.acceptsCash;
  if (input.skipProfessional !== undefined) row.skip_professional = input.skipProfessional;
  if (input.coverWord !== undefined) row.cover_word = input.coverWord.trim().slice(0, 12);
  if (input.palette !== undefined) row.palette = input.palette;
  return row;
}

// Unwraps a Supabase response: throws a friendly DataError, or returns the rows.
export async function must<T = any>(p: PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>, fallback?: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw fromPostgrest(error, fallback);
  if (data === null || data === undefined) throw new DataError("not_found", fallback ?? "Not found.");
  return data as T;
}

export async function uid(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new DataError("auth", "Log in first.");
  return user.id;
}

// ---------- Implementation ----------