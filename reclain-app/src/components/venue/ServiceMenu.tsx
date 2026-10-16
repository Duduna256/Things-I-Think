import Link from "next/link";
import { durationLabel, slugify, ugx } from "@/lib/format";
import type { Service } from "@/lib/types";
import { groupServices } from "./hours";

export function bookHref(slug: string, serviceId?: string): string {
  const base = `/book/${encodeURIComponent(slug)}`;
  return serviceId ? `${base}?service=${encodeURIComponent(serviceId)}` : base;
}

// The menu: services grouped by section, each with its own Book link (left out on a preview of
// a business that isn't live).
export function ServiceMenu({ slug, services, bookable = true }: { slug: string; services: Service[]; bookable?: boolean }) {
  const groups = groupServices(services).map((g, i) => ({ ...g, id: `menu-${slugify(g.name) || "group"}-${i}` }));
  return (
    <section className="vpage-section" id="services" aria-labelledby="services-title">
      <h2 id="services-title">Services</h2>
      {!groups.length ? (
        <div className="empty">
          <b>The menu is still being written.</b>
          <p>This business hasn&apos;t added its services yet. Check back soon.</p>
        </div>
      ) : (
        <>
          {groups.length > 1 && (
            <nav className="vpage-jump" aria-label="Menu sections">
              <ul className="chips">
                {groups.map(g => (
                  <li key={g.id}>
                    <a className="chip" href={`#${g.id}`}>
                      {g.name}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {groups.map(g => (
            <section key={g.id} className="vpage-group" id={g.id} aria-labelledby={`${g.id}-title`}>
              <h3 id={`${g.id}-title`}>{g.name}</h3>
              <ul className="vpage-svcs">
                {g.services.map(s => {
                  const length = durationLabel(s);
                  return (
                    <li key={s.id} className="vpage-svc">
                      <div className="vpage-svc-main">
                        <h4>{s.name}</h4>
                        <p className="vpage-svc-meta">
                          {length && <span>{length}</span>}
                          {s.latestStart && <span className="vpage-cutoff">Book by {s.latestStart}</span>}
                        </p>
                        {s.description && <p className="vpage-svc-desc">{s.description}</p>}
                      </div>
                      <div className="vpage-svc-side">
                        <span className="vpage-price">{ugx(s.price)}</span>
                        {bookable && (
                          <Link className="btn btn-ghost vpage-book" href={bookHref(slug, s.id)} aria-label={`Book ${s.name}`}>
                            Book
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </section>
  );
}
