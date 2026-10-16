import type { CSSProperties } from "react";
import { site } from "../config/site";
import { Icon } from "./Icon";

// Stars drawn from a score: full stars for the whole part, part of one for the rest, and
// outlines up to five. The score is rounded to a tenth, like the number beside it, so "4.0"
// never shows a sliver. Decorative: whatever wraps them gives the score in words.
export function Stars({ value, max = 5 }: { value: number; max?: number }) {
  const score = Math.max(0, Math.min(max, Math.round(value * 10) / 10));
  return (
    <span className="stars" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.max(0, Math.min(1, score - i));
        if (fill >= 1) return <Icon key={i} name="star" className="ic star-on" />;
        if (fill <= 0) return <Icon key={i} name="star" className="ic star-off" />;
        return (
          <span key={i} className="star-part" style={{ "--fill": fill.toFixed(2) } as CSSProperties}>
            <Icon name="star" className="ic star-off" />
            <Icon name="star" className="ic star-on" />
          </span>
        );
      })}
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
      <Stars value={value} />
      <span className="count" aria-hidden="true">({count.toLocaleString("en-US")})</span>
    </span>
  );
}
