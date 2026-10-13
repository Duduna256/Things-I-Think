import { site } from "@/config/site";
import { Icon } from "./Icon";

export function Stars({ count = 5 }: { count?: number }) {
  return (
    <span className="stars" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Icon key={i} name="star" />
      ))}
    </span>
  );
}

// "4.9 ★★★★★ (1,284)". Screen readers get one sentence from the label (role="img" makes
// them read it); the number, stars and count inside are hidden so nothing is read twice.
export function Rating({ value, count }: { value: number; count: number }) {
  if (!count) return <span className="rating"><span className="count">New on {site.shortName}</span></span>;
  const label = `Rated ${value.toFixed(1)} out of 5 from ${count.toLocaleString("en-US")} ${count === 1 ? "review" : "reviews"}`;
  return (
    <span className="rating" role="img" aria-label={label}>
      <span aria-hidden="true">{value.toFixed(1)}</span>
      <Stars />
      <span className="count" aria-hidden="true">({count.toLocaleString("en-US")})</span>
    </span>
  );
}
