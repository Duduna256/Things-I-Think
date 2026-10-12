import { VenueCard } from "@/components/VenueCard";
import type { Area, Business, Category } from "@/lib/types";
import { RailNav } from "./RailNav";

// A titled, horizontally scrolling row of business cards with previous/next buttons.
export function VenueRail({
  id,
  title,
  navLabel,
  businesses,
  category,
  area,
}: {
  id: string;
  title: string;
  navLabel: string;
  businesses: Business[];
  category: (id: string) => Category | undefined;
  area: (id: string) => Area | undefined;
}) {
  if (!businesses.length) return null;
  const railId = `${id}-rail`;
  return (
    <section className="wrap block" id={id} aria-labelledby={`${id}-title`}>
      <div className="block-head">
        <h2 id={`${id}-title`}>{title}</h2>
        <RailNav railId={railId} label={navLabel} />
      </div>
      <div className="rail rail-bleed" id={railId}>
        {businesses.map(b => (
          <VenueCard key={b.id} business={b} category={category(b.categoryId)} area={area(b.areaId)} />
        ))}
      </div>
    </section>
  );
}
