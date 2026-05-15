/**
 * Canonical origin for metadataBase and JSON-LD.
 * Prepends https:// when NEXT_PUBLIC_SITE_URL has no scheme (a common misconfig).
 * Uses VERCEL_URL during Vercel CI when NEXT_PUBLIC_SITE_URL is unset (no need to expose NEXT_PUBLIC_VERCEL_URL).
 */
export function resolveSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    const normalized = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
    try {
      return new URL(normalized).origin;
    } catch {
      /* fall through */
    }
  }
  const vercelHost =
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    const host = vercelHost.replace(/^https?:\/\//, '').split('/')[0]?.replace(/\/+$/, '') ?? '';
    if (host) return `https://${host}`;
  }
  return 'http://localhost:3000';
}
