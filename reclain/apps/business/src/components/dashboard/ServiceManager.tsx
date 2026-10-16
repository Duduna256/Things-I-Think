"use client";

// The menu editor: services grouped like the public page, add and edit in place, and delete
// with a confirm step.

import { useEffect, useId, useRef, useState } from "react";
import { deleteServiceAction, saveServiceAction } from "@/app/(dashboard)/services/actions";
import { durationLabel, plural, ugx } from "@shared/lib/format";
import { Icon } from "@shared/components/Icon";
import type { Resource, Service, ServiceResourceNeed } from "@shared/lib/types";
import { FieldError, FormMessage, invalid, useSubmit } from "@shared/components/form-bits";
import { useAnnounce } from "@shared/components/Toast";
import { durationOptions, halfHours } from "./options";
import { PEOPLE_NEEDED_MAX, resourceField } from "../equipment/fields";

interface Group {
  name: string;
  services: Service[];
}

function groupServices(services: Service[]): Group[] {
  const groups: Group[] = [];
  for (const s of [...services].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))) {
    const name = s.groupName.trim() || "Services";
    let g = groups.find(x => x.name === name);
    if (!g) groups.push((g = { name, services: [] }));
    g.services.push(s);
  }
  return groups;
}

// What a service needs beyond one person, in words: "2 people · 2 massage tables".
export function needsText(service: Pick<Service, "peopleNeeded">, needs: ServiceResourceNeed[], resources: Resource[]): string {
  const parts: string[] = [];
  if (service.peopleNeeded > 1) parts.push(`${service.peopleNeeded} people`);
  for (const n of needs) {
    const r = resources.find(x => x.id === n.resourceId);
    if (!r) continue;
    parts.push(plural(n.quantity, r.name.toLowerCase()));
  }
  return parts.join(" · ");
}

export function ServiceManager({
  businessId,
  services,
  opensAt,
  closesAt,
  teamSize,
  resources,
  needs,
}: {
  businessId: string;
  services: Service[];
  opensAt: string;
  closesAt: string;
  teamSize: number; // people taking bookings, so a service can't quietly need more than that
  resources: Resource[]; // the business's equipment and vehicles
  needs: Record<string, ServiceResourceNeed[]>; // what each service uses now, by service id
}) {
  const [editing, setEditing] = useState<string | null>(null); // a service id, "new" or nothing
  const announce = useAnnounce();
  const addBtn = useRef<HTMLButtonElement>(null);
  const groups = groupServices(services);
  const groupNames = groups.map(g => g.name);
  const shared = { teamSize, resources };

  // The form or row that had focus closes, so the toast takes it (see Toast.tsx).
  const done = (text: string) => {
    setEditing(null);
    announce?.(text);
  };

  return (
    <div className="dash-menu">
      <div className="dash-toolbar">
        <p className="muted">
          {services.length
            ? `${services.length} ${services.length === 1 ? "service" : "services"}, ${services.filter(s => s.active).length} on show.`
            : "Nothing on the menu yet."}
        </p>
        {editing !== "new" && (
          <button ref={addBtn} type="button" className="btn btn-black" onClick={() => setEditing("new")}>
            <Icon name="plus" />
            Add a service
          </button>
        )}
      </div>

      {editing === "new" && (
        <ServiceForm
          businessId={businessId}
          groupNames={groupNames}
          opensAt={opensAt}
          closesAt={closesAt}
          {...shared}
          needs={[]}
          onCancel={() => {
            setEditing(null);
            requestAnimationFrame(() => addBtn.current?.focus());
          }}
          onDone={done}
        />
      )}

      {groups.length === 0 && editing !== "new" && (
        <div className="empty">
          <b>Your menu is empty.</b>
          <p>Add your first service so customers have something to book. Start with the one people ask for most.</p>
        </div>
      )}

      {groups.map(g => (
        <section key={g.name} className="dash-group" aria-labelledby={`grp-${slug(g.name)}`}>
          <h2 id={`grp-${slug(g.name)}`}>{g.name}</h2>
          <ul className="dash-rows">
            {g.services.map(s => (
              <li key={s.id}>
                {editing === s.id ? (
                  <ServiceForm
                    businessId={businessId}
                    service={s}
                    groupNames={groupNames}
                    opensAt={opensAt}
                    closesAt={closesAt}
                    {...shared}
                    needs={needs[s.id] ?? []}
                    onCancel={() => {
                      setEditing(null);
                      requestAnimationFrame(() => document.getElementById(`edit-${s.id}`)?.focus());
                    }}
                    onDone={done}
                  />
                ) : (
                  <ServiceRow
                    service={s}
                    businessId={businessId}
                    needs={needsText(s, needs[s.id] ?? [], resources)}
                    onEdit={() => setEditing(s.id)}
                    onDeleted={done}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function ServiceRow({
  service: s,
  businessId,
  needs,
  onEdit,
  onDeleted,
}: {
  service: Service;
  businessId: string;
  needs: string; // "2 people · 1 patrol car", or empty
  onEdit: () => void;
  onDeleted: (msg: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const { result, pending, submit, messageRef } = useSubmit(deleteServiceAction, { onDone: r => onDeleted(r.message ?? "Deleted.") });
  const question = useRef<HTMLParagraphElement>(null);
  const deleteBtn = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);
  const qid = useId();

  useEffect(() => {
    if (confirming) {
      opened.current = true;
      question.current?.focus();
    } else if (opened.current) {
      opened.current = false;
      deleteBtn.current?.focus();
    }
  }, [confirming]);

  return (
    <article className={`dash-row${s.active ? "" : " is-hidden"}`} aria-labelledby={`svc-${s.id}`}>
      <div className="dash-row-main">
        <h3 id={`svc-${s.id}`}>
          {s.name}
          {!s.active && <span className="pill pill-mute">Hidden</span>}
        </h3>
        {s.description && <p className="muted">{s.description}</p>}
        {s.latestStart && <p className="dash-row-note">Last start {s.latestStart}</p>}
        {needs && (
          <p className="muted">
            <Icon name="users" className="ic dash-row-ic" />
            Needs {needs}
          </p>
        )}
      </div>
      <p className="dash-row-len">
        <Icon name="clock" />
        {durationLabel(s) || "No set time"}
      </p>
      <p className="dash-row-price">{s.price === 0 ? "Free" : ugx(s.price)}</p>
      {confirming ? (
        <form className="dash-confirm" onSubmit={submit} role="group" aria-labelledby={qid}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="serviceId" value={s.id} />
          <p id={qid} ref={question} tabIndex={-1}>
            <b>Delete {s.name}?</b> Past bookings keep their details. To take it off the menu for a while, edit it and untick &ldquo;Show on your menu&rdquo; instead.
          </p>
          <div className="dash-confirm-btns">
            <button type="submit" className="btn btn-danger btn-sm" disabled={pending}>
              {pending ? "Deleting…" : "Yes, delete it"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
          {result && !result.ok && <FormMessage result={result} focusRef={messageRef} />}
        </form>
      ) : (
        <div className="dash-row-btns">
          <button id={`edit-${s.id}`} type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
            <Icon name="edit" />
            Edit<span className="sr-only"> {s.name}</span>
          </button>
          <button ref={deleteBtn} type="button" className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>
            <Icon name="trash" />
            Delete<span className="sr-only"> {s.name}</span>
          </button>
        </div>
      )}
    </article>
  );
}

function ServiceForm({
  businessId,
  service,
  groupNames,
  opensAt,
  closesAt,
  teamSize,
  resources,
  needs,
  onCancel,
  onDone,
}: {
  businessId: string;
  service?: Service;
  groupNames: string[];
  opensAt: string;
  closesAt: string;
  teamSize: number;
  resources: Resource[];
  needs: ServiceResourceNeed[];
  onCancel: () => void;
  onDone: (msg: string) => void;
}) {
  const { result, pending, submit, formRef, messageRef, error } = useSubmit(saveServiceAction, { onDone: r => onDone(r.message ?? "Saved.") });
  const id = useId();
  const f = (name: string) => `${id}-${name}`;
  const e = (name: string) => `${id}-${name}-err`;
  const title = useRef<HTMLHeadingElement>(null);
  // A new service's form sits above the groups (h2); an edit sits inside one (h3).
  const Heading = service ? "h3" : "h2";
  // Start times while you're open (a start at closing time could never be booked), plus the
  // service's own one so it isn't silently dropped after the hours change.
  const times = halfHours(service?.latestStart).filter(t => t === service?.latestStart || (t >= opensAt && t < closesAt));

  // Land on the form when it opens, so keyboard users don't have to hunt for it.
  useEffect(() => {
    title.current?.focus();
  }, []);

  return (
    <form ref={formRef} className="card dash-form" onSubmit={submit} noValidate aria-labelledby={f("title")}>
      <input type="hidden" name="businessId" value={businessId} />
      {service && <input type="hidden" name="serviceId" value={service.id} />}
      <Heading id={f("title")} ref={title} tabIndex={-1}>
        {service ? `Edit ${service.name}` : "Add a service"}
      </Heading>
      <div className="form-grid">
        <div className="field">
          <label htmlFor={f("name")}>Name</label>
          <input id={f("name")} name="name" defaultValue={service?.name} maxLength={80} required placeholder="Knotless braids, mid-back" {...invalid(e("name"), error("name"))} />
          <FieldError id={e("name")} error={error("name")} />
        </div>
        <div className="field">
          <label htmlFor={f("group")}>
            Group <span className="hint">(optional)</span>
          </label>
          <input id={f("group")} name="groupName" list={f("groups")} defaultValue={service?.groupName} maxLength={40} placeholder="Braids" {...invalid(e("groupName"), error("groupName"))} />
          <datalist id={f("groups")}>
            {groupNames.map(g => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <FieldError id={e("groupName")} error={error("groupName")} />
        </div>
        <div className="field full">
          <label htmlFor={f("desc")}>
            Description <span className="hint">(optional)</span>
          </label>
          <textarea id={f("desc")} name="description" defaultValue={service?.description} maxLength={300} rows={2} placeholder="What's included, how long it lasts, what to bring." {...invalid(e("description"), error("description"))} />
          <FieldError id={e("description")} error={error("description")} />
        </div>
        <div className="field">
          <label htmlFor={f("dur")}>How long it takes</label>
          <select id={f("dur")} name="durationMin" defaultValue={String(service?.durationMin ?? 60)} {...invalid(e("durationMin"), error("durationMin"))}>
            {durationOptions(service?.durationMin).map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <FieldError id={e("durationMin")} error={error("durationMin")} />
        </div>
        <div className="field">
          <label htmlFor={f("lab")}>
            Length note <span className="hint">(optional)</span>
          </label>
          <input id={f("lab")} name="durationLabel" defaultValue={service?.durationLabel ?? ""} maxLength={40} placeholder="Back next working day" aria-describedby={error("durationLabel") ? e("durationLabel") : f("lab-hint")} aria-invalid={error("durationLabel") ? true : undefined} />
          <small className="hint" id={f("lab-hint")}>
            Shown instead of the time, for things like laundry.
          </small>
          <FieldError id={e("durationLabel")} error={error("durationLabel")} />
        </div>
        <div className="field">
          <label htmlFor={f("price")}>Price (UGX)</label>
          <input id={f("price")} name="price" inputMode="numeric" defaultValue={service ? String(service.price) : ""} placeholder="45000" required {...invalid(e("price"), error("price"))} />
          <FieldError id={e("price")} error={error("price")} />
        </div>
        <div className="field">
          <label htmlFor={f("latest")}>
            Latest start time <span className="hint">(optional)</span>
          </label>
          <select id={f("latest")} name="latestStart" defaultValue={service?.latestStart ?? ""} aria-describedby={error("latestStart") ? e("latestStart") : f("latest-hint")} aria-invalid={error("latestStart") ? true : undefined}>
            <option value="">Any time we&apos;re open</option>
            {times.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <small className="hint" id={f("latest-hint")}>
            For things that must start early, like same-day laundry.
          </small>
          <FieldError id={e("latestStart")} error={error("latestStart")} />
        </div>
        <div className="field">
          <label htmlFor={f("people")}>People on the job</label>
          <select id={f("people")} name="peopleNeeded" defaultValue={String(service?.peopleNeeded ?? 1)} aria-describedby={error("peopleNeeded") ? e("peopleNeeded") : f("people-hint")} aria-invalid={error("peopleNeeded") ? true : undefined}>
            {Array.from({ length: PEOPLE_NEEDED_MAX }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>
                {n === 1 ? "1 person" : `${n} people`}
                {n > teamSize ? " (more than your team)" : ""}
              </option>
            ))}
          </select>
          <small className="hint" id={f("people-hint")}>
            A time is only offered when this many of your team are free. You have {teamSize} taking bookings.
          </small>
          <FieldError id={e("peopleNeeded")} error={error("peopleNeeded")} />
        </div>
        {resources.length > 0 && (
          <fieldset className="field full dash-needs">
            <legend>
              Equipment and vehicles it uses <span className="hint">(0 for none)</span>
            </legend>
            <div className="dash-needs-grid">
              {resources.map(r => {
                const key = resourceField(r.id);
                const current = needs.find(n => n.resourceId === r.id)?.quantity ?? 0;
                return (
                  <div className="field" key={r.id}>
                    <label htmlFor={f(key)}>
                      {r.name} <span className="hint">(you have {r.active ? r.quantity : `${r.quantity}, hidden`})</span>
                    </label>
                    <input id={f(key)} name={key} inputMode="numeric" defaultValue={String(current)} maxLength={3} {...invalid(e(key), error(key))} />
                    <FieldError id={e(key)} error={error(key)} />
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}
        <label className="check full">
          <input type="checkbox" name="active" defaultChecked={service?.active ?? true} />
          Show on your menu
        </label>
      </div>
      <FormMessage result={result} focusRef={messageRef} />
      <div className="dash-form-btns">
        <button type="submit" className="btn btn-black" disabled={pending}>
          {pending ? "Saving…" : service ? "Save changes" : "Add to menu"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={onCancel}>
          Close without saving
        </button>
      </div>
    </form>
  );
}
