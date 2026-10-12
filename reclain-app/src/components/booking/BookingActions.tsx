"use client";

// The buttons on a customer's booking page: pay again, cancel (with a confirm step) and review.

import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { cancelBookingAction, payAgainAction, reviewBookingAction } from "@/app/bookings/actions";
import { Icon } from "@/components/Icon";
import type { BookingPageResult } from "./types";

export function PayNowButton({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(payAgainAction, null as BookingPageResult);
  return (
    <form action={action} className="bkd-inline-form">
      <input type="hidden" name="bookingId" value={bookingId} />
      <button type="submit" className="btn btn-black btn-sm" disabled={pending}>
        {pending ? "Starting payment…" : "Pay now"}
      </button>
      {state?.error && (
        <p className="form-err" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function CancelBooking({ bookingId, policy, lateWarning }: { bookingId: string; policy: string; lateWarning: string | null }) {
  const [state, action, pending] = useActionState(cancelBookingAction, null as BookingPageResult);
  const [confirming, setConfirming] = useState(false);
  const openBtn = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const opened = useRef(false);
  const titleId = useId();

  // Focus the question when the confirm step opens, and the button again when it closes.
  useEffect(() => {
    if (confirming) {
      opened.current = true;
      title.current?.focus();
    } else if (opened.current) {
      openBtn.current?.focus();
    }
  }, [confirming]);

  if (!confirming) {
    return (
      <button ref={openBtn} type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
        Cancel booking
      </button>
    );
  }
  return (
    <section className="bkd-cancel" aria-labelledby={titleId}>
      <h2 id={titleId} tabIndex={-1} ref={title}>
        Cancel this booking?
      </h2>
      <p>{policy}</p>
      {lateWarning && (
        <p className="notice notice-warn">
          <Icon name="alert" />
          <span>{lateWarning}</span>
        </p>
      )}
      <form action={action} className="bkd-cancel-actions">
        <input type="hidden" name="bookingId" value={bookingId} />
        <button type="submit" className="btn btn-danger" disabled={pending}>
          {pending ? "Cancelling…" : "Yes, cancel it"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Keep my booking
        </button>
      </form>
      {state?.error && (
        <p className="form-err" role="alert">
          {state.error}
        </p>
      )}
    </section>
  );
}

const STAR_WORDS = ["", "Not great", "Could be better", "Good", "Very good", "Brilliant"];

export function ReviewForm({ bookingId, venueName }: { bookingId: string; venueName: string }) {
  const [state, action, pending] = useActionState(reviewBookingAction, null as BookingPageResult);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const shown = hover || rating;
  const err = (f: "rating" | "title" | "body") => (state?.field === f ? state.error : "");

  // Submitted by hand (not <form action>) so a refused review keeps what was typed.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  return (
    <section className="card bkd-review" aria-labelledby="bkd-review-title">
      <h2 id="bkd-review-title">How was it?</h2>
      <p className="muted">Your review helps other people pick {venueName}, and tells the team what to keep doing.</p>
      <form onSubmit={onSubmit} className="form" noValidate>
        <input type="hidden" name="bookingId" value={bookingId} />
        <fieldset aria-describedby={err("rating") ? "bkd-rating-err" : undefined}>
          <legend>Your rating</legend>
          <div className="bkd-stars" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map(n => (
              <label key={n} className={n <= shown ? "is-on" : undefined} onMouseEnter={() => setHover(n)}>
                <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
                <Icon name="star" />
                <span className="sr-only">
                  {n} {n === 1 ? "star" : "stars"}, {STAR_WORDS[n].toLowerCase()}
                </span>
              </label>
            ))}
            <span className="bkd-star-word" aria-hidden="true">
              {STAR_WORDS[shown]}
            </span>
          </div>
          {err("rating") && (
            <p className="hint is-error" id="bkd-rating-err">
              {err("rating")}
            </p>
          )}
        </fieldset>
        <div className="field">
          <label htmlFor="bkd-title">Title</label>
          <input
            id="bkd-title"
            name="title"
            maxLength={80}
            placeholder="Sum it up in a few words"
            value={title}
            onChange={e => setTitle(e.target.value)}
            aria-invalid={!!err("title") || undefined}
            aria-describedby={err("title") ? "bkd-title-err" : undefined}
          />
          {err("title") && (
            <small className="hint is-error" id="bkd-title-err">
              {err("title")}
            </small>
          )}
        </div>
        <div className="field">
          <label htmlFor="bkd-body">Your review</label>
          <textarea
            id="bkd-body"
            name="body"
            maxLength={600}
            placeholder="What went well, and what would you tell a friend?"
            value={body}
            onChange={e => setBody(e.target.value)}
            aria-invalid={!!err("body") || undefined}
            aria-describedby={err("body") ? "bkd-body-err" : undefined}
          />
          {err("body") && (
            <small className="hint is-error" id="bkd-body-err">
              {err("body")}
            </small>
          )}
        </div>
        <p className="form-err" role="alert">
          {state?.error && !state.field ? state.error : ""}
        </p>
        {state?.field && (
          <p className="sr-only" role="alert">
            {state.error}
          </p>
        )}
        <button type="submit" className="btn btn-black" disabled={pending}>
          {pending ? "Posting…" : "Post review"}
        </button>
      </form>
    </section>
  );
}
