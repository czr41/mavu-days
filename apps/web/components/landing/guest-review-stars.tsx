/** Five-star visualization for schema.org-compatible rating + ratingMax. */
export function GuestReviewStars({ rating, ratingMax }: { rating: number; ratingMax: number }) {
  const cappedMax = ratingMax > 0 ? ratingMax : 5;
  const filled = Math.min(5, Math.max(0, Math.round((rating / cappedMax) * 5)));

  return (
    <div className="md-review-stars-row" aria-label={`Rated ${rating} out of ${cappedMax} stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < filled ? '\u2605' : '\u2606'}</span>
      ))}
    </div>
  );
}
