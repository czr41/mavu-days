/** Homepage gallery groups (CMS keys: `gallery-{id}-…`). */
export const GALLERY_CATEGORY_DEFS = [
  { id: 'room', label: 'Room pictures', keyPrefix: 'gallery-room' },
  { id: 'outdoor', label: 'Outdoor', keyPrefix: 'gallery-outdoor' },
  { id: 'porch', label: 'Porch and Sitout', keyPrefix: 'gallery-porch' },
  { id: 'view', label: 'The view', keyPrefix: 'gallery-view' },
  { id: 'other', label: 'Others', keyPrefix: 'gallery-other' },
] as const;

export type GalleryCategoryId = (typeof GALLERY_CATEGORY_DEFS)[number]['id'];

export type GallerySlide = { url: string | null; alt: string; key: string };

export type GalleryCategoryGroup = {
  id: GalleryCategoryId;
  label: string;
  items: GallerySlide[];
};

const CATEGORY_IDS = new Set<string>(GALLERY_CATEGORY_DEFS.map((c) => c.id));

export function isGalleryCategoryId(id: string): id is GalleryCategoryId {
  return CATEGORY_IDS.has(id);
}

/** Resolve category from CMS media key (`gallery-room-1`, `gallery-outdoor-pool`, …). */
export function categoryFromMediaKey(key: string): GalleryCategoryId | null {
  const k = key.toLowerCase();
  if (k === 'landing-hero-cover') return 'view';
  for (const def of GALLERY_CATEGORY_DEFS) {
    const p = def.keyPrefix;
    if (k === p || k.startsWith(`${p}-`)) return def.id;
  }
  return null;
}

/** Heuristic bucket for listing-derived keys and alt/url text. */
export function inferGalleryCategory(item: GallerySlide): GalleryCategoryId {
  const fromKey = categoryFromMediaKey(item.key);
  if (fromKey) return fromKey;

  const blob = `${item.key} ${item.alt} ${item.url ?? ''}`.toLowerCase();

  if (/porch|sitout|sit-out|veranda|verandah|sit\s*out/.test(blob)) return 'porch';
  if (/view|sunset|sunrise|panorama|skyline|scenery|landscape|vista/.test(blob)) return 'view';
  if (
    /pool|garden|lawn|bonfire|outdoor|grove|pathway|path\b|trail|mango\s*tree|farm\s*ground|exterior\s*lawn/.test(
      blob,
    )
  )
    return 'outdoor';
  if (
    /bedroom|living\s*room|interior|kitchen|dining|bhk|villa\s*room|room\b|bed\b|suite|1bhk|2bhk/.test(blob)
  )
    return 'room';
  if (/full-farm\.jpg/.test(blob)) return 'outdoor';
  if (/1bhk\.jpg/.test(blob)) return 'room';
  if (/2bhk\.jpg/.test(blob)) return 'room';
  if (/hero\.jpg/.test(blob)) return 'view';

  return 'other';
}

/** Flatten by category (room → outdoor → porch → view → other) for one shared bento grid. */
export function flattenGalleryByCategory(items: GallerySlide[], max = 7): GallerySlide[] {
  const flat: GallerySlide[] = [];
  for (const group of groupGalleryByCategory(items)) {
    for (const item of group.items) {
      if (flat.length >= max) return flat;
      flat.push(item);
    }
  }
  return flat;
}

export function groupGalleryByCategory(items: GallerySlide[]): GalleryCategoryGroup[] {
  const buckets = new Map<GalleryCategoryId, GallerySlide[]>();
  for (const def of GALLERY_CATEGORY_DEFS) {
    buckets.set(def.id, []);
  }
  for (const item of items) {
    const cat = inferGalleryCategory(item);
    buckets.get(cat)!.push(item);
  }
  return GALLERY_CATEGORY_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    items: buckets.get(def.id) ?? [],
  })).filter((g) => g.items.length > 0);
}
