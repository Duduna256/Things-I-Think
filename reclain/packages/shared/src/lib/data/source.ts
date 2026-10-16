// Every question the screens ask the back end. Two implementations:
// supabase.ts (real database) and demo.ts (built-in sample data, no setup needed).
// To add a feature that needs data: add a function here, then to both implementations.

import type {
  Area,
  Booking,
  BookingStatus,
  Business,
  BusinessCheck,
  BusinessTier,
  BusyResource,
  CheckKind,
  CheckStatus,
  JobEvent,
  JobEventInput,
  LedgerAccount,
  LedgerEntry,
  Payout,
  Resource,
  ResourceInput,
  ServiceNeed,
  ServiceResourceNeed,
  SpendInput,
  UploadFile,
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

export interface ServiceIndexEntry {
  businessId: string;
  name: string;
  price: number;
}

// What recording a payment result did. becamePaid is true for exactly one call per booking:
// the one that moved it to paid and confirmed. That call sends the "You're booked" text.
export interface PaymentResultApplied {
  booking: Booking;
  becamePaid: boolean;
}

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

// ---- Crew and equipment ----
export interface CapacitySource {
  listResources(businessId: string): Promise<Resource[]>; // owner: active and inactive
  upsertResource(businessId: string, input: ResourceInput): Promise<Resource>;
  deleteResource(id: string): Promise<void>;
  // Public: what these services need, and the business's stock of each resource.
  getServiceNeeds(businessId: string, serviceIds: string[]): Promise<ServiceNeed[]>;
  // Public: units of each resource that live bookings have reserved in a window.
  getBusyResources(businessId: string, fromIso: string, toIso: string): Promise<BusyResource[]>;
}

// ---- The job log ----
export interface JobsSource {
  listJobEvents(bookingId: string): Promise<JobEvent[]>; // the customer or the business
  addJobEvent(input: JobEventInput): Promise<JobEvent>; // the business
  addJobPhoto(
    bookingId: string,
    file: UploadFile,
    meta: { lat?: number | null; lng?: number | null; accuracyM?: number | null; locationMissing?: boolean; note?: string },
  ): Promise<JobEvent>;
}

// ---- Money and books ----
export interface BooksSource {
  listAccounts(businessId: string): Promise<LedgerAccount[]>;
  listEntries(businessId: string, fromDate: string, toDate: string): Promise<LedgerEntry[]>; // inclusive YYYY-MM-DD
  recordSpend(input: SpendInput): Promise<LedgerEntry>;
  listPayouts(businessId: string): Promise<Payout[]>;
  adminRecordPayout(input: { businessId: string; amount: number; periodFrom: string; periodTo: string; reference: string }): Promise<Payout>;
}

// ---- Verification tiers ----
export interface VerificationSource {
  listChecks(businessId: string): Promise<BusinessCheck[]>; // owner or admin
  submitCheck(input: { businessId: string; kind: CheckKind; note: string }, file: UploadFile | null): Promise<BusinessCheck>;
  getEvidenceUrl(check: BusinessCheck): Promise<string | null>; // short-lived; owner or admin
  adminReviewCheck(checkId: string, status: CheckStatus, note: string): Promise<BusinessCheck>;
  adminSetTier(businessId: string, tier: BusinessTier): Promise<Business>;
}

export interface DataSource {
  mode: "supabase" | "demo";

  // The business tools, each in its own file (data/<backend>-<feature>.ts).
  capacity: CapacitySource;
  jobs: JobsSource;
  books: BooksSource;
  verification: VerificationSource;

  // ---- Public (anyone) ----
  listCategories(): Promise<Category[]>;
  listAreas(): Promise<Area[]>;
  listBusinesses(filter?: BusinessFilter): Promise<Business[]>;
  getBusinessBySlug(slug: string): Promise<BusinessDetail | null>; // active services and staff only
  // A business that isn't live yet, for its owner or an admin to check before it goes up.
  // Null for anyone else, and for a live business (use getBusinessBySlug for those).
  previewBusinessBySlug(slug: string): Promise<BusinessDetail | null>;
  listReviews(opts?: { businessId?: string; limit?: number }): Promise<ReviewWithBusiness[]>;
  getBusySlots(businessId: string, fromIso: string, toIso: string): Promise<BusySlot[]>;
  // Every active service at a published business, for search suggestions and "from" prices.
  listServiceIndex(): Promise<ServiceIndexEntry[]>;

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
    applyPaymentResult(input: { txRef: string; status: PaymentStatus; providerRef: string | null; amount: number; raw: unknown }): Promise<PaymentResultApplied>;
    listRemindersDue(fromIso: string, toIso: string): Promise<Booking[]>;
    // How many bookings were made since this moment (the homepage's "booked today" line).
    countBookingsSince(fromIso: string): Promise<number>;
    // Stamps reminder_sent_at only if it's empty. True when this call did it, so overlapping
    // reminder runs never text the same person twice.
    claimReminder(bookingId: string): Promise<boolean>;
    releaseReminder(bookingId: string): Promise<void>; // the SMS didn't go: let the next run retry
    logSms(entry: SmsLogEntry): Promise<void>;
  };
}
