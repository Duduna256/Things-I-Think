// The job log as the customer sees it: when the team checked in and out, that a location was
// recorded (never where, exactly), the photos they took and the notes they left. Read-only.

import { Icon, type IconName } from "@shared/components/Icon";
import { KIND_LABEL, locationWording } from "@shared/lib/jobs/rules";
import { formatDate, formatTime, localParts } from "@shared/lib/time";
import type { JobEvent, JobEventKind } from "@shared/lib/types";

const ICON: Record<JobEventKind, IconName> = { checked_in: "pin", checked_out: "check", photo: "camera", note: "chat" };

export function JobTimeline({ events, bookingDate }: { events: JobEvent[]; bookingDate: string }) {
  if (!events.length) return null;
  return (
    <ol className="jl">
      {events.map(e => {
        const day = localParts(e.occurredAt).date;
        return (
          <li key={e.id} className={`jl-ev jl-ev-${e.kind}`}>
            <span className="jl-icon" aria-hidden="true">
              <Icon name={ICON[e.kind]} />
            </span>
            <div className="jl-body">
              <p className="jl-head">
                <b>{KIND_LABEL[e.kind]}</b>
                <time dateTime={e.occurredAt}>
                  {day !== bookingDate && <span className="muted">{formatDate(day)}, </span>}
                  {formatTime(e.occurredAt)}
                </time>
              </p>
              {(e.kind === "checked_in" || e.kind === "checked_out") && (
                <p className="jl-loc muted">
                  <Icon name="pin" />
                  {locationWording(e, { accuracy: false })}
                </p>
              )}
              {e.kind === "photo" &&
                (e.photoUrl ? (
                  <a className="jl-photo" href={e.photoUrl} target="_blank" rel="noopener noreferrer">
                    {/* A short-lived link to the private photo; next/image can't optimise it. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.photoUrl} alt={e.note ? `Photo from the job: ${e.note}` : "Photo from the job"} loading="lazy" />
                  </a>
                ) : (
                  <p className="muted">This photo can&apos;t be shown right now. Reload the page to try again.</p>
                ))}
              {e.note && <p className="jl-note">{e.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
