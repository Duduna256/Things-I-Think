"use client";

// Approve, send back, suspend or unsuspend one business. Suspending asks first.
// The row moves to another tab once it works, so the result is announced in the toast.

import { useEffect, useId, useRef, useState } from "react";
import { setBusinessStatusAction } from "@/app/admin/actions";
import { FormMessage, useSubmit } from "./form-bits";
import type { AdminOp } from "./logic";
import { useAnnounce } from "./Toast";

const LABEL: Record<AdminOp, string> = {
  approve: "Approve",
  send_back: "Send back",
  suspend: "Suspend",
  unsuspend: "Unsuspend",
};

const STYLE: Record<AdminOp, string> = {
  approve: "btn btn-black btn-sm",
  send_back: "btn btn-ghost btn-sm",
  suspend: "btn btn-danger btn-sm",
  unsuspend: "btn btn-black btn-sm",
};

export function AdminActions({ businessId, name, ops }: { businessId: string; name: string; ops: AdminOp[] }) {
  const announce = useAnnounce();
  const [confirming, setConfirming] = useState(false);
  // Which button was pressed, so only that one says it's saving.
  const [pressed, setPressed] = useState<string | null>(null);
  const { result, pending, submit, messageRef } = useSubmit(setBusinessStatusAction, {
    onDone: r => {
      setConfirming(false);
      announce?.(r.message ?? "Done.");
    },
  });
  const question = useRef<HTMLParagraphElement>(null);
  const suspendBtn = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);
  const qid = useId();

  useEffect(() => {
    if (confirming) {
      opened.current = true;
      question.current?.focus();
    } else if (opened.current) {
      opened.current = false;
      if (suspendBtn.current?.isConnected) suspendBtn.current.focus();
    }
  }, [confirming]);

  const shown = result && (!result.ok || !announce) ? result : null;

  return (
    <form
      onSubmit={ev => {
        setPressed((ev.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ?? null);
        submit(ev);
      }}
      className="dash-actions"
    >
      <input type="hidden" name="businessId" value={businessId} />
      {confirming ? (
        <div className="dash-confirm" role="group" aria-labelledby={qid}>
          <p id={qid} ref={question} tabIndex={-1}>
            <b>Suspend {name}?</b> It disappears from search and its page straight away, so nobody can book it. Existing bookings
            stay as they are.
          </p>
          <div className="dash-confirm-btns">
            <button type="submit" name="op" value="suspend" className="btn btn-danger btn-sm" disabled={pending}>
              {pending ? "Suspending…" : "Yes, suspend it"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setConfirming(false)}>
              Keep it as it is
            </button>
          </div>
        </div>
      ) : (
        <div className="dash-actions-btns">
          {ops.map(op =>
            op === "suspend" ? (
              <button key={op} ref={suspendBtn} type="button" className={STYLE[op]} disabled={pending} onClick={() => setConfirming(true)}>
                {LABEL[op]}
                <span className="sr-only"> {name}</span>
              </button>
            ) : (
              <button key={op} type="submit" name="op" value={op} className={STYLE[op]} disabled={pending}>
                {pending && pressed === op ? "Saving…" : LABEL[op]}
                <span className="sr-only"> {name}</span>
              </button>
            ),
          )}
        </div>
      )}
      <FormMessage result={shown} focusRef={messageRef} />
    </form>
  );
}
