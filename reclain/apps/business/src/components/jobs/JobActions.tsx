"use client";

// The job log's buttons: Check in and Check out (with the phone's position), Add photo (shrunk
// on the phone before it goes up) and Add note. Each writes one entry; the page re-renders the
// timeline from the server afterwards, so what's shown is always what was saved.

import { startTransition, useEffect, useId, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { jobEventAction, jobPhotoAction } from "@/app/(dashboard)/bookings/[id]/actions";
import { Icon } from "@shared/components/Icon";
import { FieldError, FormMessage, invalid, useSubmit } from "@shared/components/form-bits";
import { useAnnounce } from "@shared/components/Toast";
import type { FormResult } from "@shared/components/types";
import { JOB_NOTE_MAX, type AllowedJobActions } from "@shared/lib/jobs/rules";
import { downscalePhoto, sizeText } from "./downscale";

const LOCATION_TIMEOUT_MS = 10_000;

interface Position {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  missing: boolean;
}

const NOWHERE: Position = { lat: null, lng: null, accuracy: null, missing: true };

// Asks the phone where it is. Resolves with "missing" (never rejects) when the person says no,
// the phone can't tell, or it takes longer than the timeout: the entry is still allowed.
function locate(timeoutMs = LOCATION_TIMEOUT_MS, maximumAge = 30_000): Promise<Position> {
  return new Promise(resolve => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(NOWHERE);
    let done = false;
    const finish = (p: Position) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(p);
    };
    // Some browsers never call back when the permission prompt is dismissed; belt and braces.
    const timer = setTimeout(() => finish(NOWHERE), timeoutMs + 1000);
    try {
      navigator.geolocation.getCurrentPosition(
        pos => finish({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, missing: false }),
        () => finish(NOWHERE),
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge },
      );
    } catch {
      finish(NOWHERE);
    }
  });
}

function setPosition(fd: FormData, p: Position) {
  fd.set("lat", p.lat === null ? "" : String(p.lat));
  fd.set("lng", p.lng === null ? "" : String(p.lng));
  fd.set("accuracy", p.accuracy === null ? "" : String(p.accuracy));
  fd.set("locationMissing", p.missing ? "on" : "");
}

type Open = "note" | "photo" | null;

export function JobActions({ businessId, bookingId, allowed }: { businessId: string; bookingId: string; allowed: AllowedJobActions }) {
  const announce = useAnnounce();
  const [open, setOpen] = useState<Open>(null);
  const noteBtn = useRef<HTMLButtonElement>(null);
  const photoBtn = useRef<HTMLButtonElement>(null);
  const any = allowed.check_in || allowed.check_out || allowed.photo || allowed.note;

  const done = (text: string) => {
    setOpen(null);
    announce?.(text);
  };
  const close = (which: Exclude<Open, null>) => {
    setOpen(null);
    requestAnimationFrame(() => (which === "note" ? noteBtn : photoBtn).current?.focus());
  };

  if (!any) return null;

  return (
    <div className="job-actions">
      {open === null && (
        <div className="job-btns">
          {allowed.check_in && <CheckButton action="check_in" businessId={businessId} bookingId={bookingId} onDone={done} />}
          {allowed.photo && (
            <button ref={photoBtn} type="button" className="btn btn-ghost" onClick={() => setOpen("photo")}>
              <Icon name="eye" />
              Add photo
            </button>
          )}
          {allowed.note && (
            <button ref={noteBtn} type="button" className="btn btn-ghost" onClick={() => setOpen("note")}>
              <Icon name="chat" />
              Add note
            </button>
          )}
          {allowed.check_out && <CheckButton action="check_out" businessId={businessId} bookingId={bookingId} onDone={done} />}
        </div>
      )}
      {open === "note" && <NoteForm businessId={businessId} bookingId={bookingId} onCancel={() => close("note")} onDone={done} />}
      {open === "photo" && <PhotoForm businessId={businessId} bookingId={bookingId} onCancel={() => close("photo")} onDone={done} />}
    </div>
  );
}

// Check in or Check out: one tap asks for the location, then sends. Its own form, so a refusal
// shows under the button that was pressed.
function CheckButton({ action, businessId, bookingId, onDone }: { action: "check_in" | "check_out"; businessId: string; bookingId: string; onDone: (msg: string) => void }) {
  const [result, setResult] = useState<FormResult>(null);
  const [pending, start] = useTransition();
  const [locating, setLocating] = useState(false);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const label = action === "check_in" ? "Check in" : "Check out";

  useEffect(() => {
    if (result && !result.ok) messageRef.current?.focus();
  }, [result]);

  const go = async () => {
    if (pending || locating) return;
    setResult(null);
    setLocating(true);
    const position = await locate();
    setLocating(false);
    const fd = new FormData();
    fd.set("businessId", businessId);
    fd.set("bookingId", bookingId);
    fd.set("op", action);
    setPosition(fd, position);
    start(async () => {
      const r = await run(jobEventAction, fd);
      startTransition(() => {
        setResult(r);
        if (r?.ok) onDone(r.message ?? "Saved.");
      });
    });
  };

  return (
    <div className="job-check">
      <button type="button" className="btn btn-black" disabled={pending || locating} onClick={go}>
        <Icon name={action === "check_in" ? "pin" : "check"} />
        {locating ? "Finding your location…" : pending ? "Saving…" : label}
      </button>
      {result && !result.ok && <FormMessage result={result} focusRef={messageRef} />}
    </div>
  );
}

// Runs a Server Action, turning a dropped connection into a message rather than a crash.
async function run(action: (prev: FormResult, fd: FormData) => Promise<FormResult>, fd: FormData): Promise<FormResult> {
  try {
    return await action(null, fd);
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
    console.error(err);
    return { message: "We couldn't reach the server. Check your connection and try again." };
  }
}

function NoteForm({ businessId, bookingId, onCancel, onDone }: { businessId: string; bookingId: string; onCancel: () => void; onDone: (msg: string) => void }) {
  const { result, pending, submit, formRef, messageRef, error } = useSubmit(jobEventAction, { onDone: r => onDone(r.message ?? "Saved.") });
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    field.current?.focus();
  }, []);

  return (
    <form ref={formRef} className="card dash-form job-form" onSubmit={submit} noValidate aria-labelledby={`${id}-title`}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="op" value="note" />
      <h3 id={`${id}-title`}>Add a note</h3>
      <div className="field">
        <label htmlFor={`${id}-note`}>What happened?</label>
        <textarea
          ref={field}
          id={`${id}-note`}
          name="note"
          maxLength={JOB_NOTE_MAX}
          rows={3}
          required
          placeholder="Customer asked for a smaller parting at the front. Gate code 1234."
          {...invalid(`${id}-note-err`, error("note"))}
        />
        <small className="hint">Up to {JOB_NOTE_MAX} characters. The customer can read it, and it can&apos;t be edited later.</small>
        <FieldError id={`${id}-note-err`} error={error("note")} />
      </div>
      <FormMessage result={result} focusRef={messageRef} />
      <div className="dash-form-btns">
        <button type="submit" className="btn btn-black" disabled={pending}>
          {pending ? "Saving…" : "Add note"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={onCancel}>
          Close without saving
        </button>
      </div>
    </form>
  );
}

interface Picked {
  file: File;
  url: string;
  original: number; // bytes before shrinking
}

function PhotoForm({ businessId, bookingId, onCancel, onDone }: { businessId: string; bookingId: string; onCancel: () => void; onDone: (msg: string) => void }) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [result, setResult] = useState<FormResult>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const id = useId();
  const error = (field: string) => (result && !result.ok ? result.errors?.[field] : undefined);

  useEffect(() => {
    fileInput.current?.focus();
  }, []);

  // Let go of the preview when it changes or the form closes.
  useEffect(() => {
    if (!picked) return;
    return () => URL.revokeObjectURL(picked.url);
  }, [picked]);

  useEffect(() => {
    if (!result || result.ok) return;
    const first = result.errors ? formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]') : null;
    (first ?? messageRef.current)?.focus();
  }, [result]);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setResult(null);
    setPicked(null);
    if (!file) return;
    setPreparing(true);
    const small = await downscalePhoto(file);
    setPreparing(false);
    setPicked({ file: small, url: URL.createObjectURL(small), original: file.size });
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending || preparing) return;
    const form = e.currentTarget;
    if (!picked) {
      setResult({ message: "Pick a photo to add.", errors: { photo: "Pick a photo to add." } });
      return;
    }
    start(async () => {
      const fd = new FormData(form);
      fd.set("photo", picked.file, picked.file.name);
      // Where the photo was taken, if the phone will say quickly; it doesn't hold up the upload.
      setPosition(fd, await locate(5000, 5 * 60_000));
      const r = await run(jobPhotoAction, fd);
      startTransition(() => {
        setResult(r);
        if (r?.ok) onDone(r.message ?? "Saved.");
      });
    });
  };

  return (
    <form ref={formRef} className="card dash-form job-form" onSubmit={onSubmit} noValidate aria-labelledby={`${id}-title`}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <h3 id={`${id}-title`}>Add a photo</h3>
      <div className="field">
        <label htmlFor={`${id}-photo`}>Take or pick a photo</label>
        <input
          ref={fileInput}
          id={`${id}-photo`}
          type="file"
          name="photo"
          accept="image/*"
          capture="environment"
          onChange={onPick}
          disabled={pending}
          {...invalid(`${id}-photo-err`, error("photo"))}
        />
        <small className="hint">Before and after shots work best. Photos are shrunk on your phone so they upload quickly.</small>
        <FieldError id={`${id}-photo-err`} error={error("photo")} />
      </div>
      {preparing && (
        <p className="muted job-preparing" role="status">
          Preparing photo…
        </p>
      )}
      {picked && !preparing && (
        <figure className="job-preview">
          {/* A local preview of the file about to go up; next/image can't read object URLs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={picked.url} alt="The photo you picked, ready to add" />
          <figcaption className="muted">
            {sizeText(picked.file.size)}
            {picked.original > picked.file.size * 1.2 && ` (was ${sizeText(picked.original)})`}
          </figcaption>
        </figure>
      )}
      <div className="field">
        <label htmlFor={`${id}-note`}>
          Caption <span className="hint">(optional)</span>
        </label>
        <input id={`${id}-note`} name="note" maxLength={JOB_NOTE_MAX} placeholder="Before we started" {...invalid(`${id}-note-err`, error("note"))} />
        <FieldError id={`${id}-note-err`} error={error("note")} />
      </div>
      <FormMessage result={result} focusRef={messageRef} />
      <div className="dash-form-btns">
        <button type="submit" className="btn btn-black" disabled={pending || preparing}>
          {pending ? "Uploading…" : "Add photo"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={onCancel}>
          Close without saving
        </button>
      </div>
    </form>
  );
}
