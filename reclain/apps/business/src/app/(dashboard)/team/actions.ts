"use server";

import { data, isDataError } from "@shared/lib/data";
import { leavesNobodyActive } from "@/components/dashboard/logic";
import { parseId, parseStaffForm } from "@/components/dashboard/schemas";
import type { FormResult } from "@/components/dashboard/types";
import { ownedBusiness, refreshBusiness } from "../../_lib/context";

const MAX_STAFF = 100;
const LAST_ONE = "Bookings need someone to assign them to, so keep at least one person taking bookings. Add someone else first.";

// Add a team member, or edit one (when the form carries a staffId).
export async function saveStaffAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const owned = await ownedBusiness(formData.get("businessId"));
  if (!owned.ok) return { message: owned.error };
  const { business } = owned;

  const rawId = formData.get("staffId");
  const staffId = rawId ? parseId(rawId) : null;
  const existing = staffId ? business.staff.find(s => s.id === staffId) : undefined;
  if (rawId && !existing) return { message: "That person isn't on your team any more. Refresh the page and try again." };
  if (!existing && business.staff.length >= MAX_STAFF) return { message: `Your team already has ${MAX_STAFF} people. Remove someone before adding more.` };

  const parsed = parseStaffForm(formData);
  if (!parsed.ok) return { message: "Check the highlighted fields and try again.", errors: parsed.errors };
  if (existing && leavesNobodyActive(business.staff, { id: existing.id, active: parsed.value.active })) {
    return { message: LAST_ONE, errors: { active: LAST_ONE } };
  }

  const sort = existing ? existing.sort : business.staff.reduce((max, s) => Math.max(max, s.sort), -1) + 1;
  try {
    await data.upsertStaff(business.id, { ...parsed.value, id: existing?.id, sort });
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("upsertStaff failed", e);
    return { message: "We couldn't save that just now. Try again in a minute." };
  }
  refreshBusiness(business.slug);
  return { ok: true, message: existing ? `Saved ${parsed.value.name}.` : `Added ${parsed.value.name} to the team.` };
}

export async function deleteStaffAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const owned = await ownedBusiness(formData.get("businessId"));
  if (!owned.ok) return { message: owned.error };
  const { business } = owned;
  const id = parseId(formData.get("staffId"));
  const member = id ? business.staff.find(s => s.id === id) : undefined;
  if (!member) return { message: "That person isn't on your team any more. Refresh the page to see the latest." };
  if (leavesNobodyActive(business.staff, { id: member.id, remove: true })) return { message: LAST_ONE };
  try {
    await data.deleteStaff(member.id);
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("deleteStaff failed", e);
    return { message: "We couldn't remove them just now. Try again in a minute." };
  }
  refreshBusiness(business.slug);
  return { ok: true, message: `Removed ${member.name} from the team.` };
}
