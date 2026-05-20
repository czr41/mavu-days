/**
 * RentableUnitListing.galleryImageUrls — JSON array of legacy URL strings or
 * `{ "url": "https://…", "category": "ROOM"|… }` (matches Prisma `GalleryCategory`).
 */

export type StayGalleryCategoryStored = 'ROOM' | 'OUTDOOR' | 'PORCH' | 'VIEW' | 'OTHER';

const CATEGORY = new Set<StayGalleryCategoryStored>(['ROOM', 'OUTDOOR', 'PORCH', 'VIEW', 'OTHER']);

function coerceCategory(raw: unknown): StayGalleryCategoryStored | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const u = raw.trim().toUpperCase() as StayGalleryCategoryStored;
  return CATEGORY.has(u) ? u : null;
}

export type StayGallerySlot = {
  url: string;
  /** Explicit CMS tag for homepage mosaic; `null` = use keyword inference only. */
  category: StayGalleryCategoryStored | null;
};

/** Read stored Json (strings and/or slot objects); caps length by default */
export function stayGallerySlotsFromUnknown(raw: unknown, maxSlots = 24): StayGallerySlot[] {
  if (!Array.isArray(raw)) return [];
  const out: StayGallerySlot[] = [];
  for (const entry of raw) {
    if (out.length >= maxSlots) break;
    if (typeof entry === 'string') {
      const u = entry.trim();
      if (u.length > 4) out.push({ url: u, category: null });
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    const o = entry as Record<string, unknown>;
    const url = typeof o.url === 'string' ? o.url.trim() : '';
    if (url.length < 8) continue;
    const cat = coerceCategory(o.category);
    out.push({ url, category: cat });
  }
  return out;
}

/** URL list only (Airbnb scrape append, duplicates check, etc.). */
export function stayGalleryUrlsFromUnknown(raw: unknown, maxSlots = 24): string[] {
  return stayGallerySlotsFromUnknown(raw, maxSlots).map((s) => s.url);
}

/**
 * Persist to Json: omit category wrapper when unset (keep short Airbnb imports as plain strings).
 */
export type StayGalleryJsonEntry = string | { url: string; category: StayGalleryCategoryStored };

export function stayGalleryToJson(slots: StayGallerySlot[]): StayGalleryJsonEntry[] {
  return slots.map(({ url, category }) => {
    if (category) return { url, category };
    return url;
  });
}

/** Append HTTPS URLs preserving existing slots' categories where URLs match */
export function stayGalleryMergeAppend(
  storedJson: unknown,
  appendUrls: string[],
  maxSlots = 24,
): { slots: StayGallerySlot[]; addedCount: number } {
  const slots = [...stayGallerySlotsFromUnknown(storedJson, maxSlots)];
  const seen = new Set(slots.map((s) => s.url.trim()));
  let addedCount = 0;
  for (const raw of appendUrls) {
    if (slots.length >= maxSlots) break;
    const u = typeof raw === 'string' ? raw.trim() : '';
    if (!u || seen.has(u)) continue;
    seen.add(u);
    slots.push({ url: u, category: null });
    addedCount += 1;
  }
  return { slots, addedCount };
}
