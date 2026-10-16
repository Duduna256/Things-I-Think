import { Icon } from "@shared/components/Icon";
import { initials } from "@shared/lib/format";
import type { Staff } from "@shared/lib/types";
import { avatarColours } from "./hours";

// The people who do the work. Avatar colours come from the business palette, with the
// initials in whichever of ink or white reads better on each colour.
export function TeamList({ staff, palette }: { staff: Staff[]; palette: [string, string, string] }) {
  if (!staff.length) return null;
  return (
    <section className="vpage-section" id="team" aria-labelledby="team-title">
      <h2 id="team-title">The team</h2>
      <p className="vpage-note">Pick a favourite when you book, or let us choose whoever&apos;s free.</p>
      <ul className="vpage-team">
        {staff.map((p, i) => (
          <li key={p.id} className="vpage-pro">
            <span className="avatar" style={avatarColours(palette, i)} aria-hidden="true">
              {initials(p.name)}
            </span>
            <b>{p.name}</b>
            <small>{p.role}</small>
            {/* A rating of 0 means nobody has rated them yet. */}
            {p.rating > 0 ? (
              <span className="rating">
                <span className="sr-only">Rated </span>
                {p.rating.toFixed(1)}
                <Icon name="star" className="ic ic-fill vpage-star" />
                <span className="sr-only"> out of 5</span>
              </span>
            ) : (
              <span className="rating">
                New<span className="sr-only">, not rated yet</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
