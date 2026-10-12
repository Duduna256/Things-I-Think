// Checks what the dashboard forms send before anything reaches the data layer.
// Used by the Server Actions; pure (relative imports only) so it's unit-tested.
// Every message says what's wrong and how to fix it.

import { z } from "zod";
import { normalizeMsisdn } from "../../lib/phone";
import { parseHHMM } from "../../lib/time";
import type { BusinessInput, ServiceInput, StaffInput, VisitMode } from "../../lib/types";
import { BLURB_MAX, COVER_WORD_MAX, CURRENT_PALETTE, PALETTES } from "./options";

export interface FormLike {
  get(name: string): FormDataEntryValue | null;
  getAll(name: string): FormDataEntryValue[];
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const text = (fd: FormLike, key: string): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};
const checked = (fd: FormLike, key: string): boolean => {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
};

// An id from a hidden field: what our data layers hand out (uuids, or "biz-..." in demo mode).
export const idSchema = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);

export function parseId(raw: unknown): string | null {
  const r = idSchema.safeParse(raw);
  return r.success ? r.data : null;
}

// "UGX 10,000", "10 000" or "10000" -> 10000. Null when it isn't a whole number of shillings.
export function parseUgx(raw: string): number | null {
  const cleaned = raw.replace(/ugx/i, "").replace(/[\s,]/g, "");
  if (!/^\d{1,9}$/.test(cleaned)) return null;
  return Number(cleaned);
}

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

// A time of day on the half-hour grid, or the value the business already has.
function validTime(value: string, current?: string | null): boolean {
  if (!TIME.test(value)) return false;
  return parseHHMM(value) % 30 === 0 || value === current;
}

function firstErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

// ---------- Business (settings and onboarding) ----------

export interface BusinessContext {
  // "create" is the short onboarding form; "update" is Settings, which shows every field.
  mode: "create" | "update";
  categoryIds: string[];
  areaIds: string[];
  // What the business has now (Settings), used for fields that are switched off or hidden.
  current?: Pick<BusinessInput, "homeVisitFee" | "acceptsCash" | "palette" | "opensAt" | "closesAt">;
  cashEnabled: boolean; // features.cashPayments
  defaultHomeVisitFee: number;
}

const businessBase = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Give your business a name of at least 2 characters.")
    .max(80, "Keep the name under 80 characters."),
  blurb: z.string().trim().max(BLURB_MAX, `Keep the description under ${BLURB_MAX} characters.`),
  address: z.string().trim().max(200, "Keep the address under 200 characters."),
  coverWord: z
    .string()
    .trim()
    .min(1, "Pick a word for your cover, like braids or shine.")
    .max(COVER_WORD_MAX, `Keep the cover word to ${COVER_WORD_MAX} characters or fewer.`),
});

const visitModeSchema = z.enum(["salon", "both", "mobile"], { error: "Choose where your bookings happen." });

export function parseBusinessForm(fd: FormLike, ctx: BusinessContext): Parsed<BusinessInput> {
  const errors: Record<string, string> = {};
  const base = businessBase.safeParse({
    name: text(fd, "name"),
    blurb: text(fd, "blurb"),
    address: ctx.mode === "update" ? text(fd, "address") : "",
    coverWord: text(fd, "coverWord"),
  });
  if (!base.success) Object.assign(errors, firstErrors(base.error.issues));
  const mode = visitModeSchema.safeParse(text(fd, "visitMode"));
  if (!mode.success) errors.visitMode = mode.error.issues[0]?.message ?? "Choose where your bookings happen.";
  const visitMode: VisitMode = mode.success ? mode.data : "salon";

  const categoryId = text(fd, "categoryId");
  if (!ctx.categoryIds.includes(categoryId)) errors.categoryId = "Pick the category that fits you best.";
  const areaId = text(fd, "areaId");
  if (!ctx.areaIds.includes(areaId)) errors.areaId = "Pick the area you work from.";

  // Phone: optional in settings, needed when you sign up.
  const rawPhone = text(fd, "phone").trim();
  let phone: string | null = null;
  if (rawPhone) {
    phone = normalizeMsisdn(rawPhone);
    if (!phone) errors.phone = "Enter a Ugandan mobile number, like 0772 123 456.";
  } else if (ctx.mode === "create") {
    errors.phone = "Add a mobile number so we can text you new bookings.";
  }

  // Hours
  const opensAt = text(fd, "opensAt");
  const closesAt = text(fd, "closesAt");
  if (!validTime(opensAt, ctx.current?.opensAt)) errors.opensAt = "Pick an opening time from the list.";
  if (!validTime(closesAt, ctx.current?.closesAt)) errors.closesAt = "Pick a closing time from the list.";
  else if (!errors.opensAt && parseHHMM(closesAt) <= parseHHMM(opensAt)) errors.closesAt = "Closing time must be after opening time.";

  const days = fd.getAll("closedDays").map(v => (typeof v === "string" && /^[0-6]$/.test(v) ? Number(v) : NaN));
  if (days.some(Number.isNaN)) errors.closedDays = "Tick the days you're closed.";
  const closedDays = [...new Set(days.filter(d => !Number.isNaN(d)))].sort((a, b) => a - b);
  if (closedDays.length === 7) errors.closedDays = "You can't be closed every day. Untick at least one.";

  // Home-visit fee: only asked when customers can choose.
  let homeVisitFee = ctx.current?.homeVisitFee ?? ctx.defaultHomeVisitFee;
  if (visitMode === "both") {
    const fee = parseUgx(text(fd, "homeVisitFee"));
    if (fee === null) errors.homeVisitFee = "Enter the fee in shillings, like 10000. Use 0 for free home visits.";
    else if (fee > 500_000) errors.homeVisitFee = "That fee looks high. Keep it under UGX 500,000.";
    else homeVisitFee = fee;
  }

  // Palette: one of the presets, or keep the colours the business already has.
  const paletteId = text(fd, "palette");
  let palette: [string, string, string] | null = null;
  if (paletteId === CURRENT_PALETTE && ctx.current) palette = ctx.current.palette;
  else palette = PALETTES.find(p => p.id === paletteId)?.colors ?? null;
  if (!palette) errors.palette = "Pick a colour scheme for your cover.";

  if (Object.keys(errors).length || !base.success || !palette) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name: base.data.name,
      categoryId,
      areaId,
      blurb: base.data.blurb,
      address: base.data.address,
      phone,
      visitMode,
      opensAt,
      closesAt,
      closedDays,
      homeVisitFee,
      // Onboarding doesn't ask: cash is on (when the app takes cash) and customers pick a pro.
      acceptsCash: !ctx.cashEnabled ? (ctx.current?.acceptsCash ?? false) : ctx.mode === "create" ? true : checked(fd, "acceptsCash"),
      skipProfessional: ctx.mode === "update" && checked(fd, "skipProfessional"),
      coverWord: base.data.coverWord,
      palette: [...palette] as [string, string, string],
    },
  };
}

// ---------- Services ----------

const serviceBase = z.object({
  groupName: z.string().trim().max(40, "Keep the group name under 40 characters."),
  name: z.string().trim().min(2, "Give the service a name of at least 2 characters.").max(80, "Keep the name under 80 characters."),
  description: z.string().trim().max(300, "Keep the description under 300 characters."),
  durationLabel: z.string().trim().max(40, "Keep the length note under 40 characters."),
});

export function parseServiceForm(fd: FormLike, hours: { opensAt: string; closesAt: string }): Parsed<Omit<ServiceInput, "id" | "sort">> {
  const errors: Record<string, string> = {};
  const base = serviceBase.safeParse({
    groupName: text(fd, "groupName"),
    name: text(fd, "name"),
    description: text(fd, "description"),
    durationLabel: text(fd, "durationLabel"),
  });
  if (!base.success) Object.assign(errors, firstErrors(base.error.issues));

  const rawDuration = text(fd, "durationMin");
  const durationMin = /^\d{1,3}$/.test(rawDuration) ? Number(rawDuration) : NaN;
  const open = parseHHMM(hours.opensAt);
  const close = parseHHMM(hours.closesAt);
  if (Number.isNaN(durationMin) || durationMin > 720 || durationMin % 5 !== 0) errors.durationMin = "Pick how long it takes from the list.";
  else if (close > open && durationMin > close - open) {
    errors.durationMin = `That's longer than you're open (${hours.opensAt} to ${hours.closesAt}), so nobody could book it. Pick a shorter time or change your hours in Settings.`;
  }

  const price = parseUgx(text(fd, "price"));
  if (price === null) errors.price = "Enter the price in shillings, like 45000.";
  else if (price > 10_000_000) errors.price = "That price looks high. Keep it under UGX 10,000,000.";

  const latest = text(fd, "latestStart");
  let latestStart: string | null = null;
  if (latest) {
    if (!TIME.test(latest)) errors.latestStart = "Pick a latest start time from the list, or leave it empty.";
    else if (parseHHMM(latest) < open) errors.latestStart = `You open at ${hours.opensAt}, so the latest start can't be before that.`;
    else if (close > open && parseHHMM(latest) >= close) errors.latestStart = `You close at ${hours.closesAt}, so the latest start has to be earlier than that.`;
    else latestStart = latest;
  }

  if (Object.keys(errors).length || !base.success || price === null) return { ok: false, errors };
  return {
    ok: true,
    value: {
      groupName: base.data.groupName || "Services",
      name: base.data.name,
      description: base.data.description,
      durationMin,
      durationLabel: base.data.durationLabel || null,
      price,
      latestStart,
      active: checked(fd, "active"),
    },
  };
}

// ---------- Team ----------

const staffBase = z.object({
  name: z.string().trim().min(2, "Add their name, at least 2 characters.").max(60, "Keep the name under 60 characters."),
  role: z.string().trim().max(40, "Keep the role under 40 characters."),
});

export function parseStaffForm(fd: FormLike): Parsed<Omit<StaffInput, "id" | "sort">> {
  const base = staffBase.safeParse({ name: text(fd, "name"), role: text(fd, "role") });
  if (!base.success) return { ok: false, errors: firstErrors(base.error.issues) };
  return { ok: true, value: { name: base.data.name, role: base.data.role, active: checked(fd, "active") } };
}
