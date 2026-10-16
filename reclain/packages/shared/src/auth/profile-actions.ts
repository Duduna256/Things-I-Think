"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "../lib/auth";
import { data, isDataError } from "../lib/data";
import { prettyMsisdn } from "../lib/phone";
import type { ProfileFormState } from "../components/auth/logic";
import { firstIssue, profileSchema, typed } from "../components/auth/schemas";

// Save the logged-in person's name and phone. The phone is stored as 9 digits (772123456).
export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const values = { fullName: typed(formData, "fullName"), phone: typed(formData, "phone") };
  const user = await getSessionUser();
  if (!user) return { status: "error", message: "You've been logged out. Log in again and try once more.", values, at: Date.now() };

  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    const { field, message } = firstIssue(parsed.error);
    return { status: "error", message, field: field === "phone" ? "phone" : "fullName", values, at: Date.now() };
  }
  const { fullName, phone } = parsed.data;

  try {
    await data.updateMyProfile({ fullName, phone });
  } catch (e) {
    if (isDataError(e)) return { status: "error", message: e.message, values, at: Date.now() };
    console.error("updateMyProfile failed", e);
    return { status: "error", message: "We couldn't save that just now. Try again in a minute.", values, at: Date.now() };
  }

  // The nav shows your first name, so refresh every page, not just this one.
  revalidatePath("/", "layout");
  return {
    status: "ok",
    message: phone ? "Saved. Booking texts will go to that number." : "Saved.",
    values: { fullName, phone: phone ? prettyMsisdn(phone) : "" },
    at: Date.now(),
  };
}
