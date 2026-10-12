// Every question the screens ask the back end. Two implementations:
// supabase.ts (real database) and demo.ts (built-in sample data, no setup needed).
// To add a feature that needs data: add a function here, then to both implementations.

import type {
  Area,
  Booking,
  BookingStatus,
  Business,
  BusinessDetail,
  BusinessFilter,
  BusinessInput,
  BusinessStatus,
  BusySlot,
  Category,
  CreateBookingInput,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Profile,
  Review,
  ReviewWithBusiness,
  Service,
  ServiceInput,
  Staff,
  StaffInput,
} from "../types";

export interface SmsLogEntry {
  bookingId: string | null;
  toPhone: string;
  body: string;
  kind: string;
  provider: string;
  status: string;
  providerRef?: string | null;
  error?: string | null;
}

export interface DataSource {
  mode: "supabase" | "demo";

  // ---- Public (anyone) ----
  listCategories(): Promise<Category[]>;
  listAreas(): Promise<Area[]>;
  listBusinesses(filter?: BusinessFilter): Promise<Business[]>;
  getBusinessBySlug(slug: string): Promise<BusinessDetail | null>; // active services and staff only
  listReviews(opts?: { businessId?: string; limit?: number }): Promise<ReviewWithBusiness[]>;
  getBusySlots(businessId: string, fromIso: string, toIso: string): Promise<BusySlot[]>;

  // ---- Logged-in customer ----
  getMyProfile(): Promise<Profile | null>;
  updateMyProfile(patch: { fullName: string; phone: string | null }): Promise<Profile>;
  createBooking(input: CreateBookingInput): Promise<Booking>;
  listMyBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>; // own bookings, or the venue's if you own it
  cancelBooking(id: string): Promise<Booking>;
  createReview(input: { bookingId: string; rating: number; title: string; body: string }): Promise<Review>;

  // ---- Business owner ----
  getMyBusinesses(): Promise<Business[]>;
  getMyBusiness(id: string): Promise<BusinessDetail | null>; // includes hidden services and staff
  createBusiness(input: BusinessInput, ownerName: string): Promise<Business>;
  updateBusiness(id: string, patch: Partial<BusinessInput>): Promise<Business>;
  submitBusinessForReview(id: string): Promise<Business>; // draft -> pending
  upsertService(businessId: string, input: ServiceInput): Promise<Service>;
  deleteService(id: string): Promise<void>;
  upsertStaff(businessId: string, input: StaffInput): Promise<Staff>;
  deleteStaff(id: string): Promise<void>;
  listBusinessBookings(businessId: string, opts?: { fromIso?: string; toIso?: string; status?: BookingStatus[] }): Promise<Booking[]>;
  setBookingStatus(id: string, status: Exclude<BookingStatus, "pending_payment">): Promise<Booking>;
  markCashPaid(id: string): Promise<Booking>;

  // ---- Admin ----
  listBusinessesForAdmin(status?: BusinessStatus): Promise<Business[]>;
  setBusinessStatus(id: string, status: BusinessStatus): Promise<Business>;

  // ---- Server jobs (webhooks, reminders). Never call these with user input you haven't checked. ----
  server: {
    getBooking(id: string): Promise<Booking | null>;
    createPayment(input: {
      bookingId: string;
      provider: string;
      method: Exclude<PaymentMethod, "cash">;
      amount: number;
      msisdn: string | null;
      txRef: string;
      providerRef: string | null;
      checkoutUrl: string | null;
    }): Promise<Payment>;
    getPaymentByTxRef(txRef: string): Promise<Payment | null>;
    listPaymentsForBooking(bookingId: string): Promise<Payment[]>;
    applyPaymentResult(input: { txRef: string; status: PaymentStatus; providerRef: string | null; amount: number; raw: unknown }): Promise<Booking>;
    listRemindersDue(fromIso: string, toIso: string): Promise<Booking[]>;
    markReminderSent(bookingId: string): Promise<void>;
    logSms(entry: SmsLogEntry): Promise<void>;
  };
}
