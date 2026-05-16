import { type LandingTexts, MAVU_DAYS_DIRECTIONS_URL, MAVU_DAYS_GEO } from '@/lib/landing-content';
import type { PublicGuestReviewDto } from '@/lib/public-types';
import { resolveSiteOrigin } from '@/lib/site-url';

export function siteOrigin(): string {
  return resolveSiteOrigin();
}

type Props = {
  texts: LandingTexts;
  path: '/' | '/farm-stay-near-bangalore';
  imageUrl?: string | null;
  lodgingName: string;
  lodgingReviews: PublicGuestReviewDto[];
};

/** LodgingBusiness (+ optional Review / AggregateRating), FAQPage, BreadcrumbList JSON-LD. */
export function LandingJsonLd({ texts, path, imageUrl, lodgingName, lodgingReviews }: Props) {
  const origin = siteOrigin();
  const pageUrl = path === '/' ? origin : `${origin}${path}`;
  const homeUrl = `${origin}/`;

  const lodging: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: lodgingName,
    description:
      'Escape to Mavu Days, a peaceful 2-acre mango farm stay near Bangalore with private villa stays, open green spaces, and flexible booking options.',
    url: homeUrl,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Near Channapatna',
      addressRegion: 'Karnataka',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: MAVU_DAYS_GEO.latitude,
      longitude: MAVU_DAYS_GEO.longitude,
    },
    hasMap: MAVU_DAYS_DIRECTIONS_URL,
    areaServed: {
      '@type': 'City',
      name: 'Bengaluru',
    },
    priceRange: '$$',
  };
  if (imageUrl?.trim()) lodging.image = imageUrl;

  if (lodgingReviews.length > 0) {
    const shown = lodgingReviews.slice(0, 8);
    let sum = 0;
    const reviewNodes = shown.map((r) => {
      sum += r.rating;
      const row: Record<string, unknown> = {
        '@type': 'Review',
        author: { '@type': 'Person', name: r.guestDisplayName?.trim() || 'Guest' },
        reviewBody: r.body.trim(),
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.rating,
          bestRating: r.ratingMax,
        },
      };
      if (r.title?.trim()) row.name = r.title.trim();
      if (r.reviewedAt) row.datePublished = r.reviewedAt;
      return row;
    });

    lodging.review = reviewNodes;
    lodging.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round((sum / shown.length + Number.EPSILON) * 10) / 10,
      bestRating: Math.max(...shown.map((r) => r.ratingMax)),
      worstRating: 1,
      reviewCount: shown.length,
    };
  }

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: texts.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: homeUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: path === '/' ? `${lodgingName} farm stay near Bangalore` : `Farm stay near Bangalore · ${lodgingName}`,
        item: pageUrl,
      },
    ],
  };

  const scripts = [lodging, faq, crumbs];

  return (
    <>
      {scripts.map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}
    </>
  );
}
