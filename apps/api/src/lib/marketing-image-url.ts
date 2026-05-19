/** Match web `normalizeMarketingImageUrl` so public API payloads aren’t polluted with localhost / duplicate absolute origins. */

export function normalizePublicImageUrl(raw: string | null | undefined): string | null {
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
      const pathOnly = `${u.pathname}${u.search}${u.hash}`;
      return pathOnly.length > 0 ? pathOnly : null;
    }
    const publicWeb = typeof process.env.PUBLIC_WEB_ORIGIN === 'string' ? process.env.PUBLIC_WEB_ORIGIN.trim() : '';
    if (publicWeb.length > 5) {
      try {
        const canon = new URL(publicWeb.includes('://') ? publicWeb : `https://${publicWeb}`);
        if (u.origin === canon.origin) {
          const pathOnly = `${u.pathname}${u.search}${u.hash}`;
          return pathOnly.length > 0 ? pathOnly : null;
        }
      } catch {
        /* ignore */
      }
    }
    return s;
  } catch {
    return s;
  }
}
