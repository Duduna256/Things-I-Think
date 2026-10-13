"use client";

// The booking flow at /book/[slug]: Services, Professional (unless the venue skips it), Time, Confirm.
// Ported from the prototype's full-screen dialog, as a page. Prices shown here are for show:
// createBookingAction and the database work them out again.

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createBookingAction } from "@/app/book/actions";
import { emptySummary, notesPlaceholder } from "@/config/content";
import { site } from "@/config/site";
import { latestStart, priceBooking } from "@/lib/booking/rules";
import { duration, plural, shortName, ugx } from "@/lib/format";
import { NETWORKS } from "@/lib/phone";
import { formatDate, parseHHMM } from "@/lib/time";
import type { BookingLocation, PaymentMethod, Service } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { errorText, groupServices, isAvailability, loginHref, STEP_LABELS, stepsFor } from "./flow-state";
import { dayId, ProStep, ServicesStep, SummaryDetails, TimeStep, type AvailState, type Staffer } from "./FlowSteps";
import type { BookingActionResult, DetailField, FlowBusiness, FlowSelection, FlowStep } from "./types";
import { detailErrors, firstError, isMobileMoney, looksComplete, momoSource } from "./validate";

const PAY_OPTIONS: Record<PaymentMethod, { title: string; sub: string; logo: string }> = {
  mtn: { title: "MTN MoMo", sub: "Approve with your PIN", logo: "MTN" },
  airtel: { title: "Airtel Money", sub: "Approve with your PIN", logo: "airtel" },
  card: { title: "Card", sub: "Pay on a secure checkout page", logo: "" },
  cash: { title: "Cash", sub: "Pay after your service", logo: "UGX" },
};

const PENDING_LABEL: Record<PaymentMethod, string> = {
  mtn: "Sending payment prompt…",
  airtel: "Sending payment prompt…",
  card: "Opening secure checkout…",
  cash: "Booking…",
};

export interface BookingFlowProps {
  business: FlowBusiness;
  services: Service[];
  staff: Staffer[];
  categoryName: string;
  areaName: string;
  openToday: string;
  dates: string[];
  payMethods: PaymentMethod[];
  allowHome: boolean;
  initial: FlowSelection;
  customer: { loggedIn: boolean; name: string; phone: string };
}

type Details = { name: string; phone: string; address: string; notes: string; momo: string };

export function BookingFlow(props: BookingFlowProps) {
  const { business, services, staff, dates, payMethods, customer } = props;
  const steps = useMemo(() => stepsFor(business.skipProfessional), [business.skipProfessional]);
  const groups = useMemo(() => groupServices(services), [services]);
  const byId = useMemo(() => new Map(services.map(s => [s.id, s])), [services]);
  const isLaundry = business.categoryId === "laundry";

  const [serviceIds, setServiceIds] = useState(props.initial.serviceIds);
  const [location, setLocation] = useState<BookingLocation>(props.initial.location);
  const [staffId, setStaffId] = useState(props.initial.staffId);
  const [date, setDate] = useState(props.initial.date);
  const [slot, setSlot] = useState(props.initial.slot);
  const [stepIndex, setStepIndex] = useState(Math.max(0, steps.indexOf(props.initial.step)));
  const [pay, setPay] = useState(props.initial.pay);
  const [details, setDetails] = useState<Details>({ name: customer.name, phone: customer.phone, address: "", notes: "", momo: "" });
  const [touched, setTouched] = useState<Partial<Record<DetailField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [avail, setAvail] = useState<AvailState | null>(null);
  const [submittedFor, setSubmittedFor] = useState<string | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(stepIndex);
  // When people arrive at Time and the day has nothing free, move to the next free day once.
  const autoJump = useRef(props.initial.step === "time");
  const proTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step: FlowStep = steps[stepIndex];
  const chosen = serviceIds.map(id => byId.get(id)).filter((s): s is Service => !!s);
  const price = priceBooking(business, chosen, location);
  const cutoffMin = latestStart(chosen);
  const cutoffService = cutoffMin === null ? undefined : chosen.find(s => s.latestStart && parseHHMM(s.latestStart) === cutoffMin);
  const cutoff = cutoffService && cutoffMin !== null ? { name: cutoffService.name, minutes: cutoffMin } : null;
  const pro = staffId && staffId !== "any" ? (staff.find(s => s.id === staffId) ?? null) : null;
  const staffParam = staffId ?? "any";
  const selection: FlowSelection = { serviceIds, location, staffId, date, slot, step, pay };
  const selectionKey = [serviceIds.join(","), location, staffParam, slot?.startsAt ?? ""].join("|");

  /* ---- Free times for the chosen day (Time step only) ---- */
  const availKey = step === "time" && serviceIds.length ? [date, serviceIds.join(","), staffParam, reloadToken].join("|") : null;
  const current = avail && avail.key === availKey ? avail : null;

  useEffect(() => {
    if (!availKey) return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ business: business.slug, date, services: serviceIds.join(","), staff: staffParam });
    fetch(`/api/availability?${qs}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async res => {
        const body: unknown = await res.json().catch(() => null);
        if (!res.ok || !isAvailability(body)) {
          autoJump.current = false;
          setAvail({ key: availKey, ok: false, error: errorText(body) ?? "It might be a blip on our side." });
          return;
        }
        const data = body;
        setAvail({ key: availKey, ok: true, data });
        // A time picked earlier (or restored after logging in) may have gone since.
        setSlot(s => (s && !data.slots.some(x => x.startsAt === s.startsAt) ? null : s));
        if (autoJump.current) {
          autoJump.current = false;
          if (data.kind !== "ok" && data.kind !== "too_long" && data.nextAvailable) {
            setNotice(
              data.kind === "too_late"
                ? "Today's last start time has passed, so here's the next free day."
                : `Nothing free on ${formatDate(date)}, so here's the next free day.`,
            );
            setDate(data.nextAvailable);
          }
        }
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        autoJump.current = false;
        setAvail({ key: availKey, ok: false, error: "Check your connection." });
      });
    return () => ctrl.abort();
  }, [availKey, business.slug, date, serviceIds, staffParam]);

  /* ---- Focus the new step's heading (finding F11) ---- */
  useEffect(() => {
    if (shownStep.current === stepIndex) return;
    shownStep.current = stepIndex;
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [stepIndex]);

  useEffect(
    () => () => {
      if (proTimer.current) clearTimeout(proTimer.current);
    },
    [],
  );

  /* ---- Submitting (Server Action) ---- */
  const [result, dispatch, pending] = useActionState(async (prev: BookingActionResult, fd: FormData): Promise<BookingActionResult> => {
    let res: BookingActionResult;
    try {
      res = await createBookingAction(prev, fd);
    } catch (e) {
      unstable_rethrow(e); // let Next.js handle the redirect to payment or the booking
      return { error: `We couldn't reach ${site.shortName}. Check your connection and try again.`, kind: "unavailable" };
    }
    if (res?.kind === "conflict") {
      // Someone else got there first: back to Time with fresh slots.
      autoJump.current = false;
      setSlot(null);
      setNotice(res.error);
      setReloadToken(t => t + 1);
      setStepIndex(steps.indexOf("time"));
    } else if (res?.field && res.field !== "pay") {
      const f = res.field;
      setTouched(t => ({ ...t, [f]: true }));
      requestAnimationFrame(() => document.getElementById(`bk-${f}`)?.focus());
    }
    return res;
  }, null);

  /* ---- Moving between steps ---- */
  const valid = (s: FlowStep) =>
    s === "services" ? serviceIds.length > 0 : s === "pro" ? staffId !== null : s === "time" ? slot !== null : true;

  const goTo = (index: number, jumpIfFull: boolean) => {
    if (steps[index] === "time") {
      autoJump.current = jumpIfFull;
      setReloadToken(t => t + 1); // always fresh times
    }
    setNotice(null);
    setStepIndex(index);
  };
  const next = () => {
    if (pending || step === "confirm" || !valid(step)) return;
    goTo(stepIndex + 1, true);
  };
  const back = () => {
    if (pending || stepIndex === 0) return;
    goTo(stepIndex - 1, false);
  };

  const toggleService = (id: string) => {
    setServiceIds(list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]));
    setSlot(null);
  };
  const choosePro = (id: string) => {
    setStaffId(id);
    setSlot(null);
    if (proTimer.current) clearTimeout(proTimer.current);
    // A short pause so the pick registers, then on to Time.
    const from = stepIndex;
    proTimer.current = setTimeout(() => {
      proTimer.current = null;
      if (steps[from] === "pro") goTo(from + 1, true);
    }, 220);
  };
  const pickDate = (d: string) => {
    setDate(d);
    setSlot(null);
    setNotice(null);
  };
  const jumpTo = (d: string) => {
    pickDate(d);
    requestAnimationFrame(() => document.getElementById(dayId(d))?.focus());
  };

  /* ---- Confirm details ---- */
  const errors = detailErrors({ ...details, pay, needsAddress: location === "home", isLaundry });
  const showError = (f: DetailField) => {
    if (!errors[f]) return "";
    if (submitted || touched[f]) return errors[f]!;
    // Mobile money numbers are checked live once they look complete.
    if (f === "momo" && looksComplete(momoSource(details))) return errors[f]!;
    return "";
  };
  const setField = (f: keyof Details) => (e: { target: { value: string } }) => setDetails(d => ({ ...d, [f]: e.target.value }));
  const blur = (f: DetailField) => () => setTouched(t => (t[f] ? t : { ...t, [f]: true }));

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending || !slot || !pay) return;
    setSubmitted(true);
    const bad = firstError(errors);
    if (bad) {
      document.getElementById(`bk-${bad}`)?.focus();
      return;
    }
    const fd = new FormData(e.currentTarget);
    setSubmittedFor(selectionKey);
    startTransition(() => dispatch(fd));
  };

  const needsLogin = !customer.loggedIn || result?.kind === "auth";
  const loginUrl = loginHref(business.slug, { ...selection, step: "confirm" });
  const onlinePay = pay !== null && pay !== "cash";
  const formError = result && result.kind !== "conflict" && result.kind !== "auth" && submittedFor === selectionKey ? result : null;
  const who = business.skipProfessional ? null : staffId === "any" ? "Any professional" : (pro?.name ?? null);
  const when = slot ? `${formatDate(date)} · ${slot.time}${price.durationMin ? ` (${duration(price.durationMin)})` : ""}` : null;
  const notesFor = business.skipProfessional ? business.name : pro ? shortName(pro.name) : "your professional";

  const summary = (
    <SummaryDetails
      business={business}
      areaName={props.areaName}
      chosen={chosen}
      price={price}
      location={location}
      isLaundry={isLaundry}
      who={who}
      when={when}
      emptyText={emptySummary[business.categoryId] ?? emptySummary.default}
    />
  );

  // The main button: in the summary card on wide screens, in the bottom bar on phones.
  const cta = (compact: boolean) => {
    if (step !== "confirm") {
      // Keys keep this and the submit button below separate elements. Without them React would
      // turn the clicked button into the submit button mid-click, and the browser would then
      // submit the booking before the person ever saw the confirm step.
      return (
        <button key="next" type="button" className="btn btn-black" disabled={!valid(step)} onClick={next}>
          Continue
        </button>
      );
    }
    if (needsLogin) {
      return (
        <Link className="btn btn-black" href={loginUrl}>
          Log in to book
        </Link>
      );
    }
    const label = pending ? (compact ? "Sending…" : PENDING_LABEL[pay ?? "cash"]) : compact ? "Confirm" : onlinePay ? `Confirm and pay ${ugx(price.total)}` : "Confirm booking";
    return (
      <button key="submit" type="submit" form="bk-form" className="btn btn-black" disabled={pending || !pay || !slot}>
        {label}
      </button>
    );
  };

  /* ---- Steps ---- */
  let main;
  if (step === "services") {
    main = (
      <ServicesStep
        headingRef={headingRef}
        business={business}
        categoryName={props.categoryName}
        areaName={props.areaName}
        openToday={props.openToday}
        groups={groups}
        serviceIds={serviceIds}
        onToggle={toggleService}
        allowHome={props.allowHome}
        location={location}
        onLocation={setLocation}
        isLaundry={isLaundry}
      />
    );
  } else if (step === "pro") {
    main = <ProStep headingRef={headingRef} staff={staff} palette={business.palette} staffId={staffId} onPick={choosePro} />;
  } else if (step === "time") {
    main = (
      <TimeStep
        headingRef={headingRef}
        business={business}
        isLaundry={isLaundry}
        dates={dates}
        date={date}
        slot={slot}
        pro={pro}
        price={price}
        cutoff={cutoff}
        notice={notice}
        avail={current}
        onPickDate={pickDate}
        onPickSlot={s => setSlot({ startsAt: s.startsAt, time: s.time })}
        onJump={jumpTo}
        onRetry={() => setReloadToken(t => t + 1)}
        onAnyPro={() => {
          setStaffId("any");
          setSlot(null);
        }}
        onEditServices={() => goTo(0, false)}
      />
    );
  } else {
    const policy = (
      <div className="bk-policy full">
        <b>{onlinePay || needsLogin ? "Your money, held safely" : "Pay when it's done"}</b>
        <span>
          {onlinePay || needsLogin
            ? `Mobile money and card payments wait with ${site.shortName} and reach ${business.name} only after your service is done.`
            : `You pay ${business.name} in cash after your service.`}{" "}
          Free cancellation up to {site.freeCancellationHours} hours before.
        </span>
      </div>
    );
    main = (
      <>
        <h1 className="bk-h1" ref={headingRef} tabIndex={-1}>
          Review and confirm
        </h1>
        <section className="bk-recap" aria-label="Your booking">
          {summary}
        </section>
        {needsLogin ? (
          <div className="bk-form bk-form-login">
            <div className="bk-login">
              {result?.kind === "auth" ? <p className="form-err" role="alert">{result.error}</p> : null}
              <p>
                <b>Almost there.</b> Log in or sign up to confirm. We&apos;ll bring you straight back here with your services and
                time saved.
              </p>
              <Link className="btn btn-black" href={loginUrl}>
                Log in to book
              </Link>
            </div>
            {policy}
          </div>
        ) : (
          <form id="bk-form" className="form-grid bk-form" noValidate onSubmit={onSubmit}>
            <input type="hidden" name="slug" value={business.slug} />
            <input type="hidden" name="serviceIds" value={serviceIds.join(",")} />
            <input type="hidden" name="staffId" value={staffParam} />
            <input type="hidden" name="startsAt" value={slot?.startsAt ?? ""} />
            <input type="hidden" name="location" value={location} />

            <div className="field">
              <label htmlFor="bk-name">Full name</label>
              <input
                id="bk-name"
                name="name"
                autoComplete="name"
                required
                maxLength={80}
                value={details.name}
                onChange={setField("name")}
                onBlur={blur("name")}
                aria-invalid={!!showError("name") || undefined}
                aria-describedby={showError("name") ? "bk-name-err" : undefined}
              />
              {showError("name") && (
                <small className="hint is-error" id="bk-name-err">
                  {showError("name")}
                </small>
              )}
            </div>
            <div className="field">
              <label htmlFor="bk-phone">Phone number</label>
              <input
                id="bk-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                maxLength={20}
                placeholder="0772 123 456"
                value={details.phone}
                onChange={setField("phone")}
                onBlur={blur("phone")}
                aria-invalid={!!showError("phone") || undefined}
                aria-describedby={showError("phone") ? "bk-phone-err" : undefined}
              />
              {showError("phone") && (
                <small className="hint is-error" id="bk-phone-err">
                  {showError("phone")}
                </small>
              )}
            </div>
            {location === "home" && (
              <div className="field full">
                <label htmlFor="bk-address">{isLaundry ? "Pickup address" : "Your address"}</label>
                <input
                  id="bk-address"
                  name="address"
                  autoComplete="street-address"
                  required
                  maxLength={200}
                  placeholder="Plot, street and a landmark, e.g. blue gate opposite Shell Ntinda"
                  value={details.address}
                  onChange={setField("address")}
                  onBlur={blur("address")}
                  aria-invalid={!!showError("address") || undefined}
                  aria-describedby={showError("address") ? "bk-address-err" : undefined}
                />
                {showError("address") && (
                  <small className="hint is-error" id="bk-address-err">
                    {showError("address")}
                  </small>
                )}
              </div>
            )}
            <div className="field full">
              <label htmlFor="bk-notes" className="field-label">
                <span>Notes for {notesFor}</span> <span className="hint">(optional)</span>
              </label>
              <textarea
                id="bk-notes"
                name="notes"
                maxLength={500}
                placeholder={notesPlaceholder[business.categoryId] ?? notesPlaceholder.default}
                value={details.notes}
                onChange={setField("notes")}
              />
            </div>

            {payMethods.length ? (
              <fieldset className="full">
                <legend>How would you like to pay?</legend>
                <div className="bk-pay-grid">
                  {payMethods.map(m => (
                    <label key={m} className="bk-pay">
                      <input type="radio" name="pay" value={m} checked={pay === m} onChange={() => setPay(m)} />
                      <span className={`bk-pay-logo bk-logo-${m}`} aria-hidden="true">
                        {m === "card" ? <Icon name="card" /> : PAY_OPTIONS[m].logo}
                      </span>
                      <span>
                        {PAY_OPTIONS[m].title}
                        <small>{PAY_OPTIONS[m].sub}</small>
                      </span>
                    </label>
                  ))}
                </div>
                {formError?.field === "pay" && (
                  <p className="hint is-error" role="alert">
                    {formError.error}
                  </p>
                )}
              </fieldset>
            ) : (
              <p className="notice notice-warn full">
                <Icon name="alert" />
                <span>Online booking is paused for this venue right now. Try again later, or find another venue.</span>
              </p>
            )}

            {isMobileMoney(pay) && (
              <div className="field full">
                <label htmlFor="bk-momo">{NETWORKS[pay].label} number</label>
                <input
                  id="bk-momo"
                  name="momo"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  maxLength={20}
                  placeholder="Same as phone number above"
                  value={details.momo}
                  onChange={setField("momo")}
                  onBlur={blur("momo")}
                  aria-invalid={!!showError("momo") || undefined}
                  aria-describedby="bk-momo-hint"
                />
                <small className={`hint${showError("momo") ? " is-error" : ""}`} id="bk-momo-hint" aria-live="polite">
                  {showError("momo") || "Leave blank to use your phone number above."}
                </small>
              </div>
            )}

            {policy}

            {formError && formError.field !== "pay" && (
              <div className="bk-form-err full" role="alert">
                <p className="form-err">{formError.error}</p>
                {formError.kind === "invalid" && !formError.field && (
                  <button type="button" className="link-btn" onClick={() => goTo(steps.indexOf("time"), false)}>
                    Pick another time
                  </button>
                )}
              </div>
            )}
          </form>
        )}
      </>
    );
  }

  const count = chosen.length;
  return (
    <div className="bk-flow" data-step={step}>
      <p className="sr-only" role="status" aria-live="polite">
        {pending ? PENDING_LABEL[pay ?? "cash"] : ""}
      </p>
      <div className="bk-shell" inert={pending} aria-busy={pending || undefined}>
        <header className="bk-top">
          {stepIndex === 0 ? (
            <Link className="icon-btn" href={`/v/${business.slug}`} aria-label={`Back to ${business.name}`}>
              <Icon name="left" />
            </Link>
          ) : (
            <button type="button" className="icon-btn" onClick={back} aria-label={`Back to ${STEP_LABELS[steps[stepIndex - 1]]}`}>
              <Icon name="left" />
            </button>
          )}
          <ol className="bk-crumbs" aria-label="Booking steps">
            {steps.map((s, i) => (
              <li
                key={s}
                className={i < stepIndex ? "is-done" : i === stepIndex ? "is-current" : undefined}
                aria-current={i === stepIndex ? "step" : undefined}
              >
                {STEP_LABELS[s]}
                {i === stepIndex && (
                  <span className="sr-only">
                    , step {i + 1} of {steps.length}
                  </span>
                )}
              </li>
            ))}
          </ol>
          <Link className="icon-btn" href={`/v/${business.slug}`} aria-label="Close booking">
            <Icon name="close" />
          </Link>
          <span className="bk-progress" aria-hidden="true">
            <i style={{ width: `${((stepIndex + 1) / (steps.length + 1)) * 100}%` }} />
          </span>
        </header>

        <div className="bk-body">
          <div className="bk-main">{main}</div>
          <aside className="bk-summary" aria-labelledby="bk-sum-title">
            <h2 className="sr-only" id="bk-sum-title">
              Booking summary
            </h2>
            {summary}
            {cta(false)}
          </aside>
        </div>

        <div className="bk-bar">
          <span className="bk-bar-total">
            <b>{ugx(count ? price.total : 0)}</b>
            <small>{count ? `${plural(count, "service")}${price.durationMin ? ` · ${duration(price.durationMin)}` : ""}` : "Pick a service"}</small>
          </span>
          {cta(true)}
        </div>
      </div>
    </div>
  );
}
