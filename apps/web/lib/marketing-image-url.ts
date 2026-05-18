/**
 * Listing and CMS image fields may contain absolute URLs seeded with localhost.
 * On production, those load from the visitor's machine — normalize to path-only so the
 * current site (or CDN paths under it) is used instead.
 */
export function normalizeMarketingImageUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  if (s.startsWith('/')) return s;

  if (s.startsWith('//')) {
    try {
      return `https:${s}`;
    } catch {
      return s;
    }
  }

  try {
    const u = new URL(s);
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') {
      const path = `${u.pathname}${u.search}${u.hash}`;
      return path.length > 0 ? path : null;
    }
    return s;
  } catch {
    return s;
  }
}

/** When the API returns no usable image URLs, still drive the bento from public paths (add files under `apps/web/public/` or use absolute CDN URLs in admin). */
export function marketingGalleryStaticFallback(): { url: string; alt: string; key: string }[] {
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
  const paths = ['/full-farm.jpg', '/hero.jpg', '/1bhk.jpg', '/2bhk.jpg'];
  return alts.map((alt, i) => ({
    url: paths[i % paths.length]!,
    alt: `${alt} · Mavu Days`,
    key: `marketing-static-${i}`,
  }));
}
