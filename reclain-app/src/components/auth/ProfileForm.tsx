"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { updateProfileAction } from "@/app/account/actions";
import { Icon } from "@/components/Icon";
import type { ProfileFormState } from "./logic";

const IDLE: ProfileFormState = { status: "idle" };

// Name and phone on /account. The values come in already formatted ("0772 123 456").
export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, IDLE);
  const form = useRef<HTMLFormElement>(null);
  const errMsg = useRef<HTMLParagraphElement>(null);
  const okMsg = useRef<HTMLParagraphElement>(null);
  const ids = useId();
  const errId = `${ids}-err`;
  const v = state.values ?? { fullName, phone };
  const bad = (field: "fullName" | "phone") => state.status === "error" && state.field === field;

  // Save is disabled while sending, so focus fell to the page. Put it back on the field to fix,
  // or on the message.
  useEffect(() => {
    if (state.status === "idle") return;
    const el = state.status === "error" && state.field ? form.current?.elements.namedItem(state.field) : null;
    if (el instanceof HTMLElement) el.focus();
    else (state.status === "error" ? errMsg : okMsg).current?.focus();
  }, [state]);

  return (
    <form ref={form} action={action} className="form" noValidate>
      <div className="field">
        <label htmlFor={`${ids}-name`}>Your name</label>
        <input
          id={`${ids}-name`}
          name="fullName"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={v.fullName}
          aria-invalid={bad("fullName") || undefined}
          aria-describedby={[`${ids}-name-hint`, bad("fullName") ? errId : ""].filter(Boolean).join(" ")}
        />
        <span className="hint" id={`${ids}-name-hint`}>
          Shown to the venues you book with.
        </span>
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${ids}-phone`}>
          Mobile number <span className="hint">optional</span>
        </label>
        <input
          id={`${ids}-phone`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={30}
          placeholder="0772 123 456"
          defaultValue={v.phone}
          aria-invalid={bad("phone") || undefined}
          aria-describedby={[`${ids}-phone-hint`, bad("phone") ? errId : ""].filter(Boolean).join(" ")}
        />
        <span className="hint" id={`${ids}-phone-hint`}>
          MTN or Airtel. We fill it in when you book and send your booking texts here.
        </span>
      </div>
      {state.status === "error" && state.message && (
        <p ref={errMsg} tabIndex={-1} className="form-err auth-err" id={errId} role="alert">
          <Icon name="alert" />
          <span>{state.message}</span>
        </p>
      )}
      <div className="acct-save">
        <button type="submit" className="btn btn-black" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <p ref={okMsg} tabIndex={-1} className="form-ok" role="status">
          {state.status === "ok" && !pending ? state.message : ""}
        </p>
      </div>
    </form>
  );
}
