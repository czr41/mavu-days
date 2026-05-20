/**
 * Canonical on-disk folder: `apps/web/public/marketing/`.
 * All curated marketing JPGs live here — keep DB paths as `/marketing/…` so there is one obvious place for deployable assets.
 * Legacy bundles and DB seeds may still reference root-level `/hero.jpg` etc.; remap those here (web + API stay in sync).
 */
export const MARKETING_SITE_IMAGE_PREFIX = '/marketing';

export const MARKETING_SITE_HERO_JPG = `${MARKETING_SITE_IMAGE_PREFIX}/hero.jpg`;
export const MARKETING_SITE_1BHK_JPG = `${MARKETING_SITE_IMAGE_PREFIX}/1bhk.jpg`;
export const MARKETING_SITE_2BHK_JPG = `${MARKETING_SITE_IMAGE_PREFIX}/2bhk.jpg`;
export const MARKETING_SITE_FULL_FARM_JPG = `${MARKETING_SITE_IMAGE_PREFIX}/full-farm.jpg`;

/** Exact root-relative paths that used to live under `public/` root — now served from `public/marketing/`. */
const LEGACY_ROOT_MARKETING_JPG = new Map<string, string>([
  ['/hero.jpg', `${MARKETING_SITE_IMAGE_PREFIX}/hero.jpg`],
  ['/1bhk.jpg', `${MARKETING_SITE_IMAGE_PREFIX}/1bhk.jpg`],
  ['/2bhk.jpg', `${MARKETING_SITE_IMAGE_PREFIX}/2bhk.jpg`],
  ['/full-farm.jpg', `${MARKETING_SITE_IMAGE_PREFIX}/full-farm.jpg`],
]);

/** Remap `/hero.jpg` → `/marketing/hero.jpg`; leave `/marketing/x` and all other paths unchanged. */
export function canonicalizeMarketingSitePath(fullPathAndMaybeQuery: string): string {
  const trimmed = fullPathAndMaybeQuery.trim();
  const qIdx = trimmed.indexOf('?');
  const pathOnly = (qIdx === -1 ? trimmed : trimmed.slice(0, qIdx)).trim();
  const search = qIdx === -1 ? '' : trimmed.slice(qIdx);
  const mapped = LEGACY_ROOT_MARKETING_JPG.get(pathOnly);
  return mapped ? `${mapped}${search}` : trimmed;
}
