const PLACEHOLDER_GUEST = /^(reserved|blocked|not available)$/i;
const AIRBNB_PLACEHOLDER = /airbnb\s*\(\s*not\s*available\s*\)/i;

/** Airbnb export often uses "FirstName + 2" — return the name portion. */
export function parseAirbnbStyleGuestName(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const plus = t.match(/^(.+?)\s+\+\s*\d+\s*$/);
  if (plus) {
    const name = plus[1]!.trim();
    if (name.length >= 2 && !PLACEHOLDER_GUEST.test(name) && !AIRBNB_PLACEHOLDER.test(name)) {
      return name;
    }
  }
  if (PLACEHOLDER_GUEST.test(t) || AIRBNB_PLACEHOLDER.test(t)) return null;
  if (/^guest\s*\(/i.test(t)) return null;
  return t;
}

/** Best label for admin tables — prefers real names over iCal placeholders. */
export function formatBookingGuestDisplay(b: {
  guestName?: string | null;
  status?: string;
  source?: string;
}): string {
  const parsed = b.guestName ? parseAirbnbStyleGuestName(b.guestName) : null;
  if (parsed) return parsed;
  if (b.status === 'PENDING') return 'Awaiting guest details';
  if (b.source === 'DIRECT_WEB') return 'Direct site (add guest name)';
  if (b.source === 'MANUAL') return 'Manual booking (add guest name)';
  return 'Name not in calendar export';
}
