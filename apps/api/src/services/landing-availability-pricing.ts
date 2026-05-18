import type { RentableUnitListing } from '@prisma/client';

export type LandingColumnPricing = {
  /** From listing `guestsHint` — base capacity guidance. */
  maxGuests: number | null;
  bedroomsHint: number | null;
  /** Per-person rate above included guests (listing `extraGuestPriceMinor`). */
  extraGuestPerNight: number | null;
  /** Typical Mon–Thu night (₹ same as listing). */
  weekdayPerNight: number | null;
  /** Typical Fri–Sun ceiling / guide (max of Fri, Sat, Sun rates fallback weekday). */
  weekendPerNightTypical: number | null;
  /** Sum of nightly rates across check-in → check-out (exclusive checkout). */
  stayEstimateTotal: number | null;
  nights: number;
};

function addUtcDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function countNights(checkInUtc: Date, checkOutUtc: Date): number {
  return Math.round((checkOutUtc.getTime() - checkInUtc.getTime()) / 86_400_000);
}

function nightRateForUtcDay(lp: RentableUnitListing, nightStart: Date): number | null {
  const dow = nightStart.getUTCDay(); // Night starting this calendar UTC day (0 Sun … 6 Sat)
  const wd = lp.weekdayPriceMinor;
  const fri = lp.fridayPriceMinor ?? wd;
  const sat = lp.saturdayPriceMinor ?? wd;
  const sun = lp.sundayPriceMinor ?? wd;
  if (
    wd == null &&
    lp.fridayPriceMinor == null &&
    lp.saturdayPriceMinor == null &&
    lp.sundayPriceMinor == null
  ) {
    return null;
  }
  if (dow === 0) return sun ?? sat ?? wd;
  if (dow === 5) return fri ?? wd ?? sat;
  if (dow === 6) return sat ?? fri ?? wd;
  return wd ?? fri;
}

/** Upper guide for Fri–Sun pricing (similar to tariff cards). */
function weekendTypicalPerNight(lp: RentableUnitListing): number | null {
  const candidates = [
    lp.fridayPriceMinor ?? lp.weekdayPriceMinor,
    lp.saturdayPriceMinor ?? lp.weekdayPriceMinor,
    lp.sundayPriceMinor ?? lp.weekdayPriceMinor,
  ].filter((x): x is number => typeof x === 'number' && x > 0);
  if (!candidates.length) return lp.weekdayPriceMinor;
  return Math.max(...candidates);
}

/**
 * Estimate public-facing pricing summary for landing availability rows.
 * Amounts mirror listing fields (typically whole ₹ stored in DB as `*PriceMinor`).
 */
export function buildLandingColumnPricing(
  lp: RentableUnitListing | null | undefined,
  range: { checkInUtc: Date; checkOutUtc: Date },
): LandingColumnPricing | null {
  if (!lp?.published) return null;
  const nights = Math.max(0, countNights(range.checkInUtc, range.checkOutUtc));
  const weekdayPerNight = lp.weekdayPriceMinor;
  const weekendPerNightTypical = weekendTypicalPerNight(lp);

  let stayEstimateTotal: number | null = null;
  if (nights > 0) {
    let sum = 0;
    let ok = true;
    for (let i = 0; i < nights; i++) {
      const r = nightRateForUtcDay(lp, addUtcDays(range.checkInUtc, i));
      if (r == null) {
        ok = false;
        break;
      }
      sum += r;
    }
    stayEstimateTotal = ok ? sum : null;
  }

  const hasTariff =
    weekdayPerNight != null ||
    lp.fridayPriceMinor != null ||
    lp.saturdayPriceMinor != null ||
    lp.sundayPriceMinor != null;

  if (!hasTariff && stayEstimateTotal == null) return null;

  return {
    maxGuests: lp.guestsHint ?? null,
    bedroomsHint: lp.bedroomsHint ?? null,
    extraGuestPerNight: lp.extraGuestPriceMinor ?? null,
    weekdayPerNight: weekdayPerNight ?? null,
    weekendPerNightTypical: weekendPerNightTypical ?? null,
    stayEstimateTotal,
    nights,
  };
}
