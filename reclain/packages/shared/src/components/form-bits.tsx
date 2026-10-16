"use client";

// Small pieces the dashboard forms share: submitting a Server Action without the form
// resetting (so a refused form keeps what was typed), and showing field errors.

import { startTransition, useEffect, useRef, useState, useTransition, type FormEvent, type RefObject } from "react";
import { site } from "../config/site";
import type { FormResult } from "./types";

type Action = (prev: FormResult, formData: FormData) => Promise<FormResult>;

// Next.js redirects and not-founds travel as errors with a NEXT_ digest; let the router have them.
function isNextSignal(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_");
}

export function useSubmit(action: Action, opts: { onDone?: (result: NonNullable<FormResult>) => void } = {}) {
  const [result, setResult] = useState<FormResult>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  // Pass to <FormMessage focusRef>: the message takes focus when no field does.
  const messageRef = useRef<HTMLParagraphElement>(null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter ?? undefined);
    start(async () => {
      let r: FormResult;
      try {
        r = await action(null, fd);
      } catch (err) {
        if (isNextSignal(err)) throw err;
        console.error(err);
        r = { message: `We couldn't reach ${site.shortName}. Check your connection and try again.` };
      }
      startTransition(() => {
        setResult(r);
        if (r?.ok) opts.onDone?.(r);
      });
    });
  };

  // The submit button was disabled while sending, so focus fell to the page. After a refusal it
  // goes to the first field that needs fixing; otherwise to the message, if it's shown.
  useEffect(() => {
    if (!result) return;
    const first = !result.ok && result.errors ? formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]') : null;
    (first ?? messageRef.current)?.focus();
  }, [result]);

  const error = (field: string): string | undefined => (result && !result.ok ? result.errors?.[field] : undefined);
  return { result, pending, submit, formRef, messageRef, error, clear: () => setResult(null) };
}

// Props for an input with an error: aria-invalid and a link to the message.
export function invalid(errorId: string, error: string | undefined) {
  return error ? { "aria-invalid": true as const, "aria-describedby": errorId } : {};
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <small className="hint is-error" id={id}>
      {error}
    </small>
  );
}

// The sentence under a form: what happened, or what went wrong. The live region stays in the
// page so screen readers hear each new message; the message itself can take focus when the
// thing that had focus has gone.
export function FormMessage({ result, focusRef }: { result: FormResult; focusRef?: RefObject<HTMLParagraphElement | null> }) {
  return (
    <div role="status" aria-live="polite" className="dash-live">
      {result?.message && (
        <p ref={focusRef} tabIndex={-1} className={result.ok ? "form-ok dash-msg" : "form-err dash-msg"}>
          {result.message}
        </p>
      )}
    </div>
  );
}
