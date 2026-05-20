import { canonicalizeMarketingSitePath } from '@mavu/contracts';
import type { GallerySlide } from './gallery-categories';

/**
 * Listing and CMS image fields may contain absolute URLs seeded with localhost.
 * On production, those load from the visitor's machine — normalize to path-only so the
 * current site (or CDN paths under it) is used instead.
 */
export function normalizeMarketingImageUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  if (s.startsWith('/')) {
    return canonicalizeMarketingSitePath(s);
  }

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
      const pathOnly = `${u.pathname}${u.search}${u.hash}`;
      return pathOnly.length > 0 ? canonicalizeMarketingSitePath(pathOnly) : null;
    }
    /** Pastes like `https://mavudays.com/hero.jpg` in CMS → use path only so previews work on all domains. */
    const siteRaw = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL?.trim() : undefined;
    if (siteRaw) {
      try {
        const canon = new URL(siteRaw.includes('://') ? siteRaw : `https://${siteRaw}`);
        if (u.origin === canon.origin) {
          const pathOnly = `${u.pathname}${u.search}${u.hash}`;
          return pathOnly.length > 0 ? canonicalizeMarketingSitePath(pathOnly) : null;
        }
      } catch {
        /* ignore malformed env */
      }
    }
    return s;
  } catch {
    /** Reject bare words / typos (e.g. pasting a CMS key instead of a URL). */
    return null;
  }
}

/**
 * Canonical web origin where `/public` static files live (same Next deployment as the marketing pages).
 * Use for admin thumbnails so `/hero.jpg` works even when visiting admin from a hostname that does not serve `public/` (mis-set env edge cases fall back safely).
 */
function canonicalPublicSiteOrigin(): string {
  const raw = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL?.trim() : '';
  if (raw) {
    try {
      const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
      const h = u.hostname.toLowerCase();
      /** Never use loopback as the static host — copied `.env.example` in prod yields `http://localhost:3000/…` in &lt;img&gt; and broken thumbs. */
      if (h !== 'localhost' && h !== '127.0.0.1' && h !== '[::1]') {
        return u.origin.replace(/\/+$/, '');
      }
    } catch {
      /* ignore */
    }
  }
  const vercelHost = typeof process !== 'undefined' ? process.env.VERCEL_URL?.trim() : '';
  if (vercelHost) return `https://${vercelHost}`;
  return '';
}

/**
 * Stable absolute URL for &lt;img src&gt; in the admin CMS (tiles, list thumbs, previews).
 * Strips localhost / same-origin copies first, then prepends NEXT_PUBLIC_SITE_URL (non-loopback) or Vercel URL for root-relative paths.
 */
export function resolveMarketingImageSrcForPreview(raw: string | null | undefined): string {
  const normalized = normalizeMarketingImageUrl(raw);
  const s = normalized ?? String(raw ?? '').trim();
  if (!s) return '';

  if (s.startsWith('//')) return `https:${s}`;

  if (s.startsWith('/')) {
    const origin = canonicalPublicSiteOrigin();
    return origin ? `${origin}${s}` : s;
  }

  return s;
}

/** Alias: same resolver for marketing pages and admin — one code path for `<img src>`. */
export const resolveMarketingImageSrc = resolveMarketingImageSrcForPreview;

/** When the API returns no usable image URLs, still drive the bento from public paths (files under `apps/web/public/marketing/`). */
export function marketingGalleryStaticFallback(): GallerySlide[] {
  const slots: { key: string; path: string; alt: string }[] = [
    { key: 'gallery-room-1', path: canonicalizeMarketingSitePath('/1bhk.jpg'), alt: '1BHK bedroom and living space' },
    { key: 'gallery-room-2', path: canonicalizeMarketingSitePath('/2bhk.jpg'), alt: '2BHK villa interior' },
    { key: 'gallery-outdoor-1', path: canonicalizeMarketingSitePath('/full-farm.jpg'), alt: 'Farm lawn and outdoor areas' },
    { key: 'gallery-outdoor-2', path: canonicalizeMarketingSitePath('/full-farm.jpg'), alt: 'Mango grove and farm paths' },
    { key: 'gallery-porch-1', path: canonicalizeMarketingSitePath('/hero.jpg'), alt: 'Porch and sitout seating' },
    { key: 'gallery-view-1', path: canonicalizeMarketingSitePath('/hero.jpg'), alt: 'Open sky and farm views' },
    { key: 'gallery-other-1', path: canonicalizeMarketingSitePath('/2bhk.jpg'), alt: 'Weekend stay at Mavu Days' },
    { key: 'gallery-other-2', path: canonicalizeMarketingSitePath('/1bhk.jpg'), alt: 'Private villa comfort' },
  ];
  const seen = new Set<string>();
  const out: GallerySlide[] = [];
  for (const s of slots) {
    if (seen.has(s.path)) continue;
    seen.add(s.path);
    out.push({ url: s.path, alt: `${s.alt} · Mavu Days`, key: s.key });
  }
  return out;
}
