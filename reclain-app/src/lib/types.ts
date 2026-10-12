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
  createdAt: string;
  items: BookingItem[];
  business: BookingBusiness;
  hasReview: boolean;
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
