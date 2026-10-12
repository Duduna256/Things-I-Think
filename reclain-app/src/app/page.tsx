import "@/styles/home.css";
import "@/styles/venue.css";
import { features } from "@/config/features";
import { marquee, trending } from "@/config/content";
import { site } from "@/config/site";
import { data } from "@/lib/data";
import type { ReviewWithBusiness } from "@/lib/types";
import { BusinessBand } from "@/components/home/BusinessBand";
import { CategoryChips } from "@/components/home/CategoryChips";
import { loadCatalog, loadOffers, loadSuggestIndex, lookups } from "@/components/home/catalog";
import { Hero } from "@/components/home/Hero";
import { HomeAreas } from "@/components/home/HomeAreas";
import { HomeReviews } from "@/components/home/HomeReviews";
import { AppBand, Faq, Marquee, Occasions, Trending, Trust } from "@/components/home/Sections";
import { areaLinks, bookedToday, buildTrending, reviewScore } from "@/components/home/stats";
import { VenueRail } from "@/components/home/VenueRail";

export default async function Home() {
  const home = features.home;
  const showReviews = home.reviews && features.reviews;
  const { categories, areas, businesses } = await loadCatalog();
  const [index, offers, allReviews] = await Promise.all([
    loadSuggestIndex(),
    loadOffers(), // shared with the suggestions, fetched once
    // A homepage without reviews is better than no homepage.
    showReviews || home.floatingCards ? data.listReviews({ limit: 24 }).catch((): ReviewWithBusiness[] => []) : Promise.resolve([]),
  ]);
  const { cat, area, areaGroups } = lookups(categories, areas);

  // Only reviews of businesses that are live, so every "booked …" link works.
  const live = new Set(businesses.map(b => b.id));
  const reviews = allReviews.filter(r => live.has(r.businessId) && r.business).slice(0, 12);

  const featured = businesses.filter(b => b.isFeatured);
  const fresh = businesses.filter(b => b.isNew);
  const floaterVenue = [...featured].sort((a, b) => b.ratingAvg - a.ratingAvg || a.sort - b.sort)[0] ?? businesses[0];
  const floaterReview = reviews.find(r => r.title.length <= 34) ?? null;

  return (
    <>
      <Hero
        index={index}
        areaGroups={areaGroups}
        booked={bookedToday()}
        floaters={{
          venue: floaterVenue ? { business: floaterVenue, place: area(floaterVenue.areaId)?.name ?? "" } : null,
          review: floaterReview,
        }}
      />

      {!businesses.length && (
        <section className="wrap block">
          <div className="empty">
            <b>The shelves are being stocked.</b>
            <p>No businesses are live yet. Check back soon, or list yours and be the first.</p>
          </div>
        </section>
      )}

      {home.marquee && <Marquee items={marquee} />}

      {home.categories && categories.length > 0 && (
        <section className="wrap block" aria-label="Browse by category">
          <CategoryChips
            chips={[
              { key: "all", href: "/search", label: "All" },
              ...categories.map(c => ({ key: c.id, href: `/search?cat=${encodeURIComponent(c.id)}`, label: c.name, icon: c.icon, isNew: c.isNew })),
            ]}
          />
        </section>
      )}

      {home.recommended && (
        <VenueRail id="recommended" title="Recommended" navLabel="recommended businesses" businesses={featured} category={cat} area={area} />
      )}

      {home.occasions && <Occasions />}

      {home.newVenues && (
        <VenueRail id="new" title={`New to ${site.shortName}`} navLabel="new businesses" businesses={fresh} category={cat} area={area} />
      )}

      {home.trending && <Trending tiles={buildTrending(trending, offers)} />}

      {showReviews && <HomeReviews reviews={reviews} score={reviewScore(businesses)} />}

      {home.trust && <Trust />}

      {home.appBand && <AppBand />}

      {home.businessBand && <BusinessBand />}

      {home.areas && <HomeAreas regions={areaLinks(areas, categories, businesses)} />}

      {home.faq && <Faq />}
    </>
  );
}
