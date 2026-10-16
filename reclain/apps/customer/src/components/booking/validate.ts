// Checks the confirm step's details. The client shows these messages as people type;
// createBookingAction runs the same checks again, because the browser can't be trusted.

import type { PaymentMethod } from "@shared/lib/types";
import { mobileMoneyError, normalizeMsisdn, type Network } from "@shared/lib/phone";
import type { DetailField } from "./types";

export const DETAIL_FIELDS: DetailField[] = ["name", "phone", "address", "momo"];

export function isMobileMoney(method: PaymentMethod | null | undefined): method is Network {
  return method === "mtn" || method === "airtel";
}

export interface DetailsInput {
  name: string;
  phone: string;
  address: string;
  momo: string;
  pay: PaymentMethod | null;
  needsAddress: boolean;
  isLaundry: boolean;
}

// The number the mobile money prompt goes to: the money field, or the phone number when it's blank.
export function momoSource(input: Pick<DetailsInput, "momo" | "phone">): string {
  return input.momo.trim() || input.phone;
}

export function detailErrors(input: DetailsInput): Partial<Record<DetailField, string>> {
  const errors: Partial<Record<DetailField, string>> = {};
  if (!input.name.trim()) errors.name = "Tell us your name so the venue knows who to expect.";
  if (!input.phone.trim()) errors.phone = "Add your phone number. We text your booking details to it.";
  else if (!normalizeMsisdn(input.phone)) errors.phone = "Enter a valid Ugandan mobile number, like 0772 123 456.";
  if (input.needsAddress && !input.address.trim()) {
    errors.address = input.isLaundry
      ? "Add the pickup address, with a landmark the rider can spot."
      : "Add your address, with a landmark the pro can spot.";
  }
  if (isMobileMoney(input.pay)) {
    const source = momoSource(input);
    // A missing phone number already has its own message; only check a number someone typed.
    if (source.trim()) {
      const err = mobileMoneyError(input.pay, source);
      if (err) errors.momo = err;
    }
  }
  return errors;
}

export function firstError(errors: Partial<Record<DetailField, string>>): DetailField | null {
  return DETAIL_FIELDS.find(f => errors[f]) ?? null;
}

// Whether a number looks finished enough to judge while someone is still typing.
export function looksComplete(raw: string): boolean {
  return raw.replace(/\D/g, "").length >= 9;
}
