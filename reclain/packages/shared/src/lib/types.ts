// The shapes of everything Reclain stores. Mirrors supabase/migrations.

export type VisitMode = "salon" | "both" | "mobile";
export type BusinessStatus = "draft" | "pending" | "published" | "suspended";
export type BookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentMethod = "mtn" | "airtel" | "card" | "cash";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";
export type BookingLocation = "venue" | "home";

export interface Category {
  id: string;
  name: string;
  icon: string;
  isNew: boolean;
  sort: number;
}

export interface Area {
  id: string;
  name: string;
  region: string;
  sort: number;
}

export interface Business {
  id: string;
  slug: string;
  ownerId: string | null;
  name: string;
  categoryId: string;
  areaId: string;
  blurb: string;
  address: string;
  phone: string | null;
  visitMode: VisitMode;
  opensAt: string; // "HH:MM" local time
  closesAt: string; // "HH:MM" local time
  closedDays: number[]; // 0 = Sunday … 6 = Saturday
  homeVisitFee: number;
  acceptsCash: boolean;
  skipProfessional: boolean;
  coverWord: string;
  palette: [string, string, string]; // dark, mid, light
  imageUrl: string | null;
  status: BusinessStatus;
  isFeatured: boolean;
  isNew: boolean;
  ratingAvg: number;
  ratingCount: number;
  sort: number;
  createdAt: string;
  // How far the reClain team has checked this business. Granted by the team, never by the owner.
  tier: BusinessTier;
  // Lowercased service names, used by search. Filled by listBusinesses().
  serviceNames?: string[];
}

export interface Service {
  id: string;
  businessId: string;
  groupName: string;
  name: string;
  description: string;
  durationMin: number;
  durationLabel: string | null;
  price: number;
  // Latest start time ("10:00") for services with a cut-off, like express laundry.
  latestStart: string | null;
  // How many people from the team the job takes (a deep clean might need two).
  peopleNeeded: number;
  sort: number;
  active: boolean;
}

export interface Staff {
  id: string;
  businessId: string;
  name: string;
  role: string;
  rating: number;
  sort: number;
  active: boolean;
}

export interface BusinessDetail extends Business {
  services: Service[];
  staff: Staff[];
}

export interface Review {
  id: string;
  businessId: string;
  bookingId: string | null;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  authorArea: string;
  isSample: boolean;
  createdAt: string;
}

export interface ReviewWithBusiness extends Review {
  business: { slug: string; name: string; palette: [string, string, string] };
}

export interface BookingItem {
  id: string;
  serviceId: string | null;
  name: string;
  price: number;
  durationMin: number;
}

export interface BookingBusiness {
  id: string;
  slug: string;
  name: string;
  areaId: string;
  categoryId: string;
  coverWord: string;
  palette: [string, string, string];
  address: string;
  phone: string | null;
}

// Who called a booking off. "expired" means an unpaid hold ran out.
export type CancelledBy = "customer" | "venue" | "admin" | "expired";

export interface Booking {
  id: string;
  ref: string;
  businessId: string;
  customerId: string;
  staffId: string | null;
  staffName: string | null;
  startsAt: string; // ISO
  endsAt: string; // ISO
  location: BookingLocation;
  address: string;
  notes: string;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  homeFee: number;
  total: number;
  currency: string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  expiresAt: string | null;
  reminderSentAt: string | null;
  cancelledBy: CancelledBy | null; // set when status is cancelled
  createdAt: string;
  items: BookingItem[];
  business: BookingBusiness;
  hasReview: boolean;
  // Extra people on the job beyond the lead professional (staffName).
  crewNames: string[];
}

export interface Payment {
  id: string;
  bookingId: string;
  provider: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  msisdn: string | null;
  status: PaymentStatus;
  txRef: string;
  providerRef: string | null;
  checkoutUrl: string | null;
  createdAt: string;
}

export interface BusySlot {
  staffId: string | null;
  startsAt: string;
  endsAt: string;
}

export interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  isAdmin: boolean;
}

export type SessionUser = Profile;

export interface CreateBookingInput {
  businessId: string;
  serviceIds: string[];
  staffId: string | null; // null = any professional
  startsAt: string; // ISO
  location: BookingLocation;
  address: string;
  notes: string;
  customerName: string;
  customerPhone: string; // normalised: 9 digits, e.g. 772123456
  paymentMethod: PaymentMethod;
}

export interface BusinessInput {
  name: string;
  slug?: string;
  categoryId: string;
  areaId: string;
  blurb: string;
  address: string;
  phone: string | null;
  visitMode: VisitMode;
  opensAt: string;
  closesAt: string;
  closedDays: number[];
  homeVisitFee: number;
  acceptsCash: boolean;
  skipProfessional: boolean;
  coverWord: string;
  palette: [string, string, string];
}

export interface ServiceInput {
  id?: string;
  groupName: string;
  name: string;
  description: string;
  durationMin: number;
  durationLabel: string | null;
  price: number;
  latestStart: string | null;
  peopleNeeded: number;
  // Equipment and vehicles the service uses, replacing what was set before.
  resources: ServiceResourceNeed[];
  sort?: number;
  active: boolean;
}

export interface StaffInput {
  id?: string;
  name: string;
  role: string;
  sort?: number;
  active: boolean;
}

export interface BusinessFilter {
  q?: string;
  areaId?: string;
  categoryId?: string;
  featured?: boolean;
  isNew?: boolean;
  // Only venues open on at least one of these weekdays (0 = Sunday).
  openOn?: number[];
  limit?: number;
}

// ---------- Crew and equipment (the capacity engine) ----------
export type ResourceKind = "equipment" | "vehicle";

export interface Resource {
  id: string;
  businessId: string;
  kind: ResourceKind;
  name: string;
  quantity: number; // how many units the business has
  notes: string;
  active: boolean;
  sort: number;
}

export interface ResourceInput {
  id?: string;
  kind: ResourceKind;
  name: string;
  quantity: number;
  notes: string;
  active: boolean;
  sort?: number;
}

// "This service uses 2 of resource X."
export interface ServiceResourceNeed {
  resourceId: string;
  quantity: number;
}

// Everything the planner needs to know about one service: people and equipment, with stock.
export interface ServiceNeed {
  serviceId: string;
  peopleNeeded: number;
  resources: { resourceId: string; name: string; kind: ResourceKind; stock: number; needed: number }[];
}

// Units of one resource that a live booking has reserved.
export interface BusyResource {
  resourceId: string;
  startsAt: string;
  endsAt: string;
  quantity: number;
}

// ---------- The job log ----------
export type JobEventKind = "checked_in" | "checked_out" | "photo" | "note";

export interface JobEvent {
  id: string;
  bookingId: string;
  businessId: string;
  actorId: string | null;
  kind: JobEventKind;
  occurredAt: string;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  locationMissing: boolean;
  photoPath: string | null;
  photoHash: string | null;
  // A short-lived address to show the photo (a signed URL, or a data URL in demo mode).
  photoUrl: string | null;
  note: string;
  staffIds: string[];
}

export interface JobEventInput {
  bookingId: string;
  kind: Exclude<JobEventKind, "photo">;
  lat?: number | null;
  lng?: number | null;
  accuracyM?: number | null;
  locationMissing?: boolean;
  note?: string;
  staffIds?: string[];
}

// A file sent up through a Server Action.
export interface UploadFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

// ---------- Money and books ----------
export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface LedgerAccount {
  id: string;
  businessId: string;
  code: string; // "1000" cash in hand, "4000" service income, ...
  name: string;
  type: AccountType;
}

export type EntryKind = "income" | "receipt" | "fee" | "refund" | "payout" | "expense" | "wage" | "supplier" | "money_in";

export interface LedgerLine {
  accountId: string;
  code: string;
  debit: number;
  credit: number;
}

export interface LedgerEntry {
  id: string;
  businessId: string;
  bookingId: string | null;
  kind: EntryKind;
  memo: string;
  occurredOn: string; // YYYY-MM-DD
  reference: string | null;
  createdAt: string;
  lines: LedgerLine[];
}

export interface Payout {
  id: string;
  businessId: string;
  amount: number;
  periodFrom: string;
  periodTo: string;
  reference: string;
  sentAt: string;
}

// Money the owner spent, or put into the business. `from` is the cash or mobile money account.
export interface SpendInput {
  businessId: string;
  code: string;
  amount: number;
  from: "1000" | "1010";
  memo: string;
  on: string; // YYYY-MM-DD
}

// ---------- Verification tiers ----------
export type BusinessTier = "registered" | "verified" | "guaranteed" | "certified";
export type CheckKind = "identity" | "references" | "address" | "competence" | "registration" | "certification";
export type CheckStatus = "submitted" | "passed" | "failed";

export interface BusinessCheck {
  id: string;
  businessId: string;
  kind: CheckKind;
  status: CheckStatus;
  note: string;
  evidencePath: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string;
}
