import type { PublicLandingOfferDto } from '@/lib/public-types';

/** Horizontal marquee of promo lines — only rendered when there is at least one offer */
export function OffersTicker({ offers }: { offers: PublicLandingOfferDto[] }) {
  if (!offers.length) return null;
  const sep = ' · ';
  const strip = offers.map((o) => o.label.trim()).filter(Boolean).join(sep);
  if (!strip) return null;
  const loop = `${strip}${sep}`;
  return (
    <div className="md-offers-ticker" role="region" aria-label="Current offers">
      <span className="md-sr-only">{strip}</span>
      <div className="md-offers-ticker-track">
        <div className="md-offers-ticker-marquee">
          <span className="md-offers-ticker-text">{loop}</span>
          <span className="md-offers-ticker-text" aria-hidden>
            {loop}
          </span>
        </div>
      </div>
    </div>
  );
}
