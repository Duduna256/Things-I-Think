import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { features } from "@/config/features";
import { hero } from "@/config/content";
import { initials } from "@/lib/format";
import type { Business, ReviewWithBusiness } from "@/lib/types";
import { HeroWord } from "./HeroWord";
import { SearchPill } from "./SearchPill";
import { readableInk } from "../venue/hours";
import type { AreaGroup } from "./stats";
import type { SuggestIndex } from "./suggest";

export interface FloaterData {
  venue: { business: Business; place: string } | null;
  review: ReviewWithBusiness | null;
}

// The little booking cards floating round the headline. Pure decoration (aria-hidden):
// on wide screens they sit at the edges, below 1240px two of them line up under the search.
function Floaters({ venue, review }: FloaterData) {
  const light = review?.business.palette[2] ?? "#d9ccff";
  return (
    <div className="floaters" aria-hidden="true">
      {venue && (
        <div className="fl fl-1">
          <Cover className="fl-thumb" palette={venue.business.palette} word={venue.business.coverWord} imageUrl={venue.business.imageUrl} />
          <span>
            <b>{venue.business.name}</b>
            <small>
              {venue.business.ratingCount ? `${venue.business.ratingAvg.toFixed(1)} ★ · ` : ""}
              {venue.place}
            </small>
          </span>
        </div>
      )}
      <div className="fl fl-2">
        <span className="fl-icon fl-ok">
          <Icon name="check" />
        </span>
        <span>
          <b>Knotless braids</b>
          <small>Sat 10:00 · Confirmed</small>
        </span>
      </div>
      {features.mobileMoney && (
        <div className="fl fl-3">
          <span className="pay-logo">MTN</span>
          <span>
            <b>Approve UGX 120,000</b>
            <small>Enter your MoMo PIN</small>
          </span>
        </div>
      )}
      {review && (
        <div className="fl fl-4">
          <span className="avatar" style={{ background: light, color: readableInk(light) }}>
            {initials(review.authorName)}
          </span>
          <span>
            <b>“{review.title}”</b>
            <small>
              {review.authorName}, {review.authorArea}
            </small>
          </span>
        </div>
      )}
      <div className="fl fl-5">
        <span className="fl-live" />
        <span>
          <b>Aisha is on her way</b>
          <small>Arriving in 6 min</small>
        </span>
      </div>
    </div>
  );
}

// "12 bookings made today": a real count, worked out on the server for this page view.
function BookedToday({ count }: { count: number }) {
  return (
    <p className="booked-today">
      <strong>{count.toLocaleString("en-US")}</strong> {count === 1 ? "booking" : "bookings"} made today
    </p>
  );
}

export function Hero({
  index,
  areaGroups,
  booked,
  floaters,
}: {
  index: SuggestIndex;
  areaGroups: AreaGroup[];
  // Real bookings made today, or null to leave the line out (see bookedTodayShown in stats.ts).
  booked: number | null;
  floaters: FloaterData;
}) {
  return (
    <section className="home-hero" aria-labelledby="hero-title">
      <div className="hero-bg" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {features.home.floatingCards && <Floaters {...floaters} />}
      <div className="wrap hero-in">
        <h1 id="hero-title">
          <span className="sr-only">{hero.plain}</span>
          <span aria-hidden="true">
            <span className="h1-line">
              {hero.before} <HeroWord words={hero.rotatingWords} />,
            </span>{" "}
            <span className="h1-line">{hero.after}</span>
          </span>
        </h1>
        <p className="hero-sub">{hero.sub}</p>
        <SearchPill index={index} areaGroups={areaGroups} placeholder={hero.searchPlaceholder} />
        {booked !== null && <BookedToday count={booked} />}
      </div>
    </section>
  );
}
