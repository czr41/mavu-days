/**
 * Human-readable guest line for admin tables (never a bare "Guest" when we can explain why).
 */
export function formatBookingGuestDisplay(b: {
  guestName?: string | null;
  status?: string;
  source?: string;
}): string {
  const g = b.guestName?.trim();
  if (g) return g;
  if (b.status === 'PENDING') return 'Awaiting guest details';
  if (b.source === 'DIRECT_WEB') return 'Direct site (name when confirmed)';
  if (b.source === 'MANUAL') return 'Manual booking (add guest name)';
  return 'Stay (no guest name in channel export)';
}
