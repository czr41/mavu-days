/**
 * Normalize org slug from env/CMS (strip BOM/NBSP, unify unicode dashes).
 * DB lookup is case-insensitive; we preserve casing from the CMS when useful.
 */
export function sanitizePublicOrgSlug(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/\u00a0/g, '')
    .replace(/[\u2010-\u2015]/g, '-');
}

/**
 * Ordered candidates for public org URLs when the primary slug might differ from env (copy/paste drift).
 */
export function publicOrgSlugCandidates(primary: string): string[] {
  const envRaw = process.env.NEXT_PUBLIC_ORG_SLUG;
  const fromEnv =
    typeof envRaw === 'string' && envRaw.length > 0 ? sanitizePublicOrgSlug(envRaw).toLowerCase() : '';
  const cleaned = sanitizePublicOrgSlug(primary);
  const list = [cleaned, fromEnv].filter((s) => s.length > 0);
  return [...new Set(list)];
}
