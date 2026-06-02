'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { publicApiBaseUrl } from '@/lib/public-api-base';
import { publicOrgSlugCandidates } from '@/lib/public-org-slug';

const VISITOR_KEY_STORAGE = 'mavu_visitor_key';

function ensureVisitorKey(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY_STORAGE);
    if (existing && existing.length >= 8) return existing;
    const key =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '')
        : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_KEY_STORAGE, key);
    return key;
  } catch {
    return `v${Date.now().toString(36)}`;
  }
}

function shouldTrackPath(pathname: string): boolean {
  if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/login')) return false;
  return true;
}

/** Sends a lightweight pageview to the booking API (first-party site analytics). */
export function SiteAnalyticsBeacon() {
  const pathname = usePathname();
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || !shouldTrackPath(pathname)) return;
    if (lastSentRef.current === pathname) return;
    lastSentRef.current = pathname;

    const envSlug = process.env.NEXT_PUBLIC_ORG_SLUG ?? '';
    const slugs = publicOrgSlugCandidates(envSlug);
    const slug = slugs[0];
    if (!slug) return;

    const api = publicApiBaseUrl();
    const body = JSON.stringify({
      path: pathname,
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      visitorKey: ensureVisitorKey(),
    });

    const url = `${api}/public/orgs/${encodeURIComponent(slug)}/analytics/pageview`;

    try {
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const ok = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        if (ok) return;
      }
    } catch {
      /* fall through to fetch */
    }

    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
