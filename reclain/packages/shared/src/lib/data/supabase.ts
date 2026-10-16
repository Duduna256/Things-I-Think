import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import { getSessionUser } from "../auth";
import { safePalette, slugify } from "../format";
import { features } from "../../config/features";
import { DataError, fromPostgrest } from "./errors";
import { applyFilter } from "./search";
import type { DataSource } from "./source";
import type {
  Area,
  Category,
  Profile,
  ReviewWithBusiness,
} from "../types";
import { Row, mapBusiness, mapService, mapStaff, mapDetail, mapReview, BOOKING_SELECT, mapBooking, mapPayment, businessRow, must, uid } from "./supabase-core";

import { supabaseBooks } from "./supabase-books";
import { supabaseCapacity } from "./supabase-capacity";
import { supabaseJobs } from "./supabase-jobs";
import { supabaseVerification } from "./supabase-verification";

export const supabaseSource: DataSource = {
  mode: "supabase",
  capacity: supabaseCapacity,
  jobs: supabaseJobs,
  books: supabaseBooks,
  verification: supabaseVerification,

  async listCategories() {
    const sb = await createClient();
    const rows = await must(sb.from("categories").select("*").order("sort"));
    return rows.map((r: Row): Category => ({ id: r.id, name: r.name, icon: r.icon, isNew: r.is_new, sort: r.sort }));
  },

  async listAreas() {
    const sb = await createClient();
    const rows = await must(sb.from("areas").select("*").order("sort"));
    return rows.map((r: Row): Area => ({ id: r.id, name: r.name, region: r.region, sort: r.sort }));
  },

  async listBusinesses(filter = {}) {
    const sb = await createClient();
    let q = sb.from("businesses").select("*, services(name, active)").eq("status", "published");
    if (filter.categoryId) q = q.eq("category_id", filter.categoryId);
    if (filter.areaId) q = q.eq("area_id", filter.areaId);
    if (filter.featured) q = q.eq("is_featured", true);
    if (filter.isNew) q = q.eq("is_new", true);
    const rows = await must(q.order("sort"));
    const [categories, areas] = await Promise.all([this.listCategories(), this.listAreas()]);
    return applyFilter(rows.map(mapBusiness), filter, categories, areas);
  },

  async getBusinessBySlug(slug) {
    const sb = await createClient();
    const { data, error } = await sb.from("businesses").select("*, services(*), staff(*)").eq("slug", slug).maybeSingle();
    if (error) throw fromPostgrest(error);
    if (!data || data.status !== "published") return null;
    return mapDetail(data, true);
  },

  async previewBusinessBySlug(slug) {
    const user = await getSessionUser();
    if (!user) return null;
    const sb = await createClient();
    // RLS already limits hidden businesses to their owner and admins; the check below says so too.
    const { data, error } = await sb.from("businesses").select("*, services(*), staff(*)").eq("slug", slug).maybeSingle();
    if (error) throw fromPostgrest(error);
    if (!data || data.status === "published") return null;
    if (!user.isAdmin && data.owner_id !== user.id) return null;
    return mapDetail(data, true);
  },

  async listReviews(opts = {}) {
    const sb = await createClient();
    // Only reviews of businesses this visitor can see (a suspended one drops out).
    let q = sb.from("reviews").select("*, businesses!inner(slug, name, palette)").order("created_at", { ascending: false });
    if (opts.businessId) q = q.eq("business_id", opts.businessId);
    if (opts.limit) q = q.limit(opts.limit);
    const rows = await must(q);
    return rows.map((r: Row): ReviewWithBusiness => ({ ...mapReview(r), business: { ...r.businesses, palette: safePalette(r.businesses?.palette) } }));
  },

  async listServiceIndex() {
    const sb = await createClient();
    const rows = await must(
      sb.from("services").select("business_id, name, price, businesses!inner(status)").eq("active", true).eq("businesses.status", "published"),
    );
    return (rows as Row[]).map(r => ({ businessId: r.business_id, name: r.name, price: r.price }));
  },

  async getBusySlots(businessId, fromIso, toIso) {
    const sb = await createClient();
    const rows = await must(sb.rpc("busy_slots", { p_business: businessId, p_from: fromIso, p_to: toIso }));
    return (rows as Row[]).map(r => ({ staffId: r.staff_id, startsAt: r.starts_at, endsAt: r.ends_at }));
  },

  // ---- Customer ----
  async getMyProfile() {
    const user = await getSessionUser();
    return user ? ({ ...user } satisfies Profile) : null;
  },

  async updateMyProfile(patch) {
    const id = await uid();
    const sb = await createClient();
    await must(sb.from("profiles").update({ full_name: patch.fullName.trim(), phone: patch.phone }).eq("id", id).select().single());
    const user = await getSessionUser();
    return { ...user!, fullName: patch.fullName.trim(), phone: patch.phone };
  },

  async createBooking(input) {
    await uid();
    const sb = await createClient();
    const row = await must(
      sb
        .rpc("create_booking", {
          p_business: input.businessId,
          p_service_ids: input.serviceIds,
          p_staff: input.staffId,
          p_starts_at: input.startsAt,
          p_location: input.location,
          p_address: input.address,
          p_notes: input.notes,
          p_customer_name: input.customerName,
          p_customer_phone: input.customerPhone,
          p_payment_method: input.paymentMethod,
        })
        .single(),
      "We couldn't create that booking. Try again.",
    );
    const booking = await this.getBooking((row as Row).id);
    if (!booking) throw new DataError("unavailable", "Booking created, but we couldn't load it. Check My bookings.");
    return booking;
  },

  async listMyBookings() {
    const id = await uid();
    const sb = await createClient();
    const rows = await must(sb.from("bookings").select(BOOKING_SELECT).eq("customer_id", id).order("starts_at", { ascending: false }));
    return rows.map(mapBooking);
  },

  async getBooking(id) {
    const sb = await createClient();
    const { data, error } = await sb.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
    if (error) throw fromPostgrest(error);
    return data ? mapBooking(data) : null;
  },

  async cancelBooking(id) {
    await uid();
    const sb = await createClient();
    await must(sb.rpc("cancel_booking", { p_booking: id }).single());
    return (await this.getBooking(id))!;
  },

  async createReview(input) {
    const user = await getSessionUser();
    if (!user) throw new DataError("auth", "Log in first.");
    const booking = await this.getBooking(input.bookingId);
    if (!booking || booking.customerId !== user.id) throw new DataError("not_found", "Booking not found.");
    const sb = await createClient();
    const area = await sb.from("areas").select("name").eq("id", booking.business.areaId).maybeSingle();
    const first = (user.fullName ?? "Reclain customer").trim().split(/\s+/);
    const author = first.length > 1 ? `${first[0]} ${first[1][0]}.` : first[0];
    const row = await must(
      sb
        .from("reviews")
        .insert({
          business_id: booking.businessId,
          booking_id: booking.id,
          customer_id: user.id,
          rating: input.rating,
          title: input.title.trim().slice(0, 80),
          body: input.body.trim().slice(0, 600),
          author_name: author,
          author_area: area.data?.name ?? "",
        })
        .select()
        .single(),
      "You can review a booking once it's completed.",
    );
    return mapReview(row);
  },

  // ---- Business owner ----
  async getMyBusinesses() {
    const id = await uid();
    const sb = await createClient();
    const rows = await must(sb.from("businesses").select("*").eq("owner_id", id).order("created_at"));
    return rows.map(mapBusiness);
  },

  async getMyBusiness(id) {
    const owner = await uid();
    const sb = await createClient();
    const { data, error } = await sb.from("businesses").select("*, services(*), staff(*)").eq("id", id).eq("owner_id", owner).maybeSingle();
    if (error) throw fromPostgrest(error);
    return data ? mapDetail(data, false) : null;
  },

  async createBusiness(input, ownerName) {
    const owner = await uid();
    const sb = await createClient();
    const base = slugify(input.slug || input.name) || "venue";
    let attempt = 0;
    // Retry with a suffix if the address is taken.
    for (;;) {
      const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await sb
        .from("businesses")
        .insert({ ...businessRow(input), slug, owner_id: owner, status: "draft" })
        .select()
        .single();
      if (error?.code === "23505" && attempt < 4) {
        attempt++;
        continue;
      }
      if (error || !data) throw fromPostgrest(error, "We couldn't create your business. Check the form and try again.");
      // Every venue needs at least one professional to take bookings.
      await sb.from("staff").insert({ business_id: data.id, name: ownerName.trim() || "Owner", role: "Owner" });
      return mapBusiness(data);
    }
  },

  async updateBusiness(id, patch) {
    await uid();
    const sb = await createClient();
    const row = await must(sb.from("businesses").update(businessRow(patch)).eq("id", id).select().single(), "We couldn't save those changes.");
    return mapBusiness(row);
  },

  async submitBusinessForReview(id) {
    await uid();
    const sb = await createClient();
    // With approval switched off, owners publish straight away (the database allows it when
    // app_settings.require_business_approval is false too).
    const status = features.businessApproval ? "pending" : "published";
    const row = await must(sb.from("businesses").update({ status }).eq("id", id).in("status", ["draft"]).select().single(), "Only a draft can be sent for review.");
    return mapBusiness(row);
  },

  async upsertService(businessId, input) {
    await uid();
    const sb = await createClient();
    const row = {
      business_id: businessId,
      group_name: input.groupName.trim() || "Services",
      name: input.name.trim(),
      description: input.description.trim(),
      duration_min: input.durationMin,
      duration_label: input.durationLabel?.trim() || null,
      price: input.price,
      latest_start: input.latestStart || null,
      people_needed: input.peopleNeeded,
      active: input.active,
      ...(input.sort !== undefined ? { sort: input.sort } : {}),
    };
    const q = input.id
      ? sb.from("services").update(row).eq("id", input.id).eq("business_id", businessId).select().single()
      : sb.from("services").insert(row).select().single();
    const service = mapService(await must(q, "We couldn't save that service."));

    // What it uses replaces what was set before. The database refuses another business's
    // equipment (service_resources_guard), so there's nothing to check here beyond the numbers.
    const needs = new Map<string, number>();
    for (const need of input.resources) {
      if (need.quantity > 0) needs.set(need.resourceId, Math.max(needs.get(need.resourceId) ?? 0, Math.min(need.quantity, 999)));
    }
    const cleared = await sb.from("service_resources").delete().eq("service_id", service.id);
    if (cleared.error) throw fromPostgrest(cleared.error, "We couldn't save what that service uses.");
    if (needs.size) {
      const inserted = await sb
        .from("service_resources")
        .insert([...needs].map(([resource_id, quantity]) => ({ service_id: service.id, resource_id, quantity })));
      if (inserted.error) throw fromPostgrest(inserted.error, "We couldn't save what that service uses.");
    }
    return service;
  },

  async deleteService(id) {
    await uid();
    const sb = await createClient();
    const { error } = await sb.from("services").delete().eq("id", id);
    if (error) throw fromPostgrest(error);
  },

  async upsertStaff(businessId, input) {
    await uid();
    const sb = await createClient();
    const row = { business_id: businessId, name: input.name.trim(), role: input.role.trim(), active: input.active, ...(input.sort !== undefined ? { sort: input.sort } : {}) };
    const q = input.id
      ? sb.from("staff").update(row).eq("id", input.id).eq("business_id", businessId).select().single()
      : sb.from("staff").insert(row).select().single();
    return mapStaff(await must(q, "We couldn't save that team member."));
  },

  async deleteStaff(id) {
    await uid();
    const sb = await createClient();
    const { error } = await sb.from("staff").delete().eq("id", id);
    if (error) throw fromPostgrest(error);
  },

  async listBusinessBookings(businessId, opts = {}) {
    await uid();
    const sb = await createClient();
    let q = sb.from("bookings").select(BOOKING_SELECT).eq("business_id", businessId);
    if (opts.fromIso) q = q.gte("starts_at", opts.fromIso);
    if (opts.toIso) q = q.lt("starts_at", opts.toIso);
    if (opts.status?.length) q = q.in("status", opts.status);
    const rows = await must(q.order("starts_at"));
    return rows.map(mapBooking);
  },

  async setBookingStatus(id, status) {
    await uid();
    const sb = await createClient();
    await must(sb.rpc("set_booking_status", { p_booking: id, p_status: status }).single());
    return (await this.getBooking(id))!;
  },

  async markCashPaid(id) {
    await uid();
    const sb = await createClient();
    await must(sb.rpc("mark_cash_paid", { p_booking: id }).single());
    return (await this.getBooking(id))!;
  },

  // ---- Admin ----
  async listBusinessesForAdmin(status) {
    await uid();
    const sb = await createClient();
    let q = sb.from("businesses").select("*");
    if (status) q = q.eq("status", status);
    const rows = await must(q.order("created_at", { ascending: false }));
    return rows.map(mapBusiness);
  },

  async setBusinessStatus(id, status) {
    await uid();
    const sb = await createClient();
    const row = await must(sb.rpc("admin_set_business_status", { p_business: id, p_status: status }).single());
    return mapBusiness(row as Row);
  },

  // ---- Server jobs ----
  server: {
    async getBooking(id) {
      const { data, error } = await createAdminClient().from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
      if (error) throw fromPostgrest(error);
      return data ? mapBooking(data) : null;
    },

    async createPayment(input) {
      const row = await must(
        createAdminClient()
          .from("payments")
          .insert({
            booking_id: input.bookingId,
            provider: input.provider,
            method: input.method,
            amount: input.amount,
            msisdn: input.msisdn,
            tx_ref: input.txRef,
            provider_ref: input.providerRef,
            checkout_url: input.checkoutUrl,
            status: "pending",
          })
          .select()
          .single(),
      );
      // Show the booking as "payment pending" while the customer approves, including a retry
      // after a declined attempt.
      await createAdminClient()
        .from("bookings")
        .update({ payment_status: "pending" })
        .eq("id", input.bookingId)
        .in("payment_status", ["unpaid", "failed"]);
      return mapPayment(row);
    },

    async getPaymentByTxRef(txRef) {
      const { data, error } = await createAdminClient().from("payments").select("*").eq("tx_ref", txRef).maybeSingle();
      if (error) throw fromPostgrest(error);
      return data ? mapPayment(data) : null;
    },

    async listPaymentsForBooking(bookingId) {
      const rows = await must(createAdminClient().from("payments").select("*").eq("booking_id", bookingId).order("created_at", { ascending: false }));
      return rows.map(mapPayment);
    },

    async applyPaymentResult(input) {
      const row = (await must(
        createAdminClient()
          .rpc("record_payment_result", {
            p_tx_ref: input.txRef,
            p_status: input.status,
            p_provider_ref: input.providerRef ?? null,
            p_amount: input.amount,
            p_raw: (input.raw ?? {}) as object,
          })
          .single(),
      )) as Row;
      const booking = await this.getBooking(row.booking_id);
      if (!booking) throw new DataError("not_found", "Booking not found.");
      return { booking, becamePaid: row.became_paid === true };
    },

    async listRemindersDue(fromIso, toIso) {
      const rows = await must(
        createAdminClient()
          .from("bookings")
          .select(BOOKING_SELECT)
          .eq("status", "confirmed")
          .is("reminder_sent_at", null)
          .gte("starts_at", fromIso)
          .lt("starts_at", toIso),
      );
      return rows.map(mapBooking);
    },

    async countBookingsSince(fromIso) {
      const { count, error } = await createAdminClient()
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", fromIso);
      if (error) throw fromPostgrest(error);
      return count ?? 0;
    },

    async claimReminder(bookingId) {
      const { data, error } = await createAdminClient()
        .from("bookings")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", bookingId)
        .is("reminder_sent_at", null)
        .select("id");
      if (error) throw fromPostgrest(error);
      return (data ?? []).length > 0;
    },

    async releaseReminder(bookingId) {
      const { error } = await createAdminClient().from("bookings").update({ reminder_sent_at: null }).eq("id", bookingId);
      if (error) throw fromPostgrest(error);
    },

    async logSms(entry) {
      await createAdminClient().from("sms_log").insert({
        booking_id: entry.bookingId,
        to_phone: entry.toPhone,
        body: entry.body,
        kind: entry.kind,
        provider: entry.provider,
        status: entry.status,
        provider_ref: entry.providerRef ?? null,
        error: entry.error ?? null,
      });
    },
  },
};
