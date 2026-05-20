/**
 * Imports Google Places + Airbnb reviews into GuestReview rows.
 *
 * Google: GOOGLE_PLACES_API_KEY env + each Property.googlePlaceId (legacy OrgSiteSettings.googlePlaceId if none).
 * Airbnb: every distinct published RentableUnitListing.airbnbListingUrl; optional legacy airbnbReviewsListingUrl in settings.
 * Prefer OUTSCRAPER_API_KEY (paid, stable) for Airbnb. Without Outscraper, embedded HTML scraping is fragile.
 *
 * Rows created by sync use autoSynced=true; each sync deletes prior autoSynced rows and recreates them.
 * First successful sync (when externalReviewsFirstSyncAt was unset) clears manual GuestReviews whose body matches seeded marketing placeholders and hides quote-carousel fallbacks on the public site.
 */

import type { PrismaClient } from '@prisma/client';
import { OrgHomepageKind, ReviewPlatform } from '@prisma/client';

import { PUBLIC_LANDING_REVIEWS_LIMIT } from '../lib/landing-review-limits.js';

const GOOGLE_PLACES_DETAILS = 'https://places.googleapis.com/v1/places/';
const OUTSCRAPER_AIRBNB_REVIEWS = 'https://api.outscraper.cloud/airbnb-reviews';

/** Airbnb / Google batches — request enough to populate the horizontal review strip after de-dupe + 4★+ filter */
const MAX_FETCH_PER_SOURCE = 120;

/** Keep memory/time bounded while scanning huge Next.js payloads in listing HTML */
const MAX_HTML_CHARS_FOR_SCRAPE = 2_500_000;
const MAX_EMBEDDED_JSON_WALK_NODES = 45_000;

/** Canonical marketing copy mirrored in CMS `landing-review-quotes`, LandingView fallbacks, and seed. */
const KNOWN_DUMMY_REVIEW_BODY_LINES = [
  'Peaceful, private, and exactly what we needed for a weekend away from Bangalore.',
  'A beautiful farm setting with enough space for the family to relax and unwind.',
  'The perfect place to disconnect from city noise and spend slow time with loved ones.',
  'A perfect weekend escape! The place is beautiful, peaceful and well-maintained. We loved the pool and the bonfire nights.',
  'Our family had an amazing time. Kids enjoyed the open space and we enjoyed the calm. Highly recommended!',
  'The villa was clean, cosy and the host was super helpful. We will definitely visit again soon.',
] as const;

function normalizeDummyReviewBody(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function dummyReviewBodiesSet(extraLinesFromCms: readonly string[]): Set<string> {
  const set = new Set<string>();
  for (const raw of KNOWN_DUMMY_REVIEW_BODY_LINES) set.add(normalizeDummyReviewBody(raw));
  for (const raw of extraLinesFromCms) {
    const n = normalizeDummyReviewBody(raw);
    if (n.length >= 18) set.add(n);
  }
  return set;
}

async function landingReviewQuotesLines(prisma: PrismaClient, organizationId: string): Promise<string[]> {
  const row = await prisma.siteSection.findFirst({
    where: { organizationId, key: 'landing-review-quotes' },
    select: { bodyMarkdown: true },
  });
  const raw = row?.bodyMarkdown;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length >= 12);
}

async function markExternalReviewsFirstSyncIfNeeded(prisma: PrismaClient, organizationId: string): Promise<void> {
  const now = new Date();
  const u = await prisma.orgSiteSettings.updateMany({
    where: { organizationId, externalReviewsFirstSyncAt: null },
    data: { externalReviewsFirstSyncAt: now },
  });
  if (u.count > 0) return;
  const exists = await prisma.orgSiteSettings.findUnique({
    where: { organizationId },
    select: { id: true },
  });
  if (exists) return;
  await prisma.orgSiteSettings.create({
    data: {
      organizationId,
      homepageKind: OrgHomepageKind.LISTING_GRID,
      externalReviewsFirstSyncAt: now,
    },
  });
}

export type ExternalReviewsSyncResult = {
  ok: boolean;
  deletedAutoSynced: number;
  createdCount: number;
  landingVisibleCount: number;
  googleFetched: number;
  airbnbFetched: number;
  errors: string[];
  warnings: string[];
};

type NormalizedIncoming = {
  platform: typeof ReviewPlatform.GOOGLE | typeof ReviewPlatform.AIRBNB;
  rating: number;
  ratingMax: number;
  guestDisplayName: string | null;
  title: string | null;
  body: string;
  reviewedAt: Date | null;
  externalId: string | null;
};

function normalizedFiveStars(row: Pick<NormalizedIncoming, 'rating' | 'ratingMax'>): number {
  const mx = row.ratingMax > 0 ? row.ratingMax : 5;
  return (row.rating / mx) * 5;
}

function isPositiveIncoming(row: Pick<NormalizedIncoming, 'rating' | 'ratingMax'>): boolean {
  return normalizedFiveStars(row) >= 4 - 1e-9;
}

type OrgWithListingUrls = PrismaOrganizationWithListings | null;

type PrismaOrganizationWithListings = {
  properties: Array<{
    googlePlaceId: string | null;
    units: Array<{
      listingProfile: null | {
        airbnbListingUrl: string | null;
      };
    }>;
  }>;
};

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '\u2026';
}

/** Distinct Airbnb room URLs from CMS stay listings with an Airbnb URL saved (published or draft). */
export function pickAllPublishedAirbnbListingUrls(org: OrgWithListingUrls): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  if (!org?.properties?.length) return out;
  for (const prop of org.properties) {
    for (const unit of prop.units ?? []) {
      const lp = unit.listingProfile;
      if (!lp?.airbnbListingUrl?.trim()) continue;
      const u = lp.airbnbListingUrl.trim();
      try {
        new URL(u);
        if (!/airbnb\./i.test(u)) continue;
      } catch {
        continue;
      }
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

/** @deprecated Prefer pickAllPublishedAirbnbListingUrls — kept for callers that still need one URL */
export function pickFirstPublishedAirbnbListingUrl(org: OrgWithListingUrls): string | null {
  const all = pickAllPublishedAirbnbListingUrls(org);
  return all[0] ?? null;
}

type GooglePlacesReviewJSON = {
  name?: string;
  rating?: number;
  publishTime?: string;
  authorAttribution?: { displayName?: string };
  text?: { text?: string };
  originalText?: { text?: string };
};

async function fetchGoogleReviews(
  placeId: string,
  apiKey: string,
): Promise<{ rows: NormalizedIncoming[]; error?: string }> {
  let id = clip(placeId.trim(), 240);
  if (id.startsWith('places/')) id = id.slice('places/'.length);
  const url = `${GOOGLE_PLACES_DETAILS}${encodeURIComponent(id)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        /**
         * `reviews` triggers Place Details Enterprise+ Atmosphere SKU.
         * Include `id` (and optionally `displayName`) so FieldMask validates like official examples.
         */
        'X-Goog-FieldMask': 'id,reviews',
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return {
      rows: [],
      error: `Google Places request failed (${e instanceof Error ? e.message : 'network'})`,
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { rows: [], error: 'Google Places: invalid JSON response' };
  }

  if (!res.ok) {
    const msg =
      typeof json === 'object' && json && 'error' in json
        ? JSON.stringify((json as { error?: unknown }).error ?? json)
        : res.statusText;
    return {
      rows: [],
      error: `Google Places error (${res.status}): ${msg}`,
    };
  }

  const reviewsUnknown = typeof json === 'object' && json && 'reviews' in json ? (json as { reviews?: unknown }).reviews : null;
  if (!Array.isArray(reviewsUnknown)) {
    return { rows: [] };
  }

  const rows: NormalizedIncoming[] = [];
  for (const raw of reviewsUnknown as GooglePlacesReviewJSON[]) {
    const bodyRaw =
      (typeof raw.originalText?.text === 'string' && raw.originalText.text.trim()) ||
      (typeof raw.text?.text === 'string' && raw.text.text.trim()) ||
      '';
    const body = clip(bodyRaw.trim(), 8000);
    if (!body) continue;

    let ratingRound = typeof raw.rating === 'number' ? Math.round(raw.rating) : 5;
    if (ratingRound < 1) ratingRound = 1;
    if (ratingRound > 5) ratingRound = 5;

    const reviewedAt =
      typeof raw.publishTime === 'string' && raw.publishTime.trim()
        ? (() => {
            const d = new Date(raw.publishTime);
            return Number.isNaN(d.getTime()) ? null : d;
          })()
        : null;

    const extId =
      typeof raw.name === 'string' && raw.name.trim().length ? `gmp:${clip(raw.name.trim(), 400)}` : null;

    rows.push({
      platform: ReviewPlatform.GOOGLE,
      rating: ratingRound,
      ratingMax: 5,
      guestDisplayName: clip((raw.authorAttribution?.displayName ?? '').trim() || 'Guest', 120) || 'Guest',
      title: null,
      body,
      reviewedAt,
      externalId: extId,
    });
  }

  return { rows };
}

function unwrapOutscraperRows(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as {
    status?: string;
    data?: unknown;
    error?: boolean;
    errorMessage?: string | string[];
  };
  const errMsg =
    typeof p.errorMessage === 'string' ? p.errorMessage : Array.isArray(p.errorMessage) ? p.errorMessage.join('; ') : null;
  if (p.error && errMsg) {
    throw new Error(errMsg);
  }
  const d = p.data as unknown[] | undefined;
  if (!Array.isArray(d)) return [];
  if (d.length > 0 && Array.isArray(d[0])) {
    const inner = d[0] as unknown[];
    return inner.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
  }
  return d.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
}

function mapAirbnbRow(raw: Record<string, unknown>): NormalizedIncoming | null {
  const bodyRaw =
    (typeof raw.comments === 'string' && raw.comments.trim()) ||
    (typeof raw.comment === 'string' && raw.comment.trim()) ||
    (typeof raw.review_text === 'string' && raw.review_text.trim()) ||
    (typeof raw.review_body === 'string' && raw.review_body.trim()) ||
    '';
  const body = clip(bodyRaw, 8000);
  if (!body) return null;

  let rt = Number(raw.star_rating ?? raw.rating ?? raw.stars ?? 5);
  if (Number.isNaN(rt)) rt = 5;
  let ratingRound: number;
  if (rt <= 5) {
    ratingRound = Math.round(rt);
  } else if (rt <= 10) {
    ratingRound = Math.round(rt / 2);
  } else {
    ratingRound = 5;
  }
  if (ratingRound < 1) ratingRound = 1;
  if (ratingRound > 5) ratingRound = 5;

  const nameCandidates = ['reviewer_name', 'reviewer', 'guest_name', 'author', 'name'];
  let guestDisplayName: string | null = null;
  for (const k of nameCandidates) {
    const v = raw[k];
    if (typeof v === 'string' && v.trim()) {
      guestDisplayName = clip(v.trim(), 120);
      break;
    }
  }

  let reviewedAt: Date | null = null;
  const dateRaw = raw.created_at ?? raw.date ?? raw.review_created_at ?? raw.timestamp;
  if (typeof dateRaw === 'string' && dateRaw.trim()) {
    const d = new Date(dateRaw.trim());
    if (!Number.isNaN(d.getTime())) reviewedAt = d;
  } else if (typeof dateRaw === 'number') {
    const d = new Date(dateRaw > 2e12 ? dateRaw : dateRaw * 1000);
    if (!Number.isNaN(d.getTime())) reviewedAt = d;
  }

  let externalId: string | null = null;
  const extCandidates = ['id', 'review_id', 'review_uuid'];
  for (const k of extCandidates) {
    const v = raw[k];
    if (v === undefined || v === null) continue;
    if (typeof v === 'object') continue;
    let idPart = '';
    if (typeof v === 'string') idPart = v.trim();
    else if (typeof v === 'number' || typeof v === 'boolean') idPart = String(v).trim();
    else if (typeof v === 'bigint') idPart = v.toString().trim();
    else continue;

    if (idPart.length > 2) {
      externalId = `abbr:${clip(idPart, 280)}`;
      break;
    }
  }
  if (!externalId) {
    externalId = `abbr:h:${simpleHash(JSON.stringify(raw).slice(0, 480))}`;
  }

  return {
    platform: ReviewPlatform.AIRBNB,
    rating: ratingRound,
    ratingMax: 5,
    guestDisplayName: guestDisplayName ?? 'Guest',
    title: typeof raw.title === 'string' && raw.title.trim().length ? clip(raw.title.trim(), 280) : null,
    body,
    reviewedAt,
    externalId,
  };
}

function simpleHash(s: string): string {
  let h = 5381 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(36).padStart(7, '0').slice(0, 13);
}

async function fetchAirbnbReviews(
  listingUrl: string,
  outscraperKey: string,
): Promise<{ rows: NormalizedIncoming[]; error?: string }> {
  const u = new URL(OUTSCRAPER_AIRBNB_REVIEWS);
  u.searchParams.set('query', listingUrl.trim());
  u.searchParams.set('limit', String(MAX_FETCH_PER_SOURCE));
  u.searchParams.set('sort', 'RATING_DESC');
  u.searchParams.set('async', 'false');

  let res: Response;
  try {
    res = await fetch(u.toString(), {
      method: 'GET',
      headers: { 'X-API-KEY': outscraperKey },
      signal: AbortSignal.timeout(90000),
    });
  } catch (e) {
    return {
      rows: [],
      error: `Outscraper request failed (${e instanceof Error ? e.message : 'network'})`,
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { rows: [], error: 'Outscraper: invalid JSON response' };
  }

  if (res.status === 401 || res.status === 402) {
    let oauthErr = `${res.status} unauthorized or billing issue`;
    if (typeof json === 'object' && json !== null && 'errorMessage' in json) {
      const em = (json as Record<string, unknown>).errorMessage;
      if (typeof em === 'string') oauthErr = em;
      else if (typeof em === 'number' || typeof em === 'boolean') oauthErr = String(em);
      else if (em != null) oauthErr = JSON.stringify(em);
    }
    return { rows: [], error: oauthErr };
  }

  if (res.status === 202) {
    return {
      rows: [],
      error:
        'Outscraper queued this request (HTTP 202). Use async webhook mode or retry in a minute; for quick sync try a smaller limit.',
    };
  }

  try {
    const flat = unwrapOutscraperRows(json);
    const rows: NormalizedIncoming[] = [];
    for (const item of flat) {
      const m = mapAirbnbRow(item);
      if (m) rows.push(m);
    }
    return { rows };
  } catch (e) {
    return {
      rows: [],
      error: e instanceof Error ? e.message : 'Outscraper parse error',
    };
  }
}

type WalkBudget = { n: number };

function dedupeNormalizedByBodyKey(rows: NormalizedIncoming[]): NormalizedIncoming[] {
  const seen = new Set<string>();
  const out: NormalizedIncoming[] = [];
  for (const row of rows) {
    const ext = row.externalId;
    const base =
      ext && ext.length > 8
        ? ext
        : `${row.body.slice(0, 140)}::${row.guestDisplayName ?? ''}::${String(row.rating)}`;
    const k = simpleHash(base.slice(0, 360));
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  return out;
}

function reviewerDisplayNameFromAirbnbNode(raw: Record<string, unknown>): string | null {
  const reviewer =
    typeof raw.reviewer === 'object' && raw.reviewer !== null && !Array.isArray(raw.reviewer)
      ? (raw.reviewer as Record<string, unknown>)
      : null;
  const lr =
    typeof raw.localizedReview === 'object' && raw.localizedReview !== null && !Array.isArray(raw.localizedReview)
      ? (raw.localizedReview as Record<string, unknown>)
      : null;
  const localizedRev =
    lr &&
    typeof lr.localizedReviewer === 'object' &&
    lr.localizedReviewer !== null &&
    !Array.isArray(lr.localizedReviewer)
      ? (lr.localizedReviewer as Record<string, unknown>)
      : null;

  const cand = [
    typeof reviewer?.smartName === 'string' ? reviewer.smartName.trim() : '',
    typeof reviewer?.firstName === 'string' ? reviewer.firstName.trim() : '',
    typeof localizedRev?.localizedName === 'string' ? localizedRev.localizedName.trim() : '',
    typeof localizedRev?.name === 'string' ? localizedRev.name.trim() : '',
  ].filter((s) => s.length > 0);
  const first = cand[0];
  return typeof first === 'string' ? clip(first, 120) || null : null;
}

/** Category rows may expose multiple 1–5 scores — treat an overall as the arithmetic mean rounded */
function numericMeanFromReviewerRatingScores(container: Record<string, unknown>): number | null {
  const scores =
    container.reviewerRatingScores ?? container.categoryRatings ?? container.localizedReviewerRatingScores;
  if (!Array.isArray(scores)) return null;
  const nums: number[] = [];
  for (const it of scores) {
    if (typeof it !== 'object' || it === null) continue;
    const r = (it as { rating?: unknown; value?: unknown }).rating ?? (it as { value?: unknown }).value;
    if (typeof r !== 'number' || Number.isNaN(r)) continue;
    if (r >= 1 && r <= 5) nums.push(r);
  }
  if (!nums.length) return null;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.min(5, Math.max(1, Math.round(avg)));
}

function directNumericStars(container: Record<string, unknown>): number | null {
  const keys = [
    'localizedOverallRating',
    'overallRating',
    'ratingAccuracy',
    'checkoutRating',
    'communicationRating',
    'cleanlinessRating',
    'locationRating',
    'valueRating',
    'rating',
    'starRating',
    'stars',
  ];
  const nums: number[] = [];
  for (const k of keys) {
    const v = container[k];
    if (typeof v !== 'number' || Number.isNaN(v)) continue;
    if (v >= 1 && v <= 5) nums.push(v);
    else if (v > 5 && v <= 10) nums.push(Math.round(v / 2));
  }
  if (!nums.length) return null;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.min(5, Math.max(1, Math.round(avg)));
}

function pickRatingFromAirbnbEmbeddedNode(raw: Record<string, unknown>): number | null {
  const lr =
    typeof raw.localizedReview === 'object' && raw.localizedReview !== null && !Array.isArray(raw.localizedReview)
      ? (raw.localizedReview as Record<string, unknown>)
      : null;

  if (lr) {
    const fromScores = numericMeanFromReviewerRatingScores(lr);
    if (fromScores !== null) return fromScores;
    const lrDirect = directNumericStars(lr);
    if (lrDirect !== null) return lrDirect;
  }

  const topScores = numericMeanFromReviewerRatingScores(raw);
  if (topScores !== null) return topScores;
  const topDirect = directNumericStars(raw);
  if (topDirect !== null) return topDirect;
  return null;
}

/** Map Airbnb SSR / Hydration blobs (shape changes frequently — heuristic only). */
function mapAirbnbHtmlJsonReview(raw: Record<string, unknown>): NormalizedIncoming | null {
  const lr =
    typeof raw.localizedReview === 'object' && raw.localizedReview !== null && !Array.isArray(raw.localizedReview)
      ? (raw.localizedReview as Record<string, unknown>)
      : null;

  let bodyRaw = '';
  if (lr && typeof lr.comments === 'string') bodyRaw = lr.comments;
  else if (typeof raw.comments === 'string') bodyRaw = raw.comments;
  else if (typeof raw.comment === 'string') bodyRaw = raw.comment;

  const body = clip(bodyRaw.trim(), 8000);
  if (body.length < 8) return null;

  const rounded = pickRatingFromAirbnbEmbeddedNode(raw);
  if (rounded === null) return null;

  const guestDisplayName = reviewerDisplayNameFromAirbnbNode(raw) ?? 'Guest';

  const created =
    (typeof raw.createdAt === 'string' && raw.createdAt.trim()) ||
    (lr && typeof lr.createdAt === 'string' && lr.createdAt.trim()) ||
    (typeof raw.airbnb_created_at === 'string' && raw.airbnb_created_at.trim()) ||
    (lr && typeof lr.localizedDate === 'string' && lr.localizedDate.trim()) ||
    '';

  const idCandidate =
    (typeof raw.id === 'string' && raw.id.trim()) ||
    (typeof raw.review_id === 'string' && raw.review_id.trim()) ||
    '';

  const flat: Record<string, unknown> = {
    comments: body,
    star_rating: rounded,
    reviewer_name: guestDisplayName,
    created_at: created || undefined,
  };
  if (idCandidate.length) flat.id = idCandidate;

  return mapAirbnbRow(flat);
}

function shouldProbeAirbnbReviewLikeObject(o: Record<string, unknown>): boolean {
  const keysCount = Object.keys(o).length;
  if (keysCount < 2 || keysCount > 220) return false;

  if (typeof o.localizedReview === 'object' && o.localizedReview !== null && !Array.isArray(o.localizedReview))
    return true;

  const typename = o.__typename;
  if (
    typeof typename === 'string' &&
    /\b(?:Guest|Pdp).*Review\b|\bStayReview\b/i.test(typename) &&
    !/\bReviewsSection\b/i.test(typename)
  )
    return true;

  if (
    typeof o.reviewer === 'object' &&
    o.reviewer !== null &&
    (typeof o.comments === 'string' || typeof o.comment === 'string')
  )
    return true;

  return false;
}

function walkEmbeddedJsonForAirbnbReviews(val: unknown, acc: NormalizedIncoming[], depth: number, budget: WalkBudget): void {
  if (budget.n >= MAX_EMBEDDED_JSON_WALK_NODES || depth > 32) return;
  budget.n += 1;

  if (typeof val !== 'object' || val === null) return;

  if (Array.isArray(val)) {
    for (const item of val) walkEmbeddedJsonForAirbnbReviews(item, acc, depth + 1, budget);
    return;
  }

  const o = val as Record<string, unknown>;

  if (shouldProbeAirbnbReviewLikeObject(o)) {
    const mapped = mapAirbnbHtmlJsonReview(o);
    if (mapped) acc.push(mapped);
  }

  for (const k of Object.keys(o)) walkEmbeddedJsonForAirbnbReviews(o[k], acc, depth + 1, budget);
}

function extractAirbnbReviewsFromEmbeddedHtml(html: string): NormalizedIncoming[] {
  const truncated = html.length > MAX_HTML_CHARS_FOR_SCRAPE ? html.slice(0, MAX_HTML_CHARS_FOR_SCRAPE) : html;

  /** Collect script bodies that may contain SSR JSON chunks */
  const blobs: string[] = [];
  const nd = /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(truncated);
  if (nd?.[1]) blobs.push(nd[1].trim());

  const appl = /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  /** Hard cap avoids huge pages with dozens of unrelated JSON payloads */
  for (let guards = 0; guards < 80; guards++) {
    const m = appl.exec(truncated);
    if (!m) break;
    const inner = m[1]?.trim();
    if (inner?.length) blobs.push(inner);
  }

  const acc: NormalizedIncoming[] = [];
  const budget: WalkBudget = { n: 0 };

  for (const blob of blobs) {
    if (budget.n >= MAX_EMBEDDED_JSON_WALK_NODES || blob.length > 2_100_000) continue;
    try {
      walkEmbeddedJsonForAirbnbReviews(JSON.parse(blob) as unknown, acc, 0, budget);
    } catch {
      /* ignore invalid JSON blobs */
    }
  }

  return dedupeNormalizedByBodyKey(acc);
}

async function fetchAirbnbReviewsFromPublicListing(listingUrl: string): Promise<{
  rows: NormalizedIncoming[];
  error?: string;
}> {
  let html: string;
  try {
    const res = await fetch(listingUrl.trim(), {
      redirect: 'follow',
      signal: AbortSignal.timeout(55000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok)
      return { rows: [], error: `Airbnb listing page returned HTTP ${String(res.status)}.` };
    html = await res.text();
    if (!html.trim() || html.length < 500)
      return { rows: [], error: 'Airbnb listing page HTML was unusually short (possible block or redirect).' };
  } catch (e) {
    return {
      rows: [],
      error: `Airbnb listing fetch failed (${e instanceof Error ? e.message : 'network'}).`,
    };
  }

  const rows = extractAirbnbReviewsFromEmbeddedHtml(html);
  if (!rows.length) {
    return {
      rows: [],
      error:
        'No reviews found in embedded page JSON (reviews may render only in-browser now). Prefer OUTSCRAPER_API_KEY.',
    };
  }
  return { rows };
}

function compareIncoming(a: NormalizedIncoming, b: NormalizedIncoming): number {
  if (b.rating !== a.rating) return b.rating - a.rating;
  const ta = a.reviewedAt?.getTime() ?? 0;
  const tb = b.reviewedAt?.getTime() ?? 0;
  return tb - ta;
}

function shortenUrlSnippet(u: string, max = 52): string {
  const s = u.trim();
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1))}\u2026`;
}

async function airbnbIncomingForListingUrl(
  airbnbUrl: string,
  outscraperApiKey: string | undefined,
): Promise<{ rows: NormalizedIncoming[]; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const outKey = outscraperApiKey?.trim();
  if (outKey) {
    const a = await fetchAirbnbReviews(airbnbUrl, outKey);
    if (a.error) errors.push(a.error);
    return { rows: a.rows.slice(0, MAX_FETCH_PER_SOURCE), errors, warnings };
  }
  const htmlParsed = await fetchAirbnbReviewsFromPublicListing(airbnbUrl);
  if (htmlParsed.error) warnings.push(htmlParsed.error);
  return { rows: htmlParsed.rows.slice(0, MAX_FETCH_PER_SOURCE), errors, warnings };
}

export async function syncExternalGuestReviews(prisma: PrismaClient, args: {
  organizationId: string;
  propertyGooglePlaceIds: string[];
  legacyOrgGooglePlaceId: string | null | undefined;
  listingAirbnbUrls: string[];
  legacyAirbnbReviewsListingUrl: string | null | undefined;
  googleApiKey: string | undefined;
  outscraperApiKey: string | undefined;
}): Promise<ExternalReviewsSyncResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const placeSet = new Set<string>();
  for (const raw of args.propertyGooglePlaceIds) {
    const t = typeof raw === 'string' ? raw.trim() : '';
    if (t.length > 6) placeSet.add(t);
  }
  if (!placeSet.size) {
    const legacy =
      typeof args.legacyOrgGooglePlaceId === 'string' ? args.legacyOrgGooglePlaceId.trim() : '';
    if (legacy.length > 6) placeSet.add(legacy);
  }

  const googleRows: NormalizedIncoming[] = [];
  const placeIds = [...placeSet];
  if (!placeIds.length) {
    warnings.push(
      'Google: No Place IDs on properties (or legacy org setting). Add a Google Place ID under each property, then sync again.',
    );
  } else if (!args.googleApiKey?.trim()) {
    warnings.push(
      'Skipping Google sync: GOOGLE_PLACES_API_KEY is not configured on the API server.',
    );
  } else {
    const key = args.googleApiKey.trim();
    for (const gpId of placeIds) {
      const g = await fetchGoogleReviews(gpId, key);
      if (g.error) errors.push(`${gpId.slice(0, 10)}\u2026: ${g.error}`);
      googleRows.push(...g.rows.slice(0, MAX_FETCH_PER_SOURCE));
    }
  }

  const airbnbSet = new Set<string>();
  for (const raw of args.listingAirbnbUrls) {
    const t = typeof raw === 'string' ? raw.trim() : '';
    if (t.length < 10) continue;
    try {
      new URL(t);
      if (/airbnb\./i.test(t)) airbnbSet.add(t);
    } catch {
      /* skip */
    }
  }
  if (typeof args.legacyAirbnbReviewsListingUrl === 'string') {
    const t = args.legacyAirbnbReviewsListingUrl.trim();
    if (t.length > 10) {
      try {
        new URL(t);
        if (/airbnb\./i.test(t)) airbnbSet.add(t);
      } catch {
        warnings.push('Legacy Airbnb review URL in site settings is invalid — ignored.');
      }
    }
  }

  const airbnbRows: NormalizedIncoming[] = [];
  const listingUrls = [...airbnbSet];
  if (!listingUrls.length) {
    warnings.push(
      'Airbnb: No listing URLs — add an Airbnb URL on each published stay (CMS → Stay listings). Optional legacy site override still supported in DB.',
    );
  } else {
    if (!args.outscraperApiKey?.trim()) {
      warnings.push(
        'Airbnb: OUTSCRAPER_API_KEY is unset — falling back to HTML scraping per listing (often empty). Configure Outscraper for reliable Airbnb pulls.',
      );
    }
    for (const airbnbUrl of listingUrls) {
      const chunk = await airbnbIncomingForListingUrl(airbnbUrl, args.outscraperApiKey);
      chunk.errors.forEach((e) => errors.push(`${shortenUrlSnippet(airbnbUrl)} · ${e}`));
      chunk.warnings.forEach((w) =>
        warnings.push(`${shortenUrlSnippet(airbnbUrl)} · ${w}`),
      );
      airbnbRows.push(...chunk.rows);
    }
  }

  const mergedPool = [...googleRows, ...airbnbRows];
  mergedPool.sort(compareIncoming);
  /** Store strongest reviews first; duplicates by external id de-dup conservative */
  const seenExt = new Set<string>();
  const deduped: NormalizedIncoming[] = [];
  for (const row of mergedPool) {
    const key =
      row.externalId ??
      `n:${simpleHash(`${row.platform}|${row.guestDisplayName}|${row.body.slice(0, 80)}`)}`;
    if (seenExt.has(key)) continue;
    seenExt.add(key);
    deduped.push({ ...row, externalId: key });
  }

  const positives = deduped.filter(isPositiveIncoming).slice(0, PUBLIC_LANDING_REVIEWS_LIMIT);

  if (!positives.length) {
    const nonOk = [...errors];
    warnings.forEach((w) => {
      nonOk.push(`(warning) ${w}`);
    });
    if (!deduped.length) {
      warnings.push('No merged reviews returned from upstreams — nothing to sync.');
    } else {
      warnings.push(
        `${deduped.length} review(s) were skipped: only roughly 4★+ (five-point scale) entries are imported for the landing strip.`,
      );
    }
    return {
      ok: false,
      deletedAutoSynced: 0,
      createdCount: 0,
      landingVisibleCount: 0,
      googleFetched: googleRows.length,
      airbnbFetched: airbnbRows.length,
      errors: nonOk,
      warnings,
    };
  }

  let deletedAutoSynced = 0;
  let createdCount = 0;

  const ss = await prisma.orgSiteSettings.findUnique({
    where: { organizationId: args.organizationId },
    select: { externalReviewsFirstSyncAt: true },
  });
  const beforeFirstSuccessfulExternalStamp = ss?.externalReviewsFirstSyncAt == null;
  const cmsQuoteLines = beforeFirstSuccessfulExternalStamp
    ? await landingReviewQuotesLines(prisma, args.organizationId)
    : [];
  const dummyBodies = beforeFirstSuccessfulExternalStamp
    ? dummyReviewBodiesSet(cmsQuoteLines)
    : new Set<string>();

  await prisma.$transaction(async (tx) => {
    const del = await tx.guestReview.deleteMany({
      where: { organizationId: args.organizationId, autoSynced: true },
    });
    deletedAutoSynced = del.count;

    if (beforeFirstSuccessfulExternalStamp && dummyBodies.size > 0) {
      const candidates = await tx.guestReview.findMany({
        where: { organizationId: args.organizationId, autoSynced: false },
        select: { id: true, body: true },
      });
      const idsToDel = candidates
        .filter((r) => dummyBodies.has(normalizeDummyReviewBody(r.body)))
        .map((r) => r.id);
      if (idsToDel.length) await tx.guestReview.deleteMany({ where: { id: { in: idsToDel } } });
    }

    const syncedAt = new Date();
    let pinned = 0;
    for (const row of positives) {
      pinned += 1;
      await tx.guestReview.create({
        data: {
          organizationId: args.organizationId,
          platform: row.platform,
          rating: row.rating,
          ratingMax: row.ratingMax,
          guestDisplayName: row.guestDisplayName ?? 'Guest',
          title: row.title,
          body: row.body,
          reviewedAt: row.reviewedAt ?? undefined,
          showOnLanding: true,
          pinnedOrder: pinned,
          externalId: row.externalId,
          syncedAt,
          autoSynced: true,
        },
      });
      createdCount++;
    }
  });

  if (beforeFirstSuccessfulExternalStamp) {
    await markExternalReviewsFirstSyncIfNeeded(prisma, args.organizationId);
  }

  return {
    ok: true,
    deletedAutoSynced,
    createdCount,
    landingVisibleCount: positives.length,
    googleFetched: googleRows.length,
    airbnbFetched: airbnbRows.length,
    errors,
    warnings,
  };
}
