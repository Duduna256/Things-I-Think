import { Stars } from "@/components/Rating";
import type { ReviewWithBusiness } from "@/lib/types";
import { ReviewCard } from "../venue/ReviewCard";
import { RailNav } from "./RailNav";
import { scoreNote, type ReviewScore } from "./stats";

// The score is worked out from every published business's rating, not typed in.
export function HomeReviews({ reviews, score }: { reviews: ReviewWithBusiness[]; score: ReviewScore | null }) {
  if (!reviews.length) return null;
  return (
    <section className="wrap block home-reviews" aria-labelledby="reviews-title">
      <div className="reviews-intro">
        <h2 id="reviews-title">What Kampala says afterwards</h2>
        {score && (
          <div className="score">
            <p className="score-num">
              <span className="sr-only">Rated {score.avg.toFixed(1)} out of 5</span>
              <span aria-hidden="true">
                {score.avg.toFixed(1)}
                <small>/5</small>
              </span>
            </p>
            <Stars value={score.avg} />
            <p className="score-note">{scoreNote(score)}</p>
          </div>
        )}
        <RailNav railId="reviews-rail" label="reviews" />
      </div>
      <div className="rail rail-reviews" id="reviews-rail">
        {reviews.map(r => (
          <ReviewCard key={r.id} review={r} showBusiness />
        ))}
      </div>
    </section>
  );
}
