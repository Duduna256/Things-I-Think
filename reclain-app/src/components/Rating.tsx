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

// "4.9 ★★★★★ (1,284)"
export function Rating({ value, count }: { value: number; count: number }) {
  if (!count) return <span className="rating"><span className="count">New on Reclain</span></span>;
  return (
    <span className="rating" aria-label={`Rated ${value.toFixed(1)} out of 5 from ${count.toLocaleString("en-US")} reviews`}>
      <span aria-hidden="true">{value.toFixed(1)}</span>
      <Stars />
      <span className="count" aria-hidden="true">({count.toLocaleString("en-US")})</span>
    </span>
  );
}
