import "@/styles/home.css";
import type { Metadata } from "next";
import Link from "next/link";
import { hero } from "@/config/content";
import { site } from "@shared/config/site";
import { VenueCard } from "@/components/VenueCard";
import { FilterChips } from "@/components/home/FilterChips";
import { loadCatalog, loadSuggestIndex, lookups } from "@/components/home/catalog";
import { SearchPill } from "@/components/home/SearchPill";
import { data } from "@shared/lib/data";
import { hasFilters, hrefFor, openOnFor, parseSearch, searchTitle, type RawParams } from "./query";

type Props = { searchParams: Promise<RawParams> };

const FORM_ID = "search-form";

async function readQuery(searchParams: Props["searchParams"]) {
  const [raw, catalog] = await Promise.all([searchParams, loadCatalog()]);
  const query = parseSearch(raw, { areas: catalog.areas.map(a => a.id), categories: catalog.categories.map(c => c.id) });
  return { query, ...catalog };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { query, categories, areas } = await readQuery(searchParams);
  const catName = categories.find(c => c.id === query.cat)?.name ?? "";
  const areaName = areas.find(a => a.id === query.area)?.name ?? "";
  const what = query.q ? `“${query.q}”` : catName || "Services";
  const title = query.q || catName || areaName ? `${what}${areaName ? ` in ${areaName}` : ""}` : "Find a service";
  return {
    title,
    description: `Book ${catName ? catName.toLowerCase() : "trusted services"}${areaName ? ` in ${areaName}` : " across Kampala"} and pay with MTN MoMo, Airtel Money or card.`,
    // Endless filter combinations aren't worth indexing; the plain page is.
    robots: hasFilters(query) ? { index: false, follow: true } : undefined,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { query, categories, areas } = await readQuery(searchParams);
  const [results, index] = await Promise.all([
    data.listBusinesses({
      q: query.q || undefined,
      areaId: query.area || undefined,
      categoryId: query.cat || undefined,
      openOn: openOnFor(query.when),
    }),
    loadSuggestIndex(),
  ]);
  const { cat, area, areaGroups } = lookups(categories, areas);
  const category = cat(query.cat);
  const title = searchTitle({
    count: results.length,
    q: query.q,
    catName: category?.name ?? "",
    areaName: area(query.area)?.name ?? "",
    when: query.when,
  });
  const filtered = hasFilters(query);

  return (
    <div className="wrap page search-page">
      <div className="search-head">
        <h1 className="page-title">{title}</h1>
        {filtered && (
          <Link className="link-btn search-clear" href="/search">
            Clear search
          </Link>
        )}
      </div>

      <SearchPill
        // A new key per search resets the boxes when the address changes (chips, back button).
        key={hrefFor(query)}
        id={FORM_ID}
        compact
        index={index}
        areaGroups={areaGroups}
        placeholder={hero.searchPlaceholder}
        defaults={{ q: query.q, area: query.area, when: query.when }}
        keepCat={query.cat}
      />

      {categories.length > 0 && (
        <div className="search-chips">
          <FilterChips
            formId={FORM_ID}
            chips={[
              { key: "all", cat: "", href: hrefFor({ ...query, cat: "" }), label: "All", current: !query.cat },
              ...categories.map(c => ({
                key: c.id,
                // Tapping the chosen category again takes the filter off.
                cat: query.cat === c.id ? "" : c.id,
                href: hrefFor({ ...query, cat: query.cat === c.id ? "" : c.id }),
                label: c.name,
                icon: c.icon,
                isNew: c.isNew,
                current: query.cat === c.id,
              })),
            ]}
          />
        </div>
      )}

      <section aria-labelledby="results-title" className="search-results">
        <h2 id="results-title" className="sr-only">
          Results
        </h2>
        {results.length ? (
          <div className="grid-venues">
            {results.map(b => (
              <VenueCard key={b.id} business={b} category={cat(b.categoryId)} area={area(b.areaId)} />
            ))}
          </div>
        ) : filtered ? (
          <div className="empty">
            <b>Even our search has limits.</b>
            <p>
              Try “braids”, “deep clean”, “plumbing” or “laundry”, pick a different day, or widen the area. Or tell your favourite pro to join {site.shortName}.
            </p>
            <Link className="btn btn-ghost" href="/search">
              Clear search
            </Link>
          </div>
        ) : (
          <div className="empty">
            <b>The shelves are being stocked.</b>
            <p>No businesses are live yet. Check back soon, or list yours and be the first.</p>
            <Link className="btn btn-ghost" href={`${site.businessUrl}/onboarding`}>
              List your business
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
