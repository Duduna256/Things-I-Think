"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { answerMockPrompt } from "./actions";
import type { MockPromptState, PromptMethod } from "./prompt";

const initialState: MockPromptState = { error: "" };

function Answers() {
  const { pending, data } = useFormStatus();
  const choice = pending ? data?.get("decision") : null;
  return (
    <div className="pay-actions">
      <button type="submit" name="decision" value="decline" className="btn btn-ghost" disabled={pending}>
        {choice === "decline" ? "Declining…" : "Decline"}
      </button>
      <button type="submit" name="decision" value="approve" className="btn btn-black" disabled={pending}>
        {choice === "approve" ? "Approving…" : "Approve"}
      </button>
    </div>
  );
}

// The pretend phone. Approve and Decline post to answerMockPrompt, which records the answer
// and sends the customer to their booking.
export function MockPrompt({
  txRef,
  method,
  label,
  question,
}: {
  txRef: string;
  method: PromptMethod;
  label: string;
  question: string;
}) {
  const [state, formAction, pending] = useActionState(answerMockPrompt, initialState);
  return (
    <div className="pay-phone">
      <div className="pay-bar" aria-hidden="true">
        <span>{label}</span>
        <span className="pay-signal">
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
      <form action={formAction} className="pay-dialog" aria-labelledby="pay-question" aria-busy={pending}>
        <input type="hidden" name="txRef" value={txRef} />
        <span className="pay-net" data-net={method}>
          {label}
        </span>
        <h2 id="pay-question" className="pay-question">
          {question}
        </h2>
        {method !== "card" && (
          <div className="pay-pin" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        )}
        <Answers />
        <p className="form-err" role="alert">
          {state.error}
        </p>
      </form>
    </div>
  );
}
