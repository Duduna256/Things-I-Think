import Link from "next/link";
import { Stars } from "@shared/components/Rating";
import { initials } from "@shared/lib/format";
import type { ReviewWithBusiness } from "@shared/lib/types";
import { readableInk } from "./hours";

// One review: stars, title, words, and who wrote it. `showBusiness` adds "booked <business>".
export function ReviewCard({ review, showBusiness = false, headingLevel = 3 }: { review: ReviewWithBusiness; showBusiness?: boolean; headingLevel?: 3 | 4 }) {
  const stars = Math.max(1, Math.min(5, Math.round(review.rating)));
  const bg = review.business?.palette?.[2] ?? "#d9ccff";
  const Heading = headingLevel === 4 ? "h4" : "h3";
  return (
    <article className="rv-card">
      <span className="rv-stars" role="img" aria-label={`Rated ${stars} out of 5`}>
        <Stars value={stars} />
      </span>
      <Heading className="rv-title">{review.title}</Heading>
      <p className="rv-body">{review.body}</p>
      <footer className="rv-foot">
        <span className="avatar" style={{ background: bg, color: readableInk(bg) }} aria-hidden="true">
          {initials(review.authorName)}
        </span>
        <span>
          <b>{review.authorName}</b>
          <small>
            {review.authorArea}
            {showBusiness && review.business && (
              <>
                {review.authorArea ? " · " : ""}booked <Link href={`/v/${review.business.slug}`}>{review.business.name}</Link>
              </>
            )}
          </small>
        </span>
      </footer>
    </article>
  );
}
