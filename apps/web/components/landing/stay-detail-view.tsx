import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadLandingPayload } from '@/lib/landing-data';
import { whatsappBookingMessage, whatsappHref } from '@/lib/whatsapp';
import { RevealSection, RevealBlock } from '@/components/landing/reveal-section';

type Props = { slug: string };

const STAY_IMAGE: Record<string, string> = {
  '1bhk': '/1bhk.jpg',
  '2bhk': '/2bhk.jpg',
  'full-farm': '/full-farm.jpg',
};

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

export async function StayDetailView({ slug }: Props) {
  const { merged, orgName } = await loadLandingPayload();
  const t = merged.texts;
  const listing = t.listings.find((l) => l.id === slug);

  if (!listing) notFound();

  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE?.replace(/\D/g, '') ?? '';
  const waHref = whatsappHref(phone, whatsappBookingMessage('2'));
  const imgSrc = STAY_IMAGE[slug] ?? '/hero.jpg';

  const otherListings = t.listings.filter((l) => l.id !== slug);

  return (
    <div className="md-page-premium" style={{ background: 'var(--ivory)' }}>

      {/* ─── Navbar ─── */}
      <header className="md-bar md-bar-premium">
        <div className="md-bar-inner">
          {/* Left — nav links */}
          <div className="md-bar-nav-col">
            <nav className="md-nav" aria-label="Page sections">
              <Link href="/#about">About</Link>
              <Link href="/#stays">Stay</Link>
              <Link href="/#experience">Experiences</Link>
              <Link href="/#gallery">Gallery</Link>
              <Link href="/#faqs">FAQs</Link>
              <Link href="/#footer">Contact</Link>
            </nav>
          </div>

          {/* Center — logo */}
          <div className="md-bar-logo-col">
            <Link className="md-logo" href="/" aria-label={orgName}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt={orgName} className="md-logo-img" />
            </Link>
          </div>

          {/* Right — CTA */}
          <div className="md-bar-cta-col">
            <a className="md-btn-primary-nav" href={waHref} target="_blank" rel="noreferrer">
              Book via WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="md-stay-detail-hero" aria-label={listing.title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt={`${listing.title} at ${orgName}`} className="md-stay-detail-hero-img" />
        <div className="md-stay-detail-hero-overlay" aria-hidden />
        <div className="md-stay-detail-hero-content">
          <Link href="/#stays" className="md-stay-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            All Stays
          </Link>
          <p className="md-stay-detail-eyebrow">{orgName}</p>
          <h1 className="md-stay-detail-h1">{listing.title}</h1>
          <div className="md-stay-detail-meta">
            {listing.guests ? (
              <span className="md-stay-detail-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                Up to {listing.guests} Guests
              </span>
            ) : null}
            {listing.bedrooms ? (
              <span className="md-stay-detail-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 4v16M22 4v16M2 12h20M6 12V7a2 2 0 012-2h8a2 2 0 012 2v5"/></svg>
                {listing.bedrooms} Bedroom{listing.bedrooms > 1 ? 's' : ''}
              </span>
            ) : null}
            <span className="md-stay-detail-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Near Bangalore
            </span>
          </div>
        </div>
      </section>

      {/* ─── Content ─── */}
      <div className="md-stay-detail-body">
        <div className="md-wrap">
          <div className="md-stay-detail-layout">

            {/* ─── Main column ─── */}
            <div className="md-stay-detail-main">

              {/* Description */}
              <section className="md-stay-detail-section">
                <h2 className="md-stay-detail-section-title">About this Stay</h2>
                <p className="md-stay-detail-copy">{listing.copy}</p>
              </section>

              {/* Highlights */}
              {listing.highlights?.length ? (
                <section className="md-stay-detail-section">
                  <h2 className="md-stay-detail-section-title">What's Included</h2>
                  <ul className="md-stay-detail-highlights">
                    {listing.highlights.map((h) => (
                      <li key={h}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="20 6 9 17 4 12"/></svg>
                        {h}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {/* Amenities */}
              {listing.amenities?.length ? (
                <section className="md-stay-detail-section">
                  <h2 className="md-stay-detail-section-title">Amenities</h2>
                  <div className="md-stay-detail-amenities">
                    {listing.amenities.map((a) => (
                      <span key={a} className="md-stay-detail-amenity-pill">{a}</span>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Best For */}
              {listing.bestFor?.length ? (
                <section className="md-stay-detail-section">
                  <h2 className="md-stay-detail-section-title">Perfect For</h2>
                  <div className="md-stay-detail-amenities">
                    {listing.bestFor.map((b) => (
                      <span key={b} className="md-stay-detail-amenity-pill">{b}</span>
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Pricing */}
              {listing.pricing ? (
                <section className="md-stay-detail-section">
                  <h2 className="md-stay-detail-section-title">Pricing</h2>
                  <div className="md-table-wrap">
                    <table className="md-table">
                      <thead>
                        <tr>
                          <th>Day Type</th>
                          <th>Rate per night</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td>Weekdays (Mon–Thu)</td><td className="md-stay-price">{fmt(listing.pricing.weekday)}</td></tr>
                        <tr><td>Friday</td><td className="md-stay-price">{fmt(listing.pricing.friday)}</td></tr>
                        <tr><td>Saturday</td><td className="md-stay-price">{fmt(listing.pricing.saturday)}</td></tr>
                        <tr><td>Sunday</td><td className="md-stay-price">{fmt(listing.pricing.sunday)}</td></tr>
                        <tr><td>Long Weekends / Holidays</td><td className="md-stay-price">{fmt(listing.pricing.longWeekend)}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="md-muted" style={{ marginTop: '0.75rem', fontSize: '0.82rem' }}>
                    Prices are indicative. Final rate confirmed on booking.
                  </p>
                </section>
              ) : null}

            </div>

            {/* ─── Sticky sidebar CTA ─── */}
            <aside className="md-stay-detail-sidebar">
              <div className="md-stay-detail-cta-card">
                <p className="md-stay-detail-cta-label">Ready to book?</p>
                <p className="md-stay-detail-cta-title">{listing.title}</p>
                {listing.pricing ? (
                  <p className="md-stay-detail-cta-price">
                    From <strong>{fmt(listing.pricing.weekday)}</strong>
                    <span> / night</span>
                  </p>
                ) : null}
                <a
                  href={waHref}
                  className="md-btn md-btn-primary md-btn-block"
                  target="_blank"
                  rel="noreferrer"
                  style={{ marginBottom: '0.75rem' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp Us to Book
                </a>
                <Link href="/#booking" className="md-btn md-btn-secondary md-btn-block">
                  Check Availability
                </Link>
                <p className="md-stay-detail-cta-note">
                  No payment needed now — we'll confirm availability and pricing on WhatsApp.
                </p>
              </div>
            </aside>

          </div>
        </div>
      </div>

      {/* ─── Other Stays ─── */}
      {otherListings.length > 0 ? (
        <RevealSection className="md-section md-section-sage">
          <div className="md-wrap">
            <header className="md-section-head">
              <h2 className="md-h2">Other Stays at {orgName}</h2>
            </header>
            <div className="md-stay-grid">
              {otherListings.map((L, idx) => (
                <RevealBlock key={L.id} delayIndex={idx} className="md-stay-card">
                  <div className="md-stay-card-visual">
                    {STAY_IMAGE[L.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={STAY_IMAGE[L.id]}
                        alt={`${L.title} at ${orgName}`}
                        className="md-stay-card-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`md-stay-card-img md-stay-ph-${(idx % 3) + 1}`} style={{ height: 200 }} role="img" aria-label={L.title} />
                    )}
                    <span className="md-stay-card-gradient" aria-hidden />
                  </div>
                  <div className="md-stay-card-body">
                    <h3 className="md-h3">{L.title}</h3>
                    {L.guests ? (
                      <div className="md-stay-meta">
                        <span className="md-stay-pill">Up to {L.guests} Guests</span>
                        {L.bedrooms ? <span className="md-stay-pill">{L.bedrooms} Bedroom{L.bedrooms > 1 ? 's' : ''}</span> : null}
                      </div>
                    ) : null}
                    <p className="md-stay-desc">{L.short}</p>
                    <Link href={`/stays/${L.id}`} className="md-btn md-btn-primary md-btn-block">
                      View Details
                    </Link>
                  </div>
                </RevealBlock>
              ))}
            </div>
          </div>
        </RevealSection>
      ) : null}

      {/* ─── Footer strip ─── */}
      <footer className="md-stay-detail-footer">
        <div className="md-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>© {new Date().getFullYear()} {orgName}. All rights reserved.</span>
          <Link href="/" className="md-link">← Back to Home</Link>
        </div>
      </footer>

    </div>
  );
}
