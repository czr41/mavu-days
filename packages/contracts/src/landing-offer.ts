/** Migration backfill set code to `O` + uuid hex — not meant for guests. */
export function isLegacyAutoOfferCode(code: string): boolean {
  return /^O[0-9A-F]{32}$/i.test(code.trim());
}

/** Promo code suitable for ticker / checkout UI; null when only a legacy placeholder exists. */
export function guestFacingOfferCode(code: string): string | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized || isLegacyAutoOfferCode(normalized)) return null;
  return normalized;
}

/** One marquee segment: offer line plus checkout code when configured. */
export function formatOfferTickerLine(args: {
  label: string;
  code: string;
  unitLabel?: string | null;
}): string {
  const unit = args.unitLabel?.trim();
  const prefix = unit ? `${unit}: ` : '';
  const label = args.label.trim();
  const guestCode = guestFacingOfferCode(args.code);
  if (!label) return guestCode ? `${prefix}Use code ${guestCode} at checkout` : '';
  if (guestCode) return `${prefix}${label} · Code ${guestCode} at checkout`;
  return `${prefix}${label}`;
}
