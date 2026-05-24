/** Max length for `LandingOffer.code` (VARCHAR in DB). */
export const OFFER_CODE_MAX_LEN = 48;

/** Normalize guest-facing promo codes: trim, uppercase, collapse spaces to underscores, strip invalid chars. */
export function normalizeOfferCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, OFFER_CODE_MAX_LEN);
}
