import { AreaBrowser } from "./AreaBrowser";
import type { RegionLinks } from "./stats";

export function HomeAreas({ regions }: { regions: RegionLinks[] }) {
  if (!regions.length) return null;
  return (
    <section className="wrap block area-browser" id="areas" aria-labelledby="areas-title">
      <div className="block-head">
        <h2 id="areas-title">Browse by area</h2>
      </div>
      <AreaBrowser regions={regions} />
    </section>
  );
}
