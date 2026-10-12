// Words for the pretend phone prompt. Pure, so prompt.test.ts can check them.
// Relative imports only, for the tests.

import { ugx } from "../../../../lib/format";
import { NETWORKS } from "../../../../lib/phone";
import type { PaymentMethod } from "../../../../lib/types";

export type PromptMethod = Exclude<PaymentMethod, "cash">;

export interface MockPromptState {
  error: string;
}

export function methodLabel(method: PromptMethod): string {
  return method === "card" ? "Card" : NETWORKS[method].label;
}

// What the payee shows up as on the phone: "RECLAIN".
export function payeeName(shortName: string): string {
  return shortName.replace(/[^A-Za-z0-9 ]/g, "").toUpperCase() || "RECLAIN";
}

// "MTN MoMo: pay UGX 120,000 to RECLAIN for The Braid Republic? Enter PIN"
export function promptQuestion(opts: { method: PromptMethod; amount: number; payee: string; venue: string }): string {
  const ask = `${methodLabel(opts.method)}: pay ${ugx(opts.amount)} to ${opts.payee} for ${opts.venue}?`;
  return opts.method === "card" ? ask : `${ask} Enter PIN`;
}

// The page heading's accent word: MoMo and Airtel happen on your phone, card on the checkout.
export function headingWord(method: PromptMethod): { lead: string; accent: string } {
  return method === "card" ? { lead: "Finish", accent: "paying" } : { lead: "Check your", accent: "phone" };
}
