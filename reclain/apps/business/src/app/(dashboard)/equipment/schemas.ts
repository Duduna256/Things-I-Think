// Checks what the Equipment page's forms send before anything reaches the data layer: the
// add/edit form (a Server Action) and the slot checker's GET query. Pure, so it's unit-tested.

import { z } from "zod";
import { addDays } from "@shared/lib/time";
import type { ResourceInput } from "@shared/lib/types";
import { parseDateParam } from "@/components/dashboard/logic";
import { idSchema, type FormLike, type Parsed } from "@/components/dashboard/schemas";
import { RESOURCE_NAME_MAX, RESOURCE_NAME_MIN, RESOURCE_NOTES_MAX, RESOURCE_QUANTITY_MAX } from "@/components/equipment/fields";

const text = (fd: FormLike, key: string): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};
const checked = (fd: FormLike, key: string): boolean => {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
};

// ---------- Add or edit an item ----------

const resourceBase = z.object({
  kind: z.enum(["equipment", "vehicle"], { error: "Say whether it's equipment or a vehicle." }),
  name: z
    .string()
    .trim()
    .min(RESOURCE_NAME_MIN, `Give it a name of at least ${RESOURCE_NAME_MIN} characters, like Massage table.`)
    .max(RESOURCE_NAME_MAX, `Keep the name under ${RESOURCE_NAME_MAX} characters.`),
  notes: z.string().trim().max(RESOURCE_NOTES_MAX, `Keep the notes under ${RESOURCE_NOTES_MAX} characters.`),
});

export function parseResourceForm(fd: FormLike): Parsed<Omit<ResourceInput, "id" | "sort">> {
  const errors: Record<string, string> = {};
  const base = resourceBase.safeParse({ kind: text(fd, "kind"), name: text(fd, "name"), notes: text(fd, "notes") });
  if (!base.success) {
    for (const issue of base.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
  }
  const rawQty = text(fd, "quantity").replace(/\s/g, "");
  const quantity = /^\d{1,3}$/.test(rawQty) ? Number(rawQty) : NaN;
  if (Number.isNaN(quantity) || quantity > RESOURCE_QUANTITY_MAX) {
    errors.quantity = `How many do you have? A whole number from 0 to ${RESOURCE_QUANTITY_MAX}.`;
  }
  if (Object.keys(errors).length || !base.success) return { ok: false, errors };
  return { ok: true, value: { kind: base.data.kind, name: base.data.name, quantity, notes: base.data.notes, active: checked(fd, "active") } };
}

// ---------- The slot checker's query ----------

// How far ahead the owner can check. Customers book 14 days out; owners plan a bit further.
export const CHECKER_DAYS = 60;
// How far past the chosen day to look for the next free start.
export const NEXT_FREE_DAYS = 21;

export interface CheckerQuery {
  asked: boolean; // the form was sent (so an empty result is a real answer, not the blank state)
  serviceIds: string[]; // the valid ones, in the menu's order, de-duplicated
  date: string;
  dateError: string | null;
  serviceError: string | null;
}

type Raw = Record<string, string | string[] | undefined>;

export function parseCheckerQuery(sp: Raw, ctx: { serviceIds: string[]; today: string }): CheckerQuery {
  const rawServices = sp.services === undefined ? [] : Array.isArray(sp.services) ? sp.services : [sp.services];
  const rawDate = Array.isArray(sp.date) ? sp.date[0] : sp.date;
  const asked = rawServices.length > 0 || rawDate !== undefined;
  const picked = new Set(rawServices.filter(v => idSchema.safeParse(v).success));
  const serviceIds = ctx.serviceIds.filter(id => picked.has(id));

  let date = parseDateParam(rawDate, ctx.today);
  let dateError: string | null = null;
  if (rawDate !== undefined && date !== rawDate) {
    dateError = "Pick a real date.";
    date = ctx.today;
  } else if (date < ctx.today) {
    dateError = "That day has already gone. Showing today instead.";
    date = ctx.today;
  } else if (date > addDays(ctx.today, CHECKER_DAYS - 1)) {
    dateError = `Pick a day in the next ${CHECKER_DAYS} days.`;
    date = ctx.today;
  }

  const serviceError = asked && !serviceIds.length ? "Tick at least one service to check." : null;
  return { asked, serviceIds, date, dateError, serviceError };
}
