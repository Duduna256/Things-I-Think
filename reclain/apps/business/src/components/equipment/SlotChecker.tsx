// "Can I take this job?": a GET form (services and a day) and the server-rendered answer, one
// line per start time saying what stands in the way. No client code; it works without JS.

import { Icon } from "@shared/components/Icon";
import { formatDate, weekdayLong, weekdayOf } from "@shared/lib/time";
import type { Service } from "@shared/lib/types";
import type { CheckerQuery } from "@/app/(dashboard)/equipment/schemas";
import type { CheckerReport } from "./checker";

export function SlotChecker({
  services,
  query,
  report,
  today,
  maxDate,
}: {
  services: Service[]; // the menu, hidden ones included (an owner may want to check those too)
  query: CheckerQuery;
  report: CheckerReport | null; // null until a valid query is sent
  today: string;
  maxDate: string;
}) {
  const picked = new Set(query.serviceIds);
  return (
    <section className="dash-section eq-checker" aria-labelledby="eq-checker-h">
      <div className="dash-section-head">
        <div>
          <h2 id="eq-checker-h">Can I take this job?</h2>
          <p className="muted">Pick what the customer wants and a day, and see every start time with what&apos;s in the way.</p>
        </div>
      </div>

      <form className="card eq-check-form" action="/equipment" method="get">
        <fieldset className="field eq-check-services" aria-describedby={query.serviceError ? "eq-svc-err" : undefined}>
          <legend>Services</legend>
          {services.length === 0 ? (
            <p className="muted">Add a service on the Services page first.</p>
          ) : (
            <div className="eq-check-grid">
              {services.map(s => (
                <label key={s.id} className="check">
                  <input type="checkbox" name="services" value={s.id} defaultChecked={picked.has(s.id)} />
                  {s.name}
                  {!s.active && <span className="hint">(hidden)</span>}
                </label>
              ))}
            </div>
          )}
          {query.serviceError && (
            <small className="hint is-error" id="eq-svc-err">
              {query.serviceError}
            </small>
          )}
        </fieldset>
        <div className="eq-check-row">
          <label className="field">
            <span>Day</span>
            <input type="date" name="date" defaultValue={query.date} min={today} max={maxDate} required aria-describedby={query.dateError ? "eq-date-err" : undefined} />
            {query.dateError && (
              <small className="hint is-error" id="eq-date-err">
                {query.dateError}
              </small>
            )}
          </label>
          <button type="submit" className="btn btn-black" disabled={services.length === 0}>
            Check the day
          </button>
        </div>
      </form>

      {report && (
        <div className="card eq-report">
          <p className="eq-report-needs">
            <Icon name="users" />
            Needs {report.needsText}
          </p>
          {report.kind === "closed" && (
            <div className="empty">
              <b>You&apos;re closed on {weekdayLong(weekdayOf(query.date))}s.</b>
              <p>Pick another day, or change your days off in Settings.</p>
            </div>
          )}
          {report.kind === "too_long" && (
            <div className="empty">
              <b>That takes {report.takes}, longer than you&apos;re open in a day.</b>
              <p>Nobody can book these together. Check fewer services, or change your hours in Settings.</p>
            </div>
          )}
          {report.kind === "ok" && (
            <>
              <h3 className="eq-report-title">
                {formatDate(query.date)}:{" "}
                {report.freeCount ? `${report.freeCount} free start ${report.freeCount === 1 ? "time" : "times"}` : "nothing free"}
              </h3>
              <ol className="eq-slots">
                {report.slots.map(s => (
                  <li key={s.startsAt} className={`eq-slot ${s.free ? "is-free" : s.blockers[0]?.kind === "past" ? "is-past" : "is-busy"}`}>
                    <span className="eq-slot-time">{s.time}</span>
                    <span className="eq-slot-why">{s.reason}</span>
                  </li>
                ))}
              </ol>
              {!report.freeCount && (
                <p className="eq-next">
                  {report.nextFree
                    ? `The next free start is ${formatDate(report.nextFree.date)} at ${report.nextFree.time}.`
                    : "Nothing's free in the three weeks after that either."}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
