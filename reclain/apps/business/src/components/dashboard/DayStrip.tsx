// A picture of the day from opening to closing time: booked stretches and a "now" line.
// Decorative (the list below says the same in words), so it's hidden from screen readers.

import type { Booking } from "@shared/lib/types";
import { dayBlocks, hourTicks, nowMarker } from "./logic";

export function DayStrip({
  bookings,
  date,
  opensAt,
  closesAt,
  now,
}: {
  bookings: Booking[];
  date: string;
  opensAt: string;
  closesAt: string;
  now: Date;
}) {
  const blocks = dayBlocks(bookings, date, opensAt, closesAt, now);
  const ticks = hourTicks(opensAt, closesAt);
  const marker = nowMarker(now, date, opensAt, closesAt);
  if (!ticks.length) return null;
  return (
    <div className="dash-strip" aria-hidden="true">
      <div className="dash-strip-bar">
        {blocks.map(b => (
          <span key={b.id} className={`dash-strip-block${b.past ? " is-past" : ""}`} style={{ left: `${b.left}%`, width: `${b.width}%` }} />
        ))}
        {marker !== null && <span className="dash-strip-now" style={{ left: `${marker}%` }} />}
      </div>
      <div className="dash-strip-ticks">
        {ticks.map(t => (
          <span key={t.label} style={{ left: `${t.left}%` }}>
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
