"use client";

// The team editor: add, edit and remove people. The last person taking bookings can't be
// removed or hidden, because every booking needs someone to go to.

import { useEffect, useId, useRef, useState } from "react";
import { deleteStaffAction, saveStaffAction } from "@/app/(dashboard)/team/actions";
import { initials } from "@shared/lib/format";
import { Icon } from "@shared/components/Icon";
import type { Staff } from "@shared/lib/types";
import { FieldError, FormMessage, invalid, useSubmit } from "@shared/components/form-bits";
import { useAnnounce } from "@shared/components/Toast";
import { leavesNobodyActive } from "./logic";

export function TeamManager({ businessId, staff, upcoming }: { businessId: string; staff: Staff[]; upcoming: Record<string, number> }) {
  const [editing, setEditing] = useState<string | null>(null);
  const announce = useAnnounce();
  const addBtn = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const team = [...staff].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  const active = team.filter(s => s.active).length;

  // The form or row that had focus closes, so the toast takes it (see Toast.tsx).
  const done = (text: string) => {
    setEditing(null);
    announce?.(text);
  };

  return (
    <div className="dash-menu">
      <div className="dash-toolbar">
        <p className="muted">
          {team.length ? `${team.length} ${team.length === 1 ? "person" : "people"}, ${active} taking bookings.` : "Nobody on the team yet."}
        </p>
        {editing !== "new" && (
          <button ref={addBtn} type="button" className="btn btn-black" onClick={() => setEditing("new")}>
            <Icon name="plus" />
            Add someone
          </button>
        )}
      </div>

      {editing === "new" && (
        <StaffForm
          businessId={businessId}
          lastActive={false}
          onCancel={() => {
            setEditing(null);
            requestAnimationFrame(() => addBtn.current?.focus());
          }}
          onDone={done}
        />
      )}

      {team.length === 0 && editing !== "new" && (
        <div className="empty">
          <b>Nobody on the team yet.</b>
          <p>Add at least one person so bookings have someone to go to. That can be you.</p>
        </div>
      )}

      {team.length > 0 && (
        <section aria-labelledby={`${listId}-h`}>
          <h2 id={`${listId}-h`} className="sr-only">
            People on the team
          </h2>
          <ul className="dash-rows dash-team">
            {team.map(s => {
              // The only person taking bookings: can't be removed or switched off.
              const lastActive = leavesNobodyActive(team, { id: s.id, remove: true });
              return (
                <li key={s.id}>
                  {editing === s.id ? (
                    <StaffForm
                      businessId={businessId}
                      member={s}
                      lastActive={lastActive}
                      onCancel={() => {
                        setEditing(null);
                        requestAnimationFrame(() => document.getElementById(`edit-${s.id}`)?.focus());
                      }}
                      onDone={done}
                    />
                  ) : (
                    <StaffRow member={s} businessId={businessId} lastActive={lastActive} upcoming={upcoming[s.id] ?? 0} onEdit={() => setEditing(s.id)} onDeleted={done} />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function StaffRow({
  member: s,
  businessId,
  lastActive,
  upcoming,
  onEdit,
  onDeleted,
}: {
  member: Staff;
  businessId: string;
  lastActive: boolean;
  upcoming: number;
  onEdit: () => void;
  onDeleted: (msg: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const { result, pending, submit, messageRef } = useSubmit(deleteStaffAction, { onDone: r => onDeleted(r.message ?? "Removed.") });
  const question = useRef<HTMLParagraphElement>(null);
  const removeBtn = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);
  const qid = useId();
  const first = s.name.split(" ")[0];

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
    <article className={`dash-row dash-person${s.active ? "" : " is-hidden"}`} aria-labelledby={`st-${s.id}`}>
      <span className="avatar" aria-hidden="true">
        {initials(s.name)}
      </span>
      <div className="dash-row-main">
        <h3 id={`st-${s.id}`}>{s.name}</h3>
        <p className="muted">{s.role || "No role set"}</p>
      </div>
      <p className="dash-row-len">
        {s.active ? <span className="pill pill-ok">Taking bookings</span> : <span className="pill pill-mute">Not taking bookings</span>}
        {upcoming > 0 && <span className="muted">{upcoming} upcoming</span>}
      </p>
      {confirming ? (
        lastActive ? (
          <div className="dash-confirm" role="group" aria-labelledby={qid}>
            <p id={qid} ref={question} tabIndex={-1}>
              <b>{first} is the only person taking bookings.</b> Bookings need someone to go to, so add someone else first.
            </p>
            <div className="dash-confirm-btns">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                Got it
              </button>
            </div>
          </div>
        ) : (
          <form className="dash-confirm" onSubmit={submit} role="group" aria-labelledby={qid}>
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="staffId" value={s.id} />
            <p id={qid} ref={question} tabIndex={-1}>
              <b>Remove {s.name} from the team?</b>{" "}
              {upcoming > 0
                ? `${first} has ${upcoming} upcoming ${upcoming === 1 ? "booking" : "bookings"}. They stay booked, just without a name on them.`
                : "Past bookings keep their details."}{" "}
              To pause {first} instead, edit them and untick &ldquo;Taking bookings&rdquo;.
            </p>
            <div className="dash-confirm-btns">
              <button type="submit" className="btn btn-danger btn-sm" disabled={pending}>
                {pending ? "Removing…" : "Yes, remove"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setConfirming(false)}>
                Keep {first}
              </button>
            </div>
            {result && !result.ok && <FormMessage result={result} focusRef={messageRef} />}
          </form>
        )
      ) : (
        <div className="dash-row-btns">
          <button id={`edit-${s.id}`} type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
            <Icon name="edit" />
            Edit<span className="sr-only"> {s.name}</span>
          </button>
          <button ref={removeBtn} type="button" className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>
            <Icon name="trash" />
            Remove<span className="sr-only"> {s.name}</span>
          </button>
        </div>
      )}
    </article>
  );
}

function StaffForm({
  businessId,
  member,
  lastActive,
  onCancel,
  onDone,
}: {
  businessId: string;
  member?: Staff;
  lastActive: boolean;
  onCancel: () => void;
  onDone: (msg: string) => void;
}) {
  const { result, pending, submit, formRef, messageRef, error } = useSubmit(saveStaffAction, { onDone: r => onDone(r.message ?? "Saved.") });
  const id = useId();
  const f = (name: string) => `${id}-${name}`;
  const e = (name: string) => `${id}-${name}-err`;
  const title = useRef<HTMLHeadingElement>(null);
  const Heading = member ? "h3" : "h2";

  useEffect(() => {
    title.current?.focus();
  }, []);

  return (
    <form ref={formRef} className="card dash-form" onSubmit={submit} noValidate aria-labelledby={f("title")}>
      <input type="hidden" name="businessId" value={businessId} />
      {member && <input type="hidden" name="staffId" value={member.id} />}
      <Heading id={f("title")} ref={title} tabIndex={-1}>
        {member ? `Edit ${member.name}` : "Add someone to the team"}
      </Heading>
      <div className="form-grid">
        <div className="field">
          <label htmlFor={f("name")}>Name</label>
          <input id={f("name")} name="name" defaultValue={member?.name} maxLength={60} required autoComplete="off" placeholder="Joy Kemigisha" {...invalid(e("name"), error("name"))} />
          <FieldError id={e("name")} error={error("name")} />
        </div>
        <div className="field">
          <label htmlFor={f("role")}>
            Role <span className="hint">(optional)</span>
          </label>
          <input id={f("role")} name="role" defaultValue={member?.role} maxLength={40} placeholder="Senior braider" {...invalid(e("role"), error("role"))} />
          <FieldError id={e("role")} error={error("role")} />
        </div>
        <div className="full">
          {lastActive ? (
            <>
              {/* Kept on: the server refuses to switch off the last person taking bookings. */}
              <input type="hidden" name="active" value="on" />
              <p className="check" id={f("active-note")}>
                <Icon name="check" />
                Taking bookings. {member?.name.split(" ")[0]} is the only one, so this stays on until you add someone else.
              </p>
            </>
          ) : (
            <label className="check">
              <input type="checkbox" name="active" defaultChecked={member?.active ?? true} {...invalid(e("active"), error("active"))} />
              Taking bookings
            </label>
          )}
          <FieldError id={e("active")} error={error("active")} />
        </div>
      </div>
      <FormMessage result={result} focusRef={messageRef} />
      <div className="dash-form-btns">
        <button type="submit" className="btn btn-black" disabled={pending}>
          {pending ? "Saving…" : member ? "Save changes" : "Add to the team"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={onCancel}>
          Close without saving
        </button>
      </div>
    </form>
  );
}
