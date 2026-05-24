import { OffersTicker } from '@/components/landing/offers-ticker';
import type { PublicLandingOfferDto } from '@/lib/public-types';

/** Section-style band directly under the hero: accent line + scrolling offers. */
export function HeroOfferTickerBand({ offers }: { offers: readonly PublicLandingOfferDto[] }) {
  if (!offers.length) return null;
  return (
    <div className="md-hero-offer-band">
      <div className="md-hero-offer-band-line" aria-hidden />
      <OffersTicker offers={offers} placement="belowHero" />
    </div>
  );
}
