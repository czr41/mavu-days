import Link from 'next/link';

import { GuestReviewPlatformBadge } from '@/components/landing/guest-review-platform-badge';
import { GuestReviewStars } from '@/components/landing/guest-review-stars';
import { LandingSectionHead } from '@/components/landing/landing-section-head';
import { OffersTicker } from '@/components/landing/offers-ticker';
import type { PublicGuestReviewDto, PublicLandingOfferDto } from '@/lib/public-types';

type Props = {
  orgName: string;
  reviews: readonly PublicGuestReviewDto[];
  offers?: readonly PublicLandingOfferDto[];
};

function reviewAnchorId(id: string) {
  return `review-${id}`;
}

export function GuestReviewsFullPage({ orgName, reviews, offers = [] }: Props) {
  const brand = orgName?.trim() || 'Mavu Days';

  return (
    <div className="md-page md-page-premium md-guest-reviews-route" id="md-top">
      <header className="md-bar md-bar-premium">
        <div className="md-bar-inner">
          <div className="md-bar-logo-col">
            <Link className="md-logo" href="/" aria-label={brand}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" className="md-logo-img" />
            </Link>
          </div>

          <div className="md-bar-nav-col">
            <nav className="md-nav" aria-label="Site sections">
              <Link href="/#about">About</Link>
              <Link href="/#stays">Stay</Link>
              <Link href="/#experience">Experiences</Link>
              <Link href="/gallery">Gallery</Link>
              <Link href="/guest-reviews" aria-current="page">
                Guest stories
              </Link>
              <Link href="/#faqs">FAQs</Link>
              <Link href="/#footer">Contact</Link>
            </nav>
          </div>
          <div className="md-bar-cta-col">
            <Link className="md-btn-primary-nav" href="/#booking">
              Book Your Stay
            </Link>
          </div>
        </div>
      </header>

      <OffersTicker offers={[...offers]} />

      <section className="md-section md-section-cream md-guest-reviews-full-page" aria-labelledby="guest-reviews-page-heading">
        <div className="md-wrap">
          <LandingSectionHead
            align="left"
            eyebrowDecoration={false}
            eyebrow="From our guests"
            title={
              <h1 id="guest-reviews-page-heading" className="md-h2 md-guest-reviews-full-title">
                {brand} — guest moments
              </h1>
            }
            lead={
              <p className="md-lead md-lead-tight md-guest-reviews-full-back-lead">
                <Link href="/#reviews" className="md-link">
                  ← Back to homepage highlights
                </Link>
              </p>
            }
          />

          {reviews.length === 0 ? (
            <p className="md-muted" style={{ marginTop: '0.5rem' }}>
              Guest stories will appear here after they are published on the homepage.
            </p>
          ) : (
            <ul className="md-guest-reviews-page-grid">
              {reviews.map((r) => (
                <li key={r.id} id={reviewAnchorId(r.id)} className="md-guest-reviews-page-card">
                  <div className="md-review-card-top">
                    <GuestReviewStars rating={r.rating} ratingMax={r.ratingMax} />
                    <GuestReviewPlatformBadge platform={r.platform} size="sm" />
                  </div>
                  <blockquote className="md-quote md-guest-reviews-page-quote">
                    <p>{`"${r.body}"`}</p>
                  </blockquote>
                  <p className="md-reviewer">{r.guestDisplayName?.trim() || 'Verified guest'}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <footer className="md-gallery-full-footer">
        <div className="md-gallery-full-footer-inner">
          <span className="md-gallery-full-footer-copy">© {new Date().getFullYear()} {brand}. All rights reserved.</span>
          <Link href="/" className="md-link">
            ← Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
