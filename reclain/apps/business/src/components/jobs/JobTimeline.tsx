// The job log as the business sees it: every entry in order, with the time (Kampala), where
// the phone was and how sure it was, the photo, and any note. Rendered on the server; photo
// links are short-lived signed URLs (or data URLs in demo mode).

import { Icon, type IconName } from "@shared/components/Icon";
import { KIND_LABEL, locationWording, mapLink } from "@shared/lib/jobs/rules";
import { formatDate, formatTime, localParts } from "@shared/lib/time";
import type { JobEvent, JobEventKind } from "@shared/lib/types";

const ICON: Record<JobEventKind, IconName> = { checked_in: "pin", checked_out: "check", photo: "eye", note: "chat" };

export function JobTimeline({ events, bookingDate, staffNames }: { events: JobEvent[]; bookingDate: string; staffNames: Record<string, string> }) {
  return (
    <ol className="job-tl">
      {events.map(e => {
        const day = localParts(e.occurredAt).date;
        const who = e.staffIds.map(id => staffNames[id]).filter(Boolean);
        const map = e.kind === "checked_in" || e.kind === "checked_out" ? mapLink(e) : null;
        return (
          <li key={e.id} className={`job-ev job-ev-${e.kind}`}>
            <span className="job-ev-icon" aria-hidden="true">
              <Icon name={ICON[e.kind]} />
            </span>
            <div className="job-ev-body">
              <p className="job-ev-head">
                <b>{KIND_LABEL[e.kind]}</b>
                <time dateTime={e.occurredAt}>
                  {day !== bookingDate && <span className="muted">{formatDate(day)}, </span>}
                  {formatTime(e.occurredAt)}
                </time>
              </p>
              {e.kind !== "note" && (
                <p className="job-ev-loc muted">
                  <Icon name="pin" />
                  <span>{locationWording(e)}</span>
                  {map && (
                    <a href={map} target="_blank" rel="noopener noreferrer">
                      Open map<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </p>
              )}
              {e.kind === "photo" &&
                (e.photoUrl ? (
                  <a className="job-photo" href={e.photoUrl} target="_blank" rel="noopener noreferrer">
                    {/* Signed or data URLs from the private bucket; next/image can't optimise them. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.photoUrl} alt={e.note ? `Job photo: ${e.note}` : "Job photo"} loading="lazy" />
                  </a>
                ) : (
                  <p className="muted">This photo can&apos;t be shown right now. Reload the page to try again.</p>
                ))}
              {e.note && <p className="job-ev-note">{e.note}</p>}
              {who.length > 0 && <p className="muted job-ev-who">On site: {who.join(", ")}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
