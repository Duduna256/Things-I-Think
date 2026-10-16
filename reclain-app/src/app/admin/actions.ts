"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { site } from "@/config/site";
import { getSessionUser } from "@/lib/auth";
import { data, isDataError } from "@/lib/data";
import { ADMIN_OPS, ADMIN_TARGET, adminOps, type AdminOp } from "@/components/dashboard/logic";
import { parseId } from "@/components/dashboard/schemas";
import type { FormResult } from "@/components/dashboard/types";

const opSchema = z.enum(ADMIN_OPS as [AdminOp, ...AdminOp[]]);

const DONE: Record<AdminOp, (name: string) => string> = {
  approve: name => `${name} is live.`,
  send_back: name => `${name} is back in drafts for the owner to finish.`,
  suspend: name => `${name} is suspended and hidden from customers.`,
  unsuspend: name => `${name} is live again.`,
};

// Approve, send back, suspend or unsuspend a business. Admins only.
export async function setBusinessStatusAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await getSessionUser();
  if (!user?.isAdmin) return { message: `Only ${site.shortName} admins can do that. Log in with an admin account.` };
  const id = parseId(formData.get("businessId"));
  const op = opSchema.safeParse(formData.get("op"));
  if (!id || !op.success) return { message: "Something about that request looked off. Refresh the page and try again." };

  try {
    const all = await data.listBusinessesForAdmin();
    const business = all.find(b => b.id === id);
    if (!business) return { message: "We couldn't find that business. Refresh the page and try again." };
    // Checked against the status now, not the one on screen, so a stale tab can't undo a decision.
    if (!adminOps(business.status).includes(op.data)) {
      return { message: "That business has changed since this page loaded. Refresh to see where it's at." };
    }
    const updated = await data.setBusinessStatus(business.id, ADMIN_TARGET[op.data]);
    revalidatePath("/admin");
    revalidatePath("/business", "layout");
    revalidatePath(`/v/${updated.slug}`);
    revalidatePath("/search");
    revalidatePath("/");
    return { ok: true, message: DONE[op.data](updated.name) };
  } catch (e) {
    if (isDataError(e)) return { message: e.message };
    console.error("setBusinessStatus failed", e);
    return { message: "We couldn't change that just now. Try again in a minute." };
  }
}
