/**
 * Best-effort extraction of listing photo URLs from a public Airbnb HTML page.
 * Airbnb markup changes often — callers should handle failures and empty results.
 */

import { URL } from 'node:url';
type FetchFn = (input: string, init?: unknown) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

function globalFetch(): FetchFn {
  const f = (globalThis as unknown as { fetch?: FetchFn }).fetch;
  if (typeof f !== 'function') throw new Error('Global fetch is not available');
  return f;
}

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
} as const;

export function assertAirbnbListingUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error('Invalid URL');
  }
  const host = u.hostname.toLowerCase();
  if (!host.includes('airbnb.')) {
    throw new Error('Use a full Airbnb listing link (airbnb.com, airbnb.co.in, …)');
  }
  return u.href;
}

function normalizeCandidate(raw: string): string | null {
  const s = raw.trim().replace(/\\u002f/gi, '/');
  if (!s.startsWith('http')) return null;
  try {
    const u = new URL(s.split(/\s/)[0]);
    const path = u.pathname.toLowerCase();
    if (!u.hostname.includes('muscache.com')) return null;
    if (!path.includes('/im/pictures/')) return null;
    u.hash = '';
    u.search = '';
    return u.toString();
  } catch {
    return null;
  }
}

function collectFromHtml(html: string): string[] {
  const found = new Map<string, true>();

  const add = (raw: string | undefined) => {
    const n = normalizeCandidate(raw ?? '');
    if (n) found.set(n, true);
  };

  for (const m of html.matchAll(/property=["']og:image["']\s+content=["']([^"']+)["']/gi)) {
    add(m[1]);
  }
  for (const m of html.matchAll(/content=["']([^"']+)["']\s+property=["']og:image["']/gi)) {
    add(m[1]);
  }

  for (const m of html.matchAll(/https?:\/\/a\d?\.muscache\.com\/im\/pictures\/[a-zA-Z0-9\-_/%.]+/gi)) {
    add(m[0]);
  }

  return [...found.keys()];
}

export async function fetchAirbnbListingImageCandidates(listingUrl: string): Promise<string[]> {
  const href = assertAirbnbListingUrl(listingUrl);
  const res = await globalFetch()(href, {
    redirect: 'follow',
    headers: FETCH_HEADERS,
  });
  if (!res.ok) {
    throw new Error(`Airbnb returned HTTP ${res.status}`);
  }
  const html = await res.text();
  const urls = collectFromHtml(html);
  return urls.slice(0, 48);
}
