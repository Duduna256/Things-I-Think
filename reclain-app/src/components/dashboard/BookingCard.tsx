// One booking as the venue sees it: when, who (with a tap-to-call number), what, where,
// the money and the buttons. Rendered on the server; the buttons are a client island.

import { Icon } from "@/components/Icon";
import { duration, shortName, ugx } from "@/lib/format";
import { internationalMsisdn, prettyMsisdn } from "@/lib/phone";
import { formatDate, formatTime, localParts } from "@/lib/time";
import type { Booking } from "@/lib/types";
import { BookingActions } from "./BookingActions";
import { allowedActions, holdExpired, paymentPill, statusPill, type Pill } from "./logic";

export function PillTag({ pill }: { pill: Pill }) {
  return <span className={`pill pill-${pill.tone}`}>{pill.label}</span>;
}

function Phone({ msisdn }: { msisdn: string }) {
  if (!/^\d{9}$/.test(msisdn)) return <span className="dash-bk-line">{msisdn}</span>;
  return (
    <a className="dash-tel" href={`tel:${internationalMsisdn(msisdn)}`}>
      <Icon name="phone" />
      <span>
        <span className="sr-only">Call </span>
        {prettyMsisdn(msisdn)}
      </span>
    </a>
  );
}

export function BookingCard({
  booking: b,
  now,
  showDate = false,
  textsCustomer,
}: {
  booking: Booking;
  now: Date;
  showDate?: boolean;
  textsCustomer: boolean;
}) {
  const start = formatTime(b.startsAt);
  const end = formatTime(b.endsAt);
  const date = formatDate(localParts(b.startsAt).date);
  const mins = b.items.reduce((sum, i) => sum + i.durationMin, 0);
  const status = statusPill(b, now);
  const closed = b.status === "cancelled" || b.status === "no_show" || holdExpired(b, now);
  const titleId = `bk-${b.id}`;
  const name = b.customerName.trim();
  const first = name ? shortName(name) : "the customer";

  return (
    <article className={`dash-bk${closed ? " is-closed" : ""}`} aria-labelledby={titleId}>
      {/* Read out as part of the heading below. */}
      <div className="dash-bk-when" aria-hidden="true">
        {showDate && <span className="dash-bk-date">{date}</span>}
        <b className="display">{start}</b>
        <span className="muted">{end}</span>
        {mins > 0 && <small className="muted">{duration(mins)}</small>}
      </div>

      <div className="dash-bk-who">
        <h3 id={titleId}>
          <span className="sr-only">
            {showDate ? `${date}, ` : ""}
            {start} to {end}
            {mins > 0 ? ` (${duration(mins)})` : ""}:{" "}
          </span>
          {name || "Customer"}
        </h3>
        <Phone msisdn={b.customerPhone} />
        <p className="dash-bk-line">
          <Icon name={b.location === "home" ? "home" : "store"} />
          <span>{b.location === "home" ? <>Home visit: {b.address || "address not given"}</> : "At the venue"}</span>
        </p>
        {b.staffName && (
          <p className="dash-bk-line">
            <Icon name="user" />
            <span>With {b.staffName}</span>
          </p>
        )}
      </div>

      <div className="dash-bk-what">
        <ul className="dash-bk-items">
          {b.items.map(i => (
            <li key={i.id}>{i.name}</li>
          ))}
        </ul>
        {b.notes.trim() && (
          <p className="dash-bk-notes">
            <span className="sr-only">Notes from the customer: </span>
            {b.notes}
          </p>
        )}
      </div>

      <div className="dash-bk-money">
        <b>{ugx(b.total)}</b>
        {b.homeFee > 0 && <small className="muted">Includes {ugx(b.homeFee)} home-visit fee</small>}
        <span className="dash-pills">
          <PillTag pill={status} />
          <PillTag pill={paymentPill(b)} />
        </span>
        <small className="muted dash-bk-ref">Ref {b.ref}</small>
      </div>

      <BookingActions
        bookingId={b.id}
        allowed={allowedActions(b, now)}
        who={first}
        when={showDate ? `${date}, ${start}` : start}
        textsCustomer={textsCustomer}
      />
    </article>
  );
}
