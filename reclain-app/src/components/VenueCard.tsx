import Link from "next/link";
import type { Area, Business, Category } from "@/lib/types";
import { Cover } from "./Cover";
import { Icon } from "./Icon";
import { Rating } from "./Rating";

export function placeName(area: Area | undefined): string {
  if (!area) return "";
  return area.region === area.name ? area.name : `${area.name}, ${area.region}`;
}

export function VenueCard({ business: b, category, area }: { business: Business; category?: Category; area?: Area }) {
  let badge = null;
  if (b.visitMode === "both") badge = <span className="cover-badge"><Icon name="home" />Home visits</span>;
  else if (b.visitMode === "mobile") badge = <span className="cover-badge"><Icon name="home" />Comes to you</span>;
  else if (b.isNew) badge = <span className="cover-badge">New</span>;
  return (
    <article className="vcard">
      <Link className="vcard-hit" href={`/v/${b.slug}`}>
        <Cover palette={b.palette} word={b.coverWord} imageUrl={b.imageUrl} badge={badge} />
        <div className="vcard-body">
          <span className="vcard-name">{b.name}</span>
          <Rating value={b.ratingAvg} count={b.ratingCount} />
          <span className="vcard-area">{placeName(area)}</span>
          {category && <span className="tag">{category.name}</span>}
        </div>
      </Link>
    </article>
  );
}
