"use client";

// The equipment and vehicles editor: add, edit, hide and remove items, and see which services
// use each one. Hiding an item takes it out of the count (0 to use) without losing it.

import { useEffect, useId, useRef, useState } from "react";
import { deleteResourceAction, saveResourceAction } from "@/app/(dashboard)/equipment/actions";
import { Icon } from "@shared/components/Icon";
import type { Resource, ResourceKind } from "@shared/lib/types";
import { FieldError, FormMessage, invalid, useSubmit } from "@shared/components/form-bits";
import { useAnnounce } from "@shared/components/Toast";
import { RESOURCE_NAME_MAX, RESOURCE_NOTES_MAX } from "./fields";

export const KIND_LABEL: Record<ResourceKind, string> = { equipment: "Equipment", vehicle: "Vehicle" };

// A sentence listing which services use an item: "Used by Swedish massage and 2 more".
export function usedByText(names: string[]): string {
  if (!names.length) return "No service uses this yet";
  if (names.length <= 2) return `Used by ${names.join(" and ")}`;
  return `Used by ${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

export function EquipmentManager({ businessId, resources, usedBy }: { businessId: string; resources: Resource[]; usedBy: Record<string, string[]> }) {
  const [editing, setEditing] = useState<string | null>(null); // a resource id, "new" or nothing
  const announce = useAnnounce();
  const addBtn = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const items = [...resources].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  const inUse = items.filter(r => r.active).length;

  // The form or row that had focus closes, so the toast takes it (see Toast.tsx).
  const done = (text: string) => {
    setEditing(null);
    announce?.(text);
  };

  return (
    <div className="dash-menu">
      <div className="dash-toolbar">
        <p className="muted">
          {items.length ? `${items.length} ${items.length === 1 ? "item" : "items"}, ${inUse} in use.` : "Nothing listed yet."}
        </p>
        {editing !== "new" && (
          <button ref={addBtn} type="button" className="btn btn-black" onClick={() => setEditing("new")}>
            <Icon name="plus" />
            Add an item
          </button>
        )}
      </div>

      {editing === "new" && (
        <ResourceForm
          businessId={businessId}
          onCancel={() => {
            setEditing(null);
            requestAnimationFrame(() => addBtn.current?.focus());
          }}
          onDone={done}
        />
      )}

      {items.length === 0 && editing !== "new" && (
        <div className="empty">
          <b>Tell us what you have.</b>
          <p>
            List your equipment (massage tables, dryers, washing machines, radios) and vehicles (a patrol car, a delivery bike) with how
            many of each you own. Then say which services use them, and we never let two customers book your only massage table at
            once.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <section aria-labelledby={`${listId}-h`}>
          <h2 id={`${listId}-h`} className="sr-only">
            Equipment and vehicles
          </h2>
          <ul className="dash-rows">
            {items.map(r => (
              <li key={r.id}>
                {editing === r.id ? (
                  <ResourceForm
                    businessId={businessId}
                    item={r}
                    onCancel={() => {
                      setEditing(null);
                      requestAnimationFrame(() => document.getElementById(`edit-${r.id}`)?.focus());
                    }}
                    onDone={done}
                  />
                ) : (
                  <ResourceRow item={r} businessId={businessId} usedBy={usedBy[r.id] ?? []} onEdit={() => setEditing(r.id)} onDeleted={done} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ResourceRow({
  item: r,
  businessId,
  usedBy,
  onEdit,
  onDeleted,
}: {
  item: Resource;
  businessId: string;
  usedBy: string[];
  onEdit: () => void;
  onDeleted: (msg: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const { result, pending, submit, messageRef } = useSubmit(deleteResourceAction, { onDone: r => onDeleted(r.message ?? "Removed.") });
  const question = useRef<HTMLParagraphElement>(null);
  const removeBtn = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);
  const qid = useId();

  useEffect(() => {
    if (confirming) {
      opened.current = true;
      question.current?.focus();
    } else if (opened.current) {
      opened.current = false;
      removeBtn.current?.focus();
    }
  }, [confirming]);

  return (
    <article className={`dash-row eq-row${r.active ? "" : " is-hidden"}`} aria-labelledby={`res-${r.id}`}>
      <span className="eq-icon" aria-hidden="true">
        <Icon name={r.kind === "vehicle" ? "pin" : "wrench"} />
      </span>
      <div className="dash-row-main">
        <h3 id={`res-${r.id}`}>
          {r.name}
          <span className="pill pill-mute">{KIND_LABEL[r.kind]}</span>
          {!r.active && <span className="pill pill-warn">Hidden</span>}
        </h3>
        {r.notes && <p className="muted">{r.notes}</p>}
        <p className="muted eq-used">{usedByText(usedBy)}</p>
      </div>
      <p className="dash-row-len">
        <b className="eq-qty">{r.quantity}</b>
        {r.active ? (r.quantity === 1 ? "unit" : "units") : "hidden, so 0 to use"}
      </p>
      {confirming ? (
        <form className="dash-confirm" onSubmit={submit} role="group" aria-labelledby={qid}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="resourceId" value={r.id} />
          <p id={qid} ref={question} tabIndex={-1}>
            <b>Remove {r.name}?</b>{" "}
            {usedBy.length
              ? `${usedBy.length === 1 ? usedBy[0] + " stops" : usedBy.length + " services stop"} needing it, so bookings no longer wait for one to be free.`
              : "Existing bookings aren't affected."}{" "}
            To keep it on the list but out of use for a while, edit it and untick &ldquo;In use&rdquo; instead.
          </p>
          <div className="dash-confirm-btns">
            <button type="submit" className="btn btn-danger btn-sm" disabled={pending}>
              {pending ? "Removing…" : "Yes, remove"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
          {result && !result.ok && <FormMessage result={result} focusRef={messageRef} />}
        </form>
      ) : (
        <div className="dash-row-btns">
          <button id={`edit-${r.id}`} type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
            <Icon name="edit" />
            Edit<span className="sr-only"> {r.name}</span>
          </button>
          <button ref={removeBtn} type="button" className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>
            <Icon name="trash" />
            Remove<span className="sr-only"> {r.name}</span>
          </button>
        </div>
      )}
    </article>
  );
}

function ResourceForm({ businessId, item, onCancel, onDone }: { businessId: string; item?: Resource; onCancel: () => void; onDone: (msg: string) => void }) {
  const { result, pending, submit, formRef, messageRef, error } = useSubmit(saveResourceAction, { onDone: r => onDone(r.message ?? "Saved.") });
  const id = useId();
  const f = (name: string) => `${id}-${name}`;
  const e = (name: string) => `${id}-${name}-err`;
  const title = useRef<HTMLHeadingElement>(null);
  const Heading = item ? "h3" : "h2";

  useEffect(() => {
    title.current?.focus();
  }, []);

  return (
    <form ref={formRef} className="card dash-form" onSubmit={submit} noValidate aria-labelledby={f("title")}>
      <input type="hidden" name="businessId" value={businessId} />
      {item && <input type="hidden" name="resourceId" value={item.id} />}
      <Heading id={f("title")} ref={title} tabIndex={-1}>
        {item ? `Edit ${item.name}` : "Add equipment or a vehicle"}
      </Heading>
      <div className="form-grid">
        <fieldset className="field full eq-kind" aria-describedby={error("kind") ? e("kind") : undefined}>
          <legend>What is it?</legend>
          <div className="eq-kind-options">
            {(["equipment", "vehicle"] as const).map(k => (
              <label key={k} className="check">
                <input type="radio" name="kind" value={k} defaultChecked={(item?.kind ?? "equipment") === k} />
                {KIND_LABEL[k]}
                <span className="hint">{k === "equipment" ? "(tables, dryers, machines, radios)" : "(cars, vans, bikes)"}</span>
              </label>
            ))}
          </div>
          <FieldError id={e("kind")} error={error("kind")} />
        </fieldset>
        <div className="field">
          <label htmlFor={f("name")}>Name</label>
          <input id={f("name")} name="name" defaultValue={item?.name} maxLength={RESOURCE_NAME_MAX} required autoComplete="off" placeholder="Massage table" {...invalid(e("name"), error("name"))} />
          <FieldError id={e("name")} error={error("name")} />
        </div>
        <div className="field">
          <label htmlFor={f("qty")}>How many you have</label>
          <input id={f("qty")} name="quantity" inputMode="numeric" defaultValue={item ? String(item.quantity) : "1"} maxLength={3} required aria-describedby={error("quantity") ? e("quantity") : f("qty-hint")} aria-invalid={error("quantity") ? true : undefined} />
          <small className="hint" id={f("qty-hint")}>
            Bookings can use up to this many at the same time.
          </small>
          <FieldError id={e("quantity")} error={error("quantity")} />
        </div>
        <div className="field full">
          <label htmlFor={f("notes")}>
            Notes <span className="hint">(optional, just for you)</span>
          </label>
          <input id={f("notes")} name="notes" defaultValue={item?.notes} maxLength={RESOURCE_NOTES_MAX} placeholder="Room 2 table folds, take it for home visits." {...invalid(e("notes"), error("notes"))} />
          <FieldError id={e("notes")} error={error("notes")} />
        </div>
        <label className="check full">
          <input type="checkbox" name="active" defaultChecked={item?.active ?? true} />
          In use
          <span className="hint">(untick while it&apos;s broken or away, and services that need it can&apos;t be booked)</span>
        </label>
      </div>
      <FormMessage result={result} focusRef={messageRef} />
      <div className="dash-form-btns">
        <button type="submit" className="btn btn-black" disabled={pending}>
          {pending ? "Saving…" : item ? "Save changes" : "Add to the list"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={onCancel}>
          Close without saving
        </button>
      </div>
    </form>
  );
}
