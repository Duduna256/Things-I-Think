"use client";

// The venue's buttons on a booking: Mark completed, Mark cash paid, No-show and Cancel.
// No-show and Cancel ask first, in place, because neither can be undone.

import { useEffect, useId, useRef, useState } from "react";
import { bookingAction } from "@/app/business/actions";
import type { AllowedActions } from "./logic";
import { FormMessage, useSubmit } from "./form-bits";
import { useAnnounce } from "./Toast";

type Confirm = "cancel" | "no_show" | null;

export function BookingActions({
  bookingId,
  allowed,
  who,
  when,
  textsCustomer,
}: {
  bookingId: string;
  allowed: AllowedActions;
  who: string; // the customer's first name
  when: string; // "10:30" or "Tue 20 Oct, 10:30"
  textsCustomer: boolean;
}) {
  const announce = useAnnounce();
  const [confirming, setConfirming] = useState<Confirm>(null);
  const { result, pending, submit } = useSubmit(bookingAction, {
    onDone: r => {
      setConfirming(null);
      announce?.(r.message ?? "Done.");
    },
  });
  const questionId = useId();
  const question = useRef<HTMLParagraphElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);
  const noShowBtn = useRef<HTMLButtonElement>(null);
  const opened = useRef<Confirm>(null);

  // Focus the question when it opens, and the button that opened it when it's closed unanswered.
  useEffect(() => {
    if (confirming) {
      opened.current = confirming;
      question.current?.focus();
    } else if (opened.current) {
      const btn = (opened.current === "cancel" ? cancelBtn : noShowBtn).current;
      opened.current = null;
      if (btn?.isConnected) btn.focus();
    }
  }, [confirming]);

  const any = allowed.complete || allowed.cashPaid || allowed.noShow || allowed.cancel;
  // Every card has the same buttons, so each says whose booking it is to a screen reader.
  const whose = <span className="sr-only">{`: ${who}, ${when}`}</span>;
  // Without a toast to announce to, show the success here instead.
  const shown = result && (!result.ok || !announce) ? result : null;
  if (!any && !shown) return null;

  return (
    <form onSubmit={submit} className="dash-actions">
      <input type="hidden" name="bookingId" value={bookingId} />
      {confirming ? (
        <div className="dash-confirm" role="group" aria-labelledby={questionId}>
          <p id={questionId} ref={question} tabIndex={-1}>
            {confirming === "cancel" ? (
              <>
                <b>
                  Cancel {who}&apos;s booking at {when}?
                </b>{" "}
                {textsCustomer ? `We'll text ${who} to let them know.` : `Let ${who} know yourself, too.`}
              </>
            ) : (
              <>
                <b>Mark {who} as a no-show?</b> This closes the booking for good.
              </>
            )}
          </p>
          <div className="dash-confirm-btns">
            <button type="submit" name="op" value={confirming} className="btn btn-danger btn-sm" disabled={pending}>
              {pending ? "Saving…" : confirming === "cancel" ? "Yes, cancel it" : "Yes, mark no-show"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setConfirming(null)}>
              Keep it
            </button>
          </div>
        </div>
      ) : (
        any && (
          <div className="dash-actions-btns">
            {allowed.complete && (
              <button type="submit" name="op" value="complete" className="btn btn-black btn-sm" disabled={pending}>
                Mark completed
                {whose}
              </button>
            )}
            {allowed.cashPaid && (
              <button type="submit" name="op" value="cash_paid" className="btn btn-ghost btn-sm" disabled={pending}>
                Mark cash paid
                {whose}
              </button>
            )}
            {allowed.noShow && (
              <button ref={noShowBtn} type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setConfirming("no_show")}>
                Mark no-show
                {whose}
              </button>
            )}
            {allowed.cancel && (
              <button ref={cancelBtn} type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => setConfirming("cancel")}>
                Cancel booking
                {whose}
              </button>
            )}
          </div>
        )
      )}
      <FormMessage result={shown} />
    </form>
  );
}
