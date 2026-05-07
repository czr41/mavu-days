/** Preferred stay filter value (`all` or column key from availability API / unit slug). */
export type StayFilter = string;

/** Build WhatsApp deep link (`#booking` fallback when unset). */
export function whatsappHref(phoneDigits: string, message: string) {
  const d = phoneDigits.replace(/\D/g, '');
  if (!d.length) return '#booking';
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

export function formatStayPreference(s?: string): string {
  if (!s || s === 'all') return 'Show all available options';
  return s;
}

/** Standard booking enquiry copied from WhatsApp blueprint. */
export function whatsappBookingMessage(
  guests: string,
  opts?: { checkIn?: string; checkOut?: string; stay?: StayFilter; stayLabel?: string },
): string {
  const pref =
    opts?.stayLabel?.trim() ||
    formatStayPreference(opts?.stay);
  return [
    "Hi, I'm interested in booking Mavu Days.",
    '',
    `Check-in: ${opts?.checkIn || '—'}`,
    `Check-out: ${opts?.checkOut || '—'}`,
    `Number of guests: ${guests}`,
    `Preferred option: ${pref}`,
  ].join('\n');
}
