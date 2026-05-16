import Link from 'next/link';
import {
  listingUrlPath,
  MAVU_DAYS_DIRECTIONS_URL,
  MAVU_DAYS_OSM_EMBED_URL,
} from '@/lib/landing-content';
import { loadLandingPayload } from '@/lib/landing-data';
import { whatsappBookingMessage, whatsappHref } from '@/lib/whatsapp';
import { AvailabilitySearch } from '@/components/landing/availability-search';
import { HeroReveal } from '@/components/landing/hero-reveal';
import { FeatureGlyph, WhoGlyph } from '@/components/landing/landing-glyphs';
import { OffersTicker } from '@/components/landing/offers-ticker';
import { LandingJsonLd } from '@/components/landing/landing-json-ld';
import { RevealArticle, RevealBlock, RevealFigure, RevealSection } from '@/components/landing/reveal-section';

type Path = '/' | '/farm-stay-near-bangalore';

function galleryFallbackSlots(count = 8) {
  const alts = [
    'Villa exterior with shaded lawn',
    'Private pool and leisure area',
    'Pool seating and open sky',
    'Farm pathway through mango grove',
    'Mango trees and walking trail',
    'Bonfire and outdoor evening lights',
    'Living room and cosy indoor seating',
    'Bedroom with natural light',
  ];
  return Array.from({ length: count }, (_, i) => ({ alt: alts[i % alts.length], key: `fallback-${i}` }));
}

/** Full marketing homepage */
export async function LandingView({ path }: { path: Path }) {
  const { orgSlug, merged, orgName, landingReviews, landingOffers } = await loadLandingPayload();
  const stayOptions =
    merged.homepageKind === 'MATRIX_THREE_SKU'
      ? [
          { value: 'all', label: 'Show all available options' },
          { value: 'fullFarm', label: 'Full Farm' },
          { value: 'villa1bhk', label: '1BHK Villa' },
          { value: 'villa2bhk', label: '2BHK Villa' },
        ]
      : [
          { value: 'all', label: 'Show all available options' },
          ...merged.texts.listings.map((L) => ({ value: listingUrlPath(L), label: L.title })),
        ];
  const hasImportedReviews = landingReviews.length > 0;
  const t = merged.texts;
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE?.replace(/\D/g, '') ?? '';
  const email = process.env.NEXT_PUBLIC_BOOKING_EMAIL?.trim() ?? '';

  const waHref = whatsappHref(phone, whatsappBookingMessage('2'));

  type GallerySlide = { url: string | null; alt: string; key: string };
  const galleryItems: GallerySlide[] =
    merged.gallery.length > 0
      ? merged.gallery.map((g) => ({ url: g.url, alt: g.alt, key: g.key }))
      : galleryFallbackSlots(8).map((p) => ({ url: null, alt: p.alt, key: p.key }));

  // Limit gallery to 8 for the 4×2 grid
  const galleryGrid = galleryItems.slice(0, 8);

  const verifiedFallbackLabel = 'Verified guest';
  const defaultReviews =
    t.reviewQuotes.length > 0
      ? t.reviewQuotes.slice(0, 6).map((quote) => ({
          quote,
          name: verifiedFallbackLabel,
          loc: '',
        }))
      : [
          {
            quote:
              'A perfect weekend escape! The place is beautiful, peaceful and well-maintained. We loved the pool and the bonfire nights.',
            name: verifiedFallbackLabel,
            loc: '',
          },
          {
            quote:
              'Our family had an amazing time. Kids enjoyed the open space and we enjoyed the calm. Highly recommended!',
            name: verifiedFallbackLabel,
            loc: '',
          },
          {
            quote: 'The villa was clean, cosy and the host was super helpful. We will definitely visit again soon.',
            name: verifiedFallbackLabel,
            loc: '',
          },
        ];

  const heroChips = t.chips.length ? t.chips : ['2-Acre Mango Farm', '1BHK, 2BHK & Full Farm', 'Near Bangalore', 'Private Villa Stay', 'Fenced ground · pets welcome'];

  return (
    <>
      <LandingJsonLd
        texts={t}
        path={path}
        imageUrl={merged.heroImageUrl}
        lodgingName={orgName}
        lodgingReviews={landingReviews}
      />

      <div className="md-page md-page-premium" id="md-top">

        <header className="md-bar md-bar-premium">
          <div className="md-bar-inner">
            <div className="md-bar-logo-col">
              <Link className="md-logo" href="#md-top" aria-label={orgName}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt={orgName} className="md-logo-img" />
              </Link>
            </div>

            <div className="md-bar-nav-col">
              <nav className="md-nav" aria-label="Page sections">
                <a href="#about">About</a>
                <a href="#stays">Stay</a>
                <a href="#pet-friendly">Pets</a>
                <a href="#experience">Experiences</a>
                <a href="#gallery">Gallery</a>
                <a href="#faqs">FAQs</a>
                <a href="#footer">Contact</a>
              </nav>
            </div>
            <div className="md-bar-cta-col">
              <a className="md-btn-primary-nav" href="#booking">
                Book Your Stay
              </a>
            </div>
          </div>
        </header>

        <OffersTicker offers={landingOffers} />

        <section className="md-hero-premium" aria-labelledby="hero-heading">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={merged.heroImageUrl ?? '/hero.jpg'}
            alt={`${orgName} — private mango farm stay near Bangalore`}
            className="md-hero-img"
          />
          <div className="md-hero-overlay-premium" aria-hidden />
          <div className="md-hero-content">
            <HeroReveal>
              <div className="md-hero-text">
                <p className="md-hero-eyebrow">
                  <span />
                  Private Mango Farm Stay · Near Bangalore
                </p>
                <h1 id="hero-heading" className="md-h1">
                  {t.heroH1 || 'Slow Down at\nMavu Days'}
                </h1>
                <p className="md-hero-lead">
                  {t.heroSub || 'A peaceful mango farm stay near Bangalore for slow weekends, family time, and private escapes.'}
                </p>
                <div className="md-hero-ctas">
                  <a className="md-btn md-btn-primary" href="#booking">
                    Check Availability
                  </a>
                  <a className="md-btn md-btn-ghost" href="#stays">
                    Explore Stays
                  </a>
                </div>
                <div className="md-hero-strip">
                  {heroChips.map((item) => (
                    <div key={item} className="md-hero-strip-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </HeroReveal>
          </div>
        </section>

        <div className="md-feature-strip" id="about">
          <div className="md-feature-strip-inner">
            {(
              t.featureStripLabels.length
                ? t.featureStripLabels
                : ['Up to 12 Guests', '1BHK, 2BHK & Full Farm', '65 km from Bangalore', '2-Acre Mango Farm']
            ).map((label, idx) => {
              const paths = [
                'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75 M9 3a4 4 0 100 8 4 4 0 000-8z',
                'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
                'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7a3 3 0 100 6 3 3 0 000-6z',
                'M3 17l3-3 4 4 4-4 4 4 M3 7l3 3 4-4 4 4 4-4',
              ];
              const icon = paths[idx % paths.length];
              return (
                <div key={`${label}-${idx}`} className="md-strip-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={icon} />
                  </svg>
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        <AvailabilitySearch
          orgSlug={orgSlug}
          availabilityTitle={t.availabilityTitle}
          availabilitySubtitle={t.availabilitySubtitle}
          whatsappDigits={phone}
          homepageKind={merged.homepageKind}
          stayOptions={stayOptions}
        />

        <RevealSection className="md-section md-section-cream" id="stays">
          <div className="md-wrap">
            <header className="md-section-head md-section-head-center">
              <p className="md-eyebrow-line md-section-label">Choose Your Stay</p>
              <h2 className="md-h2">{t.staysTitle || 'Find the Stay That Fits'}</h2>
              <p className="md-lead">{t.staysSubtitle || 'Three ways to experience Mavu Days — cosy, spacious, or the whole farm to yourself.'}</p>
            </header>
            <div className="md-stay-grid">
              {t.listings.map((L, idx) => {
                const pathSeg = listingUrlPath(L);
                const staticImg =
                  pathSeg === '1bhk' || pathSeg === '1bhk-villa'
                    ? '/1bhk.jpg'
                    : pathSeg === '2bhk' || pathSeg === '2bhk-villa'
                      ? '/2bhk.jpg'
                      : pathSeg === 'full-farm'
                        ? '/full-farm.jpg'
                        : null;
                const cover = galleryItems[idx] ?? galleryItems[0];
                const imgSrc = L.detailHeroUrl?.trim() || staticImg || cover?.url;
                return (
                  <RevealArticle key={pathSeg} delayIndex={idx} className="md-stay-card md-stay-card-linked">
                    <div className="md-stay-card-visual">
                      <Link
                        href={`/stays/${pathSeg}`}
                        className="md-stay-card-cover-link"
                        aria-label={`View ${L.title} details`}
                        tabIndex={-1}
                      />
                      {imgSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgSrc}
                          alt={`${L.title} — villa exterior at Mavu Days`}
                          loading="lazy"
                          className="md-stay-card-img"
                        />
                      ) : (
                        <div
                          className={`md-stay-card-img md-stay-ph-${(idx % 3) + 1}`}
                          role="img"
                          aria-label={`${L.title} atmosphere`}
                          style={{ height: 230 }}
                        />
                      )}
                      <span className="md-stay-card-gradient" aria-hidden />
                    </div>
                    <div className="md-stay-card-body">
                      <h3 className="md-h3">{L.title}</h3>
                      <div className="md-stay-meta">
                        {L.guests ? (
                          <span className="md-stay-pill">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 3a4 4 0 100 8 4 4 0 000-8z" /></svg>
                            Up to {L.guests} Guests
                          </span>
                        ) : null}
                        {L.bedrooms ? (
                          <span className="md-stay-pill">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 4v16 M22 4v16 M2 12h20 M6 12V7a2 2 0 012-2h8a2 2 0 012 2v5" /></svg>
                            {L.bedrooms} Bedroom{L.bedrooms > 1 ? 's' : ''}
                          </span>
                        ) : null}
                      </div>
                      <p className="md-stay-desc">{L.short}</p>
                      {L.bestFor?.length ? (
                        <>
                          <p className="md-stay-bestfor-label">Best for</p>
                          <div className="md-stay-tags">
                            {L.bestFor.slice(0, 4).map((b) => (
                              <span key={b} className="md-stay-tag">{b}</span>
                            ))}
                          </div>
                        </>
                      ) : null}
                      <Link href={`/stays/${pathSeg}`} className="md-btn md-btn-primary md-btn-block">
                        {L.cta || 'View Details'}
                      </Link>
                    </div>
                  </RevealArticle>
                );
              })}
            </div>
          </div>
        </RevealSection>

        <RevealSection className="md-section" id="experience">
          <div className="md-wrap">
            <header className="md-section-head md-section-head-center">
              <p className="md-eyebrow-line md-section-label">Experiences</p>
              <h2 className="md-h2">{t.whyTitle || 'What Awaits You'}</h2>
              <p className="md-lead">{t.whyIntro || 'More than a stay — a full sensory reconnection with nature and slow living.'}</p>
            </header>
            <div className="md-feature-grid">
              {t.whyBlocks.map((b, fi) => (
                <RevealBlock key={b.title} delayIndex={fi} className="md-feature">
                  <div className="md-feature-head">
                    <span className="md-glyph md-feature-icon-wrap" aria-hidden>
                      <FeatureGlyph index={fi} />
                    </span>
                    <h3 className="md-h4">{b.title}</h3>
                  </div>
                  <p>{b.text}</p>
                </RevealBlock>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection className="md-section md-section-cream" id="story">
          <div className="md-wrap">
            <div className="md-story-split">
              <div className="md-story-panel">
                <p className="md-section-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Our Story</p>
                <h2 className="md-h2" style={{ marginBottom: '1.25rem' }}>
                  {t.experienceTitle || 'Where Nature Slows You Down'}
                </h2>
                <p className="md-body md-prose" style={{ marginBottom: '1.5rem' }}>
                  {t.experienceBodyDefault || 'Wake up to birdsong, breathe in fresh air, and lose track of time. At Mavu Days, every moment is an invitation to relax, reconnect, and simply be.'}
                </p>
                {t.tiles?.length ? (
                  <ul className="md-tiles" style={{ marginBottom: '1.75rem' }}>
                    {t.tiles.slice(0, 5).map((tile) => (
                      <li key={tile}>{tile}</li>
                    ))}
                  </ul>
                ) : null}
                <a href="#gallery" className="md-btn md-btn-secondary">
                  View Gallery →
                </a>
              </div>
              <RevealFigure delayIndex={1} className="md-story-img-wrap">
                {(() => {
                  const shot = galleryItems.find((g) => g.url) ?? galleryItems[0];
                  return shot?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shot.url} alt={shot.alt} loading="lazy" />
                  ) : (
                    <div className="md-story-ph" role="img" aria-label="Mavu Days farm landscape" />
                  );
                })()}
              </RevealFigure>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="md-section md-section-sage" id="gallery">
          <div className="md-wrap">
            <header className="md-section-head md-section-head-center">
              <p className="md-eyebrow-line md-section-label">Gallery</p>
              <h2 className="md-h2">{t.galleryTitle || 'Inside Mavu Days'}</h2>
              <p className="md-lead">{t.galleryIntroDefault || 'A glimpse of the spaces, light, and calm that await you.'}</p>
            </header>
            <div className="md-gallery-grid md-gallery-desktop">
              {galleryGrid.map((item, i) => (
                <RevealFigure key={item.key} delayIndex={i} className="md-gallery-grid-item">
                  {item.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.alt} loading="lazy" />
                  ) : (
                    <div className={`md-gallery-ph-${(i % 4) + 1}`} role="img" aria-label={item.alt} />
                  )}
                </RevealFigure>
              ))}
            </div>
            <div className="md-gallery-scroll" aria-label="Photo gallery">
              {galleryGrid.map((item, i) => (
                <div key={`m-${item.key}`} className="md-swipe-card">
                  {item.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.alt} className="md-swipe-img" loading="lazy" />
                  ) : (
                    <div className={`md-gallery-ph md-gallery-ph-${(i % 4) + 1}`} role="img" aria-label={item.alt} style={{ height: 220 }} />
                  )}
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.75rem' }}>
              <a href={waHref} className="md-btn md-btn-secondary" target="_blank" rel="noreferrer">
                Request Full Photo Tour
              </a>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="md-section" id="who">
          <div className="md-wrap">
            <header className="md-section-head md-section-head-center">
              <p className="md-eyebrow-line md-section-label">Perfect For</p>
              <h2 className="md-h2">{t.whoTitle || 'Perfect for Every Kind of Escape'}</h2>
              <p className="md-lead">{t.whoIntro || 'Whether you seek solitude, celebration, or simple family joy — Mavu Days fits.'}</p>
            </header>
            <div className="md-who-grid">
              {t.whoCards.map((c, wi) => (
                <RevealArticle key={c.title} delayIndex={wi} className="md-who-card">
                  <div className="md-who-symbol" aria-hidden>
                    <WhoGlyph title={c.title} />
                  </div>
                  <h3 className="md-h4">{c.title}</h3>
                  <p className="md-who-snippet">{c.body}</p>
                </RevealArticle>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection className="md-section md-section-sage" id="pet-friendly">
          <div className="md-wrap">
            <div className="md-pet-friendly-split">
              <div>
                <p className="md-eyebrow-line md-section-label">{t.petFriendlyEyebrow || 'Pet-friendly stay'}</p>
                <h2 className="md-h2" style={{ marginBottom: '0.75rem' }}>
                  {t.petFriendlyTitle || 'Room for dogs to gallop'}
                </h2>
                <p className="md-lead" style={{ marginBottom: '1.25rem' }}>
                  {t.petFriendlyLead ||
                    'Fenced acreage gives pups space to roam while you unwind—built with pet parents in mind.'}
                </p>
                <div className="md-body md-prose">
                  {(t.petFriendlyBody || '')
                    .trim()
                    .split(/\n\s*\n/)
                    .filter(Boolean)
                    .map((para, i) => (
                      <p key={i} style={i === 0 ? undefined : { marginTop: '0.85rem' }}>
                        {para}
                      </p>
                    ))}
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <a href="#booking" className="md-btn md-btn-secondary">
                    Check dates with your dog →
                  </a>
                  <a href={waHref} className="md-btn md-btn-wa" target="_blank" rel="noreferrer">
                    WhatsApp to book
                  </a>
                </div>
              </div>
              <div className="md-pet-friendly-icon-panel" aria-hidden>
                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 9.5L3 11c-.8.8-.8 2.1 0 2.9l.9.9c.6.6 1.5.8 2.3.4a6 6 0 014.5-.6c.8.2 1.6 0 2.2-.5l1.2-1.1c.7-.6.7-1.7 0-2.3l-1.3-1.2" />
                  <path d="M8 6.5c.5-1.4 2-2.1 3.3-1.5.6.3 1 .9 1.1 1.6" />
                  <path d="M16.2 6.3c1.3-.7 2.9 0 3.3 1.5.2.6 0 1.3-.4 1.8" />
                  <ellipse cx="12" cy="15.5" rx="4.2" ry="3.2" />
                  <circle cx="9" cy="11" r="1.3" />
                  <circle cx="15" cy="11" r="1.3" />
                  <circle cx="10.2" cy="8.8" r="1.1" />
                  <circle cx="13.8" cy="8.8" r="1.1" />
                </svg>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="md-section md-section-cream" id="location">
          <div className="md-wrap">
            <div className="md-split-location">
              <div className="md-map-shell">
                <iframe
                  title="Map — Mavu Days Farm House"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="md-map-frame"
                  src={MAVU_DAYS_OSM_EMBED_URL}
                />
                <span className="md-map-pin-hint">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Mavu Days Farm House · Near Channapatna, Karnataka
                </span>
              </div>
              <div>
                <p className="md-section-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Location</p>
                <h2 className="md-h2" style={{ marginBottom: '1rem' }}>
                  {t.locationTitle || 'Near Yet Far Enough'}
                </h2>
                <p className="md-body md-prose" style={{ marginBottom: '1.25rem' }}>
                  {t.locationBodyDefault || 'A quick drive from Bangalore takes you worlds away — into quiet farm roads, mango groves, and open skies.'}
                </p>
                <ul className="md-tiles" style={{ marginBottom: '1.75rem' }}>
                  {(t.locationBulletsDefault ?? [
                    'Around 65 km from Bangalore',
                    'Easy drive via NICE Road / Kanakapura Road',
                    'Close to Channapatna & Ramanagara',
                    'Surrounded by mango farms & nature',
                    'Perfect for a quick weekend escape',
                  ]).map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <a
                  className="md-btn md-btn-primary"
                  href={MAVU_DAYS_DIRECTIONS_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Get Directions
                </a>
                <p className="md-muted md-footnote">
                  Need help finding us?{' '}
                  <a href={waHref} className="md-link">WhatsApp us</a>.
                </p>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="md-section md-section-sage" id="amenities">
          <div className="md-wrap">
            <header className="md-section-head md-section-head-center">
              <p className="md-eyebrow-line md-section-label">What&#39;s Included</p>
              <h2 className="md-h2">{t.amenitiesTitle || 'All You Need, Ready for You'}</h2>
              {t.amenitiesIntroDefault ? <p className="md-lead">{t.amenitiesIntroDefault}</p> : null}
            </header>
            <div className="md-amenities-scroll">
              <div className="md-amenities md-amenities-row">
                {t.amenitiesDefault.map((a, ai) => (
                  <div key={a} className="md-amenity">
                    <span className="md-amenity-icon" aria-hidden>
                      <AmenityIcon index={ai} />
                    </span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="md-section md-section-sm" id="book-cta">
          <div className="md-wrap">
            <div className="md-banner">
              <h2 className="md-h2" style={{ marginBottom: '0.6rem' }}>
                {t.bannerTitleDefault || 'Ready for a slower, happier weekend?'}
              </h2>
              <p className="md-lead" style={{ margin: '0 auto 0' }}>
                {t.bannerCopyDefault || 'Book your stay at Mavu Days and make memories that last.'}
              </p>
              <div className="md-banner-ctas">
                <a href="#booking" className="md-btn md-btn-primary">
                  Check Availability
                </a>
                <a href={waHref} className="md-btn md-btn-wa" target="_blank" rel="noreferrer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp Us
                </a>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="md-section md-section-cream" id="house-rules">
          <div className="md-wrap">
            <header className="md-section-head">
              <h2 className="md-h2">{t.houseRulesTitle || 'House Rules'}</h2>
              <p className="md-lead md-lead-balanced">{t.houseRulesIntroDefault || 'A few simple guidelines to keep the space peaceful for everyone.'}</p>
            </header>
            <div className="md-rules">
              {t.houseRules.map((r, ri) => (
                <RevealBlock key={r.title} delayIndex={ri} className="md-rule-item">
                  <span className="md-rule-num" aria-hidden>{String(ri + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="md-h4">{r.title}</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: 'var(--body-color)' }}>{r.text}</p>
                  </div>
                </RevealBlock>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection className="md-section" id="reviews">
          <div className="md-wrap">
            <header className="md-section-head md-section-head-center">
              <p className="md-eyebrow-line md-section-label">Guest Love</p>
              <h2 className="md-h2">{t.reviewsTitle || 'What Our Guests Say'}</h2>
              {t.reviewsIntroDefault ? (
                <p className="md-lead">{t.reviewsIntroDefault}</p>
              ) : null}
            </header>
            <div className="md-review-grid">
              {hasImportedReviews
                ? landingReviews.map((r, idx) => (
                    <RevealFigure key={r.id} delayIndex={idx} className="md-review-card">
                      <div className="md-review-stars">★★★★★</div>
                      <blockquote className="md-quote">
                        <p>{`"${r.body}"`}</p>
                      </blockquote>
                      <div>
                        <p className="md-reviewer">
                          {r.guestDisplayName || 'Verified Guest'}
                          {r.platformLabel ? (
                            <span className="md-review-platform" style={{ marginLeft: '0.5rem' }}>{r.platformLabel}</span>
                          ) : null}
                        </p>
                      </div>
                    </RevealFigure>
                  ))
                : defaultReviews.map((q, idx) => (
                    <RevealBlock key={idx} delayIndex={idx} className="md-review-card">
                      <div className="md-review-stars">★★★★★</div>
                      <blockquote className="md-quote">
                        <p>{`"${q.quote}"`}</p>
                      </blockquote>
                      <div>
                        <p className="md-reviewer">{q.name}</p>
                        {q.loc ? <p className="md-reviewer-loc">{q.loc}</p> : null}
                      </div>
                    </RevealBlock>
                  ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection className="md-section md-section-cream" id="faqs">
          <div className="md-wrap">
            <header className="md-section-head md-section-head-center">
              <h2 className="md-h2">{t.faqTitle || 'Frequently Asked Questions'}</h2>
            </header>
            <div className="md-faq-grid">
              {t.faqs.map((f, fi) => (
                <RevealBlock key={f.q} delayIndex={Math.min(fi, 8)}>
                  <details className="md-faq">
                    <summary>{f.q}</summary>
                    <div className="md-faq-body">{f.a}</div>
                  </details>
                </RevealBlock>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection className="md-section md-section-sm" id="seo" aria-labelledby="seo-collapsed-title">
          <div className="md-wrap md-seo-wrap">
            <details className="md-details-seo">
              <summary className="md-seo-summary" id="seo-collapsed-title">
                {t.seoTitle || 'About Mavu Days Farm Stay'}
              </summary>
              <div className="md-seo-body md-seo-prose">
                {t.seoBodyDefault.split(/\n\s*\n/).map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </details>
          </div>
        </RevealSection>

        <footer className="md-footer" id="footer">
          <div className="md-wrap">
            <div className="md-footer-grid">
              <div className="md-footer-brand">
                <a href="#md-top" className="md-footer-logo" aria-label={orgName}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.svg" alt={orgName} className="md-footer-logo-img" />
                </a>
                <p>A peaceful mango farm stay near Bangalore for slow weekends, family time and private escapes.</p>
              </div>
              <div>
                <p className="md-footer-col-title">Quick Links</p>
                <ul className="md-footer-links">
                  <li><a href="#about">About Us</a></li>
                  <li><a href="#stays">Our Stays</a></li>
                  <li><a href="#experience">Experiences</a></li>
                  <li><a href="#pet-friendly">Pet-friendly</a></li>
                  <li><a href="#gallery">Gallery</a></li>
                  <li><a href="#faqs">FAQs</a></li>
                </ul>
              </div>
              <div>
                <p className="md-footer-col-title">Contact</p>
                <div className="md-footer-contact">
                  {phone ? (
                    <a href={`tel:+${phone}`} className="md-footer-contact-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                      +{phone}
                    </a>
                  ) : null}
                  {email ? (
                    <a href={`mailto:${email}`} className="md-footer-contact-item md-footer-mail">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      {email}
                    </a>
                  ) : null}
                  <span className="md-footer-contact-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Near Channapatna, Karnataka
                  </span>
                </div>
              </div>
              {phone || email ? (
                <div>
                  <p className="md-footer-col-title">Stay in touch</p>
                  <p className="md-muted" style={{ marginBottom: '0.75rem', fontSize: '0.88rem' }}>
                    Message us on WhatsApp or email—we reply when we can.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {phone ? (
                      <a
                        href={waHref}
                        className="md-btn md-btn-primary"
                        style={{ justifyContent: 'center', fontSize: '0.88rem', padding: '0.55rem 1rem' }}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    {email ? (
                      <a
                        href={`mailto:${email}`}
                        className="md-btn md-btn-ghost"
                        style={{ justifyContent: 'center', fontSize: '0.88rem', padding: '0.55rem 1rem' }}
                      >
                        Email
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="md-footer-bottom">
              <span>© {new Date().getFullYear()} {orgName}. All rights reserved.</span>
              <span>
                <Link href="/login" className="md-footer-bottom md-link" style={{ fontSize: '0.8rem' }}>Host login</Link>
              </span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}

const AMENITY_SVG_PATHS: string[] = [
  'M3 21v-9l9-7 9 7v9 M9 21v-6h6v6',
  'M2 7h20v14H2z M16 7V5a2 2 0 00-8 0v2 M12 12v5 M9.5 14.5h5',
  'M3 17h3m15 0h-3M12 3v2m-8.5 7.5 1.5 1.5m15-1.5-1.5 1.5',
  'M5 12.55a11 11 0 0114.08 0 M1.42 9a16 16 0 0121.16 0 M8.53 16.11a6 6 0 016.95 0 M12 20h.01',
  'M3 9h18M3 13h18M5 5v16M19 5v16',
  'M2 21c1-5 5-9 11-9s9 4 10 9',
  'M2 21a9 9 0 0120 0 M15 21l-3-3-3 3',
  'M18.5 19c.9-1.1 1.5-2.5 1.5-4a6 6 0 00-12 0c0 1.5.6 2.9 1.5 4 M9 19h6m-3 0v3',
];

function AmenityIcon({ index }: { index: number }) {
  const d = AMENITY_SVG_PATHS[index % AMENITY_SVG_PATHS.length];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
