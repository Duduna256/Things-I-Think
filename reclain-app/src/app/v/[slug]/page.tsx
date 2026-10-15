import "@/styles/venue.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { Rating } from "@/components/Rating";
import { placeName } from "@/components/VenueCard";
import { features } from "@/config/features";
import { site } from "@/config/site";
import { data } from "@/lib/data";
import { plural, ugx } from "@/lib/format";
import { openDaysText } from "@/lib/time";
import type { BusinessDetail, BusinessStatus, ReviewWithBusiness } from "@/lib/types";
import { closedToday, fromPrice, todayText, weekRows } from "@/components/venue/hours";
import { ReviewCard } from "@/components/venue/ReviewCard";
import { bookHref, ServiceMenu } from "@/components/venue/ServiceMenu";
import { TeamList } from "@/components/venue/TeamList";

type Props = { params: Promise<{ slug: string }> };

// One fetch per request, shared by generateMetadata and the page. A business that isn't live
// yet still shows to its owner and to admins, so they can check it before it goes up.
const getVenue = cache(async (slug: string): Promise<BusinessDetail | null> => {
  if (!slug || slug.length > 80) return null;
  return (await data.getBusinessBySlug(slug)) ?? (await data.previewBusinessBySlug(slug));
});

const NOT_LIVE: Record<Exclude<BusinessStatus, "published">, string> = {
  draft: "This page isn't live yet. Customers can't see it until it's approved.",
  pending: "This page is waiting for approval. Customers can't see it yet.",
  suspended: "This page is suspended. Customers can't see it.",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await getVenue(slug);
  if (!b) return { title: "Business not found", robots: { index: false } };
  const description = b.blurb || site.description;
  return {
    title: b.name,
    ...(b.status !== "published" && { robots: { index: false } }),
    description,
    openGraph: { title: `${b.name} · ${site.shortName}`, description, type: "website" },
  };
}

// Where the work happens, in a badge and a sentence.
function visitInfo(b: BusinessDetail, place: string) {
  const mode = b.visitMode === "both" && !features.homeVisits ? "salon" : b.visitMode;
  if (mode === "mobile") {
    return {
      badge: "Comes to you",
      icon: "home",
      note: b.categoryId === "laundry" ? "Free pickup and delivery to your door." : "They come to you. Travel is included in the price.",
    };
  }
  if (mode === "both") {
    return {
      badge: "Home visits",
      icon: "home",
      note: b.homeVisitFee
        ? `Visit them${place ? ` in ${place}` : ""}, or choose “At my place” when you book. Home visits add ${ugx(b.homeVisitFee)} for travel, shown before you confirm.`
        : `Visit them${place ? ` in ${place}` : ""}, or choose “At my place” when you book. Home visits cost nothing extra.`,
    };
  }
  return {
    badge: "At the venue",
    icon: "store",
    note: b.address ? `Find them at ${b.address}${place ? `, ${place}` : ""}.` : `You go to them${place ? `, in ${place}` : ""}.`,
  };
}

export default async function VenuePage({ params }: Props) {
  const { slug } = await params;
  const b = await getVenue(slug);
  if (!b) notFound();

  const [categories, areas, allReviews] = await Promise.all([
    data.listCategories(),
    data.listAreas(),
    features.reviews ? data.listReviews({ businessId: b.id, limit: 12 }).catch((): ReviewWithBusiness[] => []) : Promise.resolve([]),
  ]);
  const category = categories.find(c => c.id === b.categoryId);
  const area = areas.find(a => a.id === b.areaId);
  const place = placeName(area);
  const visit = visitInfo(b, area?.name ?? "");
  const now = new Date();
  const today = todayText(b, now);
  const week = weekRows(b, now);
  const from = fromPrice(b.services);
  const live = b.status === "published";
  const canBook = live && b.services.length > 0;
  const reviews = allReviews.filter(r => r.business);

  const bookCta = canBook && (
    <Link className="btn btn-black" href={bookHref(b.slug)}>
      Book now
    </Link>
  );

  return (
    <div className="vpage">
      <div className="wrap vpage-top">
        {b.status !== "published" && (
          <p className="notice notice-warn vpage-preview" role="status">
            <Icon name="eye" />
            <span>{NOT_LIVE[b.status]} Booking is switched off here.</span>
          </p>
        )}
        <nav aria-label="Breadcrumb" className="vpage-crumbs">
          <ol>
            <li>
              <Link href="/search">All businesses</Link>
            </li>
            {category && (
              <li>
                <Link href={`/search?cat=${encodeURIComponent(category.id)}`}>{category.name}</Link>
              </li>
            )}
            <li aria-current="page">{b.name}</li>
          </ol>
        </nav>

        <div className="vpage-head">
          <Cover
            className="vpage-cover"
            palette={b.palette}
            word={b.coverWord}
            imageUrl={b.imageUrl}
            badge={
              <span className="cover-badge">
                <Icon name={visit.icon} />
                {visit.badge}
              </span>
            }
          />
          <div className="vpage-intro">
            {category && <p className="eyebrow">{category.name}</p>}
            <h1 className="vpage-name">{b.name}</h1>
            <ul className="vpage-meta">
              <li>
                <Rating value={b.ratingAvg} count={b.ratingCount} />
              </li>
              {place && (
                <li>
                  <Icon name="pin" />
                  {place}
                </li>
              )}
              <li>
                <Icon name="clock" />
                <span>
                  <b className={closedToday(b, now) ? "vpage-closed" : "vpage-open"}>{today}</b> · {openDaysText(b.closedDays)}
                </span>
              </li>
            </ul>
            {b.blurb && <p className="vpage-blurb">{b.blurb}</p>}
            <p className="vpage-visit">
              <Icon name={visit.icon} />
              <span>{visit.note}</span>
            </p>
            {canBook && (
              <div className="vpage-cta">
                {bookCta}
                {from !== null && <span className="muted">From {ugx(from)}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="wrap vpage-body">
        <div className="vpage-main">
          <ServiceMenu slug={b.slug} services={b.services} bookable={live} />

          {!b.skipProfessional && <TeamList staff={b.staff} palette={b.palette} />}

          {features.reviews && (
            <section className="vpage-section" id="reviews" aria-labelledby="reviews-title">
              <h2 id="reviews-title">Reviews</h2>
              {b.ratingCount > 0 && (
                <p className="vpage-note">
                  Rated {b.ratingAvg.toFixed(1)} out of 5 from {plural(b.ratingCount, "review")}. Only people who booked can leave one.
                </p>
              )}
              {reviews.length ? (
                <div className="vpage-reviews">
                  {reviews.map(r => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <b>No reviews here yet.</b>
                  <p>They arrive after the first bookings are done. Yours could be the one everyone reads.</p>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="vpage-aside" aria-label="Opening hours and booking">
          <div className="card vpage-card">
            <h2 className="vpage-card-title">Opening hours</h2>
            <dl className="vpage-hours">
              {week.map(d => (
                <div key={d.day} className={d.isToday ? "is-today" : undefined}>
                  <dt>
                    {d.label}
                    {d.isToday && <span className="sr-only"> (today)</span>}
                  </dt>
                  <dd>{d.hours}</dd>
                </div>
              ))}
            </dl>
            <p className="hint">Times are Kampala time.</p>
            {b.address && (
              <p className="vpage-address">
                <Icon name="pin" />
                <span>{b.address}</span>
              </p>
            )}
            {canBook && (
              <Link className="btn btn-black btn-wide" href={bookHref(b.slug)}>
                Book now
              </Link>
            )}
          </div>
        </aside>
      </div>

      {canBook && (
        <div className="vpage-bar">
          <span className="vpage-bar-text">
            <b>{from !== null ? `From ${ugx(from)}` : b.name}</b>
            <small>
              {plural(b.services.length, "service")} · {today}
            </small>
          </span>
          {bookCta}
        </div>
      )}
    </div>
  );
}
