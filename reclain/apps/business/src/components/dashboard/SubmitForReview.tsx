"use client";

// "Send for review" on a draft business. Once it works the banner changes and this button goes,
// so the result is announced in the toast (which also takes focus from the vanished button).

import { submitForReviewAction } from "@/app/actions";
import { FormMessage, useSubmit } from "@shared/components/form-bits";
import { useAnnounce } from "@shared/components/Toast";

export function SubmitForReview({ businessId, label }: { businessId: string; label: string }) {
  const announce = useAnnounce();
  const { result, pending, submit, messageRef } = useSubmit(submitForReviewAction, { onDone: r => announce?.(r.message ?? "Sent.") });
  // Without a toast to announce to, show the success here instead.
  const shown = result && (!result.ok || !announce) ? result : null;
  return (
    <form onSubmit={submit} className="dash-banner-form">
      <input type="hidden" name="businessId" value={businessId} />
      <button type="submit" className="btn btn-black btn-sm" disabled={pending}>
        {pending ? "Sending…" : label}
      </button>
      <FormMessage result={shown} focusRef={messageRef} />
    </form>
  );
}
