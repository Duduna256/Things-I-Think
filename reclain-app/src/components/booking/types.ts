// Shapes shared by the booking flow (client), its Server Action and the availability API.
// Types only, so this file is safe on both sides of the server/client boundary.

import type { BookingLocation, PaymentMethod, VisitMode } from "../../lib/types";

export type FlowStep = "services" | "pro" | "time" | "confirm";

export interface AvailabilitySlot {
  time: string; // "10:30" Kampala time
  startsAt: string; // ISO instant
  staffIds: string[]; // professionals free at this time
}

export type AvailabilityKind = "ok" | "closed" | "too_long" | "too_late" | "full";

// GET /api/availability answers with this (or { error } and a 4xx/5xx status).
export interface AvailabilityResponse {
  kind: AvailabilityKind;
  date: string;
  slots: AvailabilitySlot[];
  // The next bookable date with free slots, when this date has none. Null if nothing is free.
  nextAvailable: string | null;
}

export interface ChosenSlot {
  startsAt: string;
  time: string;
}

// Everything the customer has picked so far. Also what survives the trip to /login and back.
export interface FlowSelection {
  serviceIds: string[];
  location: BookingLocation;
  staffId: string | null; // "any", a staff id, or null when not picked yet
  date: string;
  slot: ChosenSlot | null;
  step: FlowStep;
  pay: PaymentMethod | null;
}

// The venue, trimmed to what the flow shows. Plain data, so it can cross into a client component.
export interface FlowBusiness {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  blurb: string;
  visitMode: VisitMode;
  homeVisitFee: number;
  skipProfessional: boolean;
  palette: [string, string, string];
  coverWord: string;
  imageUrl: string | null;
  opensAt: string;
  closesAt: string;
  closedDays: number[];
  ratingAvg: number;
  ratingCount: number;
  address: string;
}

export type DetailField = "name" | "phone" | "address" | "momo";

// What createBookingAction sends back when it doesn't redirect.
export type BookingActionResult = {
  error: string;
  kind: "auth" | "validation" | "forbidden" | "not_found" | "invalid" | "conflict" | "unavailable";
  field?: DetailField | "pay";
} | null;

// What the booking detail page's actions send back when they don't redirect.
export type BookingPageResult = { error: string; field?: "rating" | "title" | "body" } | null;
