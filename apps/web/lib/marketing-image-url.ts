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
  const slots: { key: string; path: string; alt: string }[] = [
    { key: 'gallery-room-1', path: '/1bhk.jpg', alt: '1BHK bedroom and living space' },
    { key: 'gallery-room-2', path: '/2bhk.jpg', alt: '2BHK villa interior' },
    { key: 'gallery-outdoor-1', path: '/full-farm.jpg', alt: 'Farm lawn and outdoor areas' },
    { key: 'gallery-outdoor-2', path: '/full-farm.jpg', alt: 'Mango grove and farm paths' },
    { key: 'gallery-porch-1', path: '/hero.jpg', alt: 'Porch and sitout seating' },
    { key: 'gallery-view-1', path: '/hero.jpg', alt: 'Open sky and farm views' },
    { key: 'gallery-other-1', path: '/2bhk.jpg', alt: 'Weekend stay at Mavu Days' },
    { key: 'gallery-other-2', path: '/1bhk.jpg', alt: 'Private villa comfort' },
  ];
  const seen = new Set<string>();
  const out: { url: string; alt: string; key: string }[] = [];
  for (const s of slots) {
    if (seen.has(s.path)) continue;
    seen.add(s.path);
    out.push({ url: s.path, alt: `${s.alt} · Mavu Days`, key: s.key });
  }
  return out;
}
