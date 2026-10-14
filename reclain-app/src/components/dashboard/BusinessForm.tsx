"use client";

// The business profile form. "create" is the short onboarding version; "update" is Settings
// with every field. The cover preview updates as you type.

import { useId, useState, type CSSProperties } from "react";
import { createBusinessAction } from "@/app/business/onboarding/actions";
import { saveSettingsAction } from "@/app/business/(dashboard)/settings/actions";
import { Cover } from "@/components/Cover";
import { FieldError, FormMessage, invalid, useSubmit } from "./form-bits";
import {
  BLURB_MAX,
  COVER_WORD_MAX,
  COVER_WORDS,
  CURRENT_PALETTE,
  halfHours,
  MOBILE_CATEGORIES,
  PALETTES,
  paletteIdFor,
  VISIT_MODES,
  WEEK,
  type PalettePreset,
} from "./options";
import type { BusinessFormValues } from "./types";

interface AreaOption {
  id: string;
  name: string;
  region: string;
}

export function BusinessForm({
  mode,
  businessId,
  initial,
  categories,
  areas,
  flags,
}: {
  mode: "create" | "update";
  businessId?: string;
  initial: BusinessFormValues;
  categories: { id: string; name: string }[];
  areas: AreaOption[];
  flags: { homeVisits: boolean; cash: boolean };
}) {
  const { result, pending, submit, formRef, messageRef, error } = useSubmit(mode === "create" ? createBusinessAction : saveSettingsAction);
  const uid = useId();
  const e = (name: string) => `${uid}-${name}-err`;

  const [name, setName] = useState(initial.name);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [areaId, setAreaId] = useState(initial.areaId);
  const [visitMode, setVisitMode] = useState(initial.visitMode);
  const [modeTouched, setModeTouched] = useState(mode === "update");
  const [opensAt, setOpensAt] = useState(initial.opensAt);
  const [closesAt, setClosesAt] = useState(initial.closesAt);
  const [coverWord, setCoverWord] = useState(initial.coverWord);
  const [wordTouched, setWordTouched] = useState(mode === "update" || initial.coverWord !== "");
  const [blurbLength, setBlurbLength] = useState(initial.blurb.length);

  // Ten presets, plus the colours the business has now if they aren't one of them.
  const currentId = paletteIdFor(initial.palette);
  const palettes: PalettePreset[] =
    currentId === CURRENT_PALETTE && mode === "update"
      ? [{ id: CURRENT_PALETTE, name: "Your current colours", colors: initial.palette }, ...PALETTES]
      : PALETTES;
  const [paletteId, setPaletteId] = useState(currentId === CURRENT_PALETTE && mode === "create" ? PALETTES[0].id : currentId);
  const colors = palettes.find(p => p.id === paletteId)?.colors ?? PALETTES[0].colors;

  // Only offer "Both" when home visits are switched on (or the business already uses it).
  const modes = VISIT_MODES.filter(m => m.value !== "both" || flags.homeVisits || initial.visitMode === "both");
  const regions = [...new Set(areas.map(a => a.region))];
  const opens = halfHours(initial.opensAt);
  const closes = halfHours(initial.closesAt);
  const hoursClash = closesAt <= opensAt;

  const pickCategory = (id: string) => {
    setCategoryId(id);
    // Helpful defaults while signing up, until the person changes them.
    if (!wordTouched) setCoverWord(COVER_WORDS[id] ?? "");
    if (!modeTouched) setVisitMode(MOBILE_CATEGORIES.includes(id) ? "mobile" : "salon");
  };

  const area = areas.find(a => a.id === areaId);
  const categoryName = categories.find(c => c.id === categoryId)?.name;
  const errorCount = result && !result.ok && result.errors ? Object.keys(result.errors).length : 0;

  return (
    <form ref={formRef} className="dash-bform" onSubmit={submit} noValidate>
      {businessId && <input type="hidden" name="businessId" value={businessId} />}

      <fieldset className="card dash-fieldset">
        <legend>{mode === "create" ? "About your business" : "The basics"}</legend>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="bf-name">{mode === "create" ? "Business name (or yours)" : "Business name"}</label>
            <input
              id="bf-name"
              name="name"
              value={name}
              onChange={ev => setName(ev.target.value)}
              maxLength={80}
              required
              autoComplete="organization"
              placeholder="The Braid Republic"
              {...invalid(e("name"), error("name"))}
            />
            <FieldError id={e("name")} error={error("name")} />
          </div>
          <div className="field">
            <label htmlFor="bf-category">What you do</label>
            <select id="bf-category" name="categoryId" value={categoryId} onChange={ev => pickCategory(ev.target.value)} required {...invalid(e("categoryId"), error("categoryId"))}>
              <option value="" disabled>
                Choose one
              </option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError id={e("categoryId")} error={error("categoryId")} />
          </div>
          <div className="field">
            <label htmlFor="bf-area">Area</label>
            <select id="bf-area" name="areaId" value={areaId} onChange={ev => setAreaId(ev.target.value)} required {...invalid(e("areaId"), error("areaId"))}>
              <option value="" disabled>
                Choose your area
              </option>
              {regions.map(r => (
                <optgroup key={r} label={r}>
                  {areas
                    .filter(a => a.region === r)
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <FieldError id={e("areaId")} error={error("areaId")} />
          </div>
          <div className="field full">
            <label htmlFor="blurb" className="field-label">
              A line or two about you <span className="hint">(optional)</span>
            </label>
            <textarea
              id="blurb"
              name="blurb"
              defaultValue={initial.blurb}
              maxLength={BLURB_MAX}
              rows={3}
              onInput={ev => setBlurbLength(ev.currentTarget.value.length)}
              placeholder="Neat parts, gentle hands and a playlist good enough for a six-hour boho."
              aria-describedby={error("blurb") ? e("blurb") : `${uid}-blurb-count`}
              aria-invalid={error("blurb") ? true : undefined}
            />
            <small className="hint" id={`${uid}-blurb-count`}>
              {blurbLength} of {BLURB_MAX} characters. Shown at the top of your page.
            </small>
            <FieldError id={e("blurb")} error={error("blurb")} />
          </div>
          {mode === "update" && (
            <div className="field full">
              <label htmlFor="address">
                Address <span className="hint">(optional)</span>
              </label>
              <input
                id="address"
                name="address"
                defaultValue={initial.address}
                maxLength={200}
                autoComplete="street-address"
                placeholder="Plot 12, Ntinda Road, opposite the petrol station"
                aria-describedby={error("address") ? e("address") : `${uid}-address-hint`}
                aria-invalid={error("address") ? true : undefined}
              />
              <small className="hint" id={`${uid}-address-hint`}>
                Directions people can follow. Landmarks beat plot numbers.
              </small>
              <FieldError id={e("address")} error={error("address")} />
            </div>
          )}
          <div className="field">
            <label htmlFor="phone">
              Mobile number {mode === "update" && <span className="hint">(optional)</span>}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={initial.phone}
              placeholder="0772 123 456"
              required={mode === "create"}
              aria-describedby={error("phone") ? e("phone") : `${uid}-phone-hint`}
              aria-invalid={error("phone") ? true : undefined}
            />
            <small className="hint" id={`${uid}-phone-hint`}>
              We text new bookings here. Customers see it on their booking.
            </small>
            <FieldError id={e("phone")} error={error("phone")} />
          </div>
        </div>
      </fieldset>

      <fieldset className="card dash-fieldset" aria-describedby={error("visitMode") ? e("visitMode") : undefined}>
        <legend>Where bookings happen</legend>
        <div className="dash-options">
          {modes.map(m => (
            <label key={m.value} className="dash-option">
              <input
                type="radio"
                name="visitMode"
                value={m.value}
                checked={visitMode === m.value}
                onChange={() => {
                  setVisitMode(m.value);
                  setModeTouched(true);
                }}
              />
              <span>
                <b>{m.title}</b>
                <span className="muted">{m.body}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError id={e("visitMode")} error={error("visitMode")} />
        {visitMode === "both" && (
          <div className="field dash-fee">
            <label htmlFor="bf-fee">Home-visit fee (UGX)</label>
            <input
              id="bf-fee"
              name="homeVisitFee"
              inputMode="numeric"
              defaultValue={String(initial.homeVisitFee)}
              aria-describedby={error("homeVisitFee") ? e("homeVisitFee") : `${uid}-fee-hint`}
              aria-invalid={error("homeVisitFee") ? true : undefined}
            />
            <small className="hint" id={`${uid}-fee-hint`}>
              Added to the bill when a customer picks &ldquo;At my place&rdquo;. Use 0 for free home visits.
            </small>
            <FieldError id={e("homeVisitFee")} error={error("homeVisitFee")} />
          </div>
        )}
      </fieldset>

      <fieldset className="card dash-fieldset">
        <legend>Opening hours</legend>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="bf-opens">Opens at</label>
            <select id="bf-opens" name="opensAt" value={opensAt} onChange={ev => setOpensAt(ev.target.value)} {...invalid(e("opensAt"), error("opensAt"))}>
              {opens.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <FieldError id={e("opensAt")} error={error("opensAt")} />
          </div>
          <div className="field">
            <label htmlFor="bf-closes">Closes at</label>
            <select
              id="bf-closes"
              name="closesAt"
              value={closesAt}
              onChange={ev => setClosesAt(ev.target.value)}
              aria-invalid={error("closesAt") || hoursClash ? true : undefined}
              aria-describedby={error("closesAt") || hoursClash ? e("closesAt") : undefined}
            >
              {closes.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <FieldError id={e("closesAt")} error={error("closesAt") ?? (hoursClash ? "Closing time must be after opening time." : undefined)} />
          </div>
        </div>
        <fieldset className="dash-subfieldset" aria-describedby={error("closedDays") ? e("closedDays") : `${uid}-days-hint`}>
          <legend>Closed on</legend>
          <div className="dash-daychips">
            {WEEK.map(d => (
              <label key={d.day} className="dash-daychip">
                <input type="checkbox" name="closedDays" value={d.day} defaultChecked={initial.closedDays.includes(d.day)} />
                <span aria-hidden="true">{d.short}</span>
                <span className="sr-only">{d.long}</span>
              </label>
            ))}
          </div>
          <small className="hint" id={`${uid}-days-hint`}>
            Tick the days you don&apos;t take bookings. Times are Kampala time.
          </small>
          <FieldError id={e("closedDays")} error={error("closedDays")} />
        </fieldset>
      </fieldset>

      {mode === "update" && (
        <fieldset className="card dash-fieldset">
          <legend>Booking options</legend>
          {flags.cash && (
            <label className="check dash-check-row">
              <input type="checkbox" name="acceptsCash" defaultChecked={initial.acceptsCash} />
              <span>
                <b>Take cash after the service</b>
                <span className="muted">Cash bookings are confirmed straight away. Mark them paid here when the money&apos;s in your hand.</span>
              </span>
            </label>
          )}
          <label className="check dash-check-row">
            <input type="checkbox" name="skipProfessional" defaultChecked={initial.skipProfessional} />
            <span>
              <b>Skip the &ldquo;pick a professional&rdquo; step</b>
              <span className="muted">Customers book a time and we give it to whoever is free. Good for laundry, cleaning crews and call-outs.</span>
            </span>
          </label>
        </fieldset>
      )}

      <fieldset className="card dash-fieldset">
        <legend>Your cover</legend>
        <p className="muted dash-fieldset-note">Until you add photos, your card is a splash of colour with one big word. Make it yours.</p>
        <div className="dash-cover-grid">
          <div className="dash-cover-fields">
            <div className="field">
              <label htmlFor="bf-word">Cover word</label>
              <input
                id="bf-word"
                name="coverWord"
                value={coverWord}
                maxLength={COVER_WORD_MAX}
                onChange={ev => {
                  setCoverWord(ev.target.value);
                  setWordTouched(true);
                }}
                placeholder="braids"
                aria-describedby={error("coverWord") ? e("coverWord") : `${uid}-word-hint`}
                aria-invalid={error("coverWord") ? true : undefined}
              />
              <small className="hint" id={`${uid}-word-hint`}>
                {coverWord.length} of {COVER_WORD_MAX} characters. One word works best.
              </small>
              <FieldError id={e("coverWord")} error={error("coverWord")} />
            </div>
            <fieldset className="dash-subfieldset" aria-describedby={error("palette") ? e("palette") : undefined}>
              <legend>Colours</legend>
              <div className="dash-swatches">
                {palettes.map(p => (
                  <label key={p.id} className="dash-swatch">
                    <input type="radio" name="palette" value={p.id} checked={paletteId === p.id} onChange={() => setPaletteId(p.id)} />
                    <span className="dash-swatch-art" aria-hidden="true" style={{ "--c1": p.colors[0], "--c2": p.colors[1], "--c3": p.colors[2] } as CSSProperties} />
                    <span className="dash-swatch-name">{p.name}</span>
                  </label>
                ))}
              </div>
              <FieldError id={e("palette")} error={error("palette")} />
            </fieldset>
          </div>
          <figure className="dash-preview">
            <div className="vcard" aria-hidden="true">
              <Cover palette={colors} word={coverWord.trim() || "hello"} badge={<span className="cover-badge">New</span>} />
              <div className="vcard-body">
                <span className="vcard-name">{name.trim() || "Your business"}</span>
                <span className="vcard-area">{area ? (area.region === area.name ? area.name : `${area.name}, ${area.region}`) : "Your area"}</span>
                {categoryName && <span className="tag">{categoryName}</span>}
              </div>
            </div>
            <figcaption className="hint">How your card looks in search.</figcaption>
          </figure>
        </div>
      </fieldset>

      <div className="dash-submit">
        <FormMessage
          focusRef={messageRef}
          result={
            errorCount
              ? { message: errorCount === 1 ? "One field needs a look. It's highlighted above." : `${errorCount} fields need a look. They're highlighted above.` }
              : result
          }
        />
        <button type="submit" className="btn btn-black" disabled={pending}>
          {pending ? (mode === "create" ? "Creating…" : "Saving…") : mode === "create" ? "Create my business" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
