/** Client-side compound calendar helpers — mirrors API Full Farm ↔ villa rules. */

export type CompoundCalendarUnit = {
  id: string;
  name: string;
  slug: string;
  matrixRole?: string;
};

export type CompoundCalendarBooking = {
  id: string;
  checkInUtc: string;
  checkOutUtc: string;
  status: string;
  guestName: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestCount?: number | null;
  note?: string | null;
  source?: string;
  externalProvider?: string | null;
  externalId?: string | null;
  rentableUnit: { id: string; name: string; slug: string } | null;
};

export type CompoundBlock = {
  id: string;
  startsAtUtc: string;
  endsAtUtc: string;
  rentableUnit: { id: string; name: string; slug: string };
  booking: CompoundCalendarBooking;
};

const FULL_FARM_SLUGS = ['full-farm', 'full-farm-stay', 'fullfarm', 'mavu-full-farm'];
const BHK1_SLUGS = ['1bhk-villa', '1bhk', 'villa-1bhk', 'mavu-1bhk-farm', 'mavu-1bhk'];
const BHK2_SLUGS = ['2bhk-villa', '2bhk', 'villa-2bhk', 'mavu-2bhk-farm', 'mavu-2bhk'];

function slugMatch(units: CompoundCalendarUnit[], candidates: readonly string[]): string | null {
  const lower = new Map(units.map((u) => [u.slug.toLowerCase(), u.id]));
  for (const c of candidates) {
    const id = lower.get(c);
    if (id) return id;
  }
  return null;
}

export function resolveCompoundMatrixIds(units: CompoundCalendarUnit[]) {
  const byRole = (role: string) => units.find((u) => u.matrixRole === role)?.id ?? null;
  let fullFarm = byRole('FULL_FARM');
  let bhk1 = byRole('VILLA_1BHK');
  let bhk2 = byRole('VILLA_2BHK');
  if (!fullFarm || !bhk1 || !bhk2) {
    fullFarm = fullFarm ?? slugMatch(units, FULL_FARM_SLUGS);
    bhk1 = bhk1 ?? slugMatch(units, BHK1_SLUGS);
    bhk2 = bhk2 ?? slugMatch(units, BHK2_SLUGS);
  }
  return { fullFarm, bhk1, bhk2 };
}

export function mirrorUnitIdsForBooking(
  matrix: ReturnType<typeof resolveCompoundMatrixIds>,
  bookedUnitId: string,
): string[] {
  const { fullFarm, bhk1, bhk2 } = matrix;
  if (fullFarm && bookedUnitId === fullFarm) {
    return [bhk1, bhk2].filter((id): id is string => !!id);
  }
  if (bhk1 && bookedUnitId === bhk1 && fullFarm) return [fullFarm];
  if (bhk2 && bookedUnitId === bhk2 && fullFarm) return [fullFarm];
  return [];
}

/** Build compound mirror blocks from active bookings (fallback if API omits them). */
export function synthesizeCompoundBlocks(
  bookings: CompoundCalendarBooking[],
  units: CompoundCalendarUnit[],
): CompoundBlock[] {
  const matrix = resolveCompoundMatrixIds(units);
  const unitById = new Map(units.map((u) => [u.id, u]));
  const out: CompoundBlock[] = [];

  for (const b of bookings) {
    if (b.status === 'CANCELLED' || !b.rentableUnit?.id) continue;
    for (const mirrorUnitId of mirrorUnitIdsForBooking(matrix, b.rentableUnit.id)) {
      const ru = unitById.get(mirrorUnitId);
      if (!ru) continue;
      out.push({
        id: `compound-${b.id}-${mirrorUnitId}`,
        startsAtUtc: b.checkInUtc,
        endsAtUtc: b.checkOutUtc,
        rentableUnit: { id: ru.id, name: ru.name, slug: ru.slug },
        booking: b,
      });
    }
  }
  return out;
}

/** Merge API compound blocks with client synthesis; API rows win on id collision. */
export function mergeCompoundBlocks(apiBlocks: CompoundBlock[], bookings: CompoundCalendarBooking[], units: CompoundCalendarUnit[]): CompoundBlock[] {
  const synthesized = synthesizeCompoundBlocks(bookings, units);
  const key = (cb: CompoundBlock) => `${cb.booking.id}:${cb.rentableUnit.id}`;
  const byKey = new Map<string, CompoundBlock>();
  for (const cb of synthesized) byKey.set(key(cb), cb);
  for (const cb of apiBlocks) byKey.set(key(cb), cb);
  return [...byKey.values()];
}
