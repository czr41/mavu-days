/** Homepage gallery — CMS `galleryCategory` or keys `gallery-{id}-…`. Display order on landing bento. */
export const GALLERY_CATEGORY_DEFS = [
  { id: 'room', label: 'Room pictures', keyPrefix: 'gallery-room' },
  { id: 'porch', label: 'Sitout and Porch', keyPrefix: 'gallery-porch' },
  { id: 'outdoor', label: 'Farm Outdoors', keyPrefix: 'gallery-outdoor' },
  { id: 'view', label: 'The view', keyPrefix: 'gallery-view' },
  { id: 'other', label: 'Others', keyPrefix: 'gallery-other' },
] as const;

export type GalleryCategoryId = (typeof GALLERY_CATEGORY_DEFS)[number]['id'];

export type GallerySlide = {
  url: string | null;
  alt: string;
  key: string;
  category?: GalleryCategoryId;
};

export type GalleryCategoryGroup = {
  id: GalleryCategoryId;
  label: string;
  items: GallerySlide[];
};

const CATEGORY_IDS = new Set<string>(GALLERY_CATEGORY_DEFS.map((c) => c.id));

const PRISMA_TO_ID: Record<string, GalleryCategoryId> = {
  ROOM: 'room',
  OUTDOOR: 'outdoor',
  PORCH: 'porch',
  VIEW: 'view',
  OTHER: 'other',
};

const ID_TO_PRISMA: Record<GalleryCategoryId, string> = {
  room: 'ROOM',
  outdoor: 'OUTDOOR',
  porch: 'PORCH',
  view: 'VIEW',
  other: 'OTHER',
};

export function isGalleryCategoryId(id: string): id is GalleryCategoryId {
  return CATEGORY_IDS.has(id);
}

export function galleryCategoryFromPrisma(value: string | null | undefined): GalleryCategoryId | undefined {
  if (!value) return undefined;
  return PRISMA_TO_ID[value.toUpperCase()] ?? undefined;
}

export function galleryCategoryToPrisma(
  id: GalleryCategoryId | null | undefined,
): 'ROOM' | 'OUTDOOR' | 'PORCH' | 'VIEW' | 'OTHER' | undefined {
  if (!id) return undefined;
  return ID_TO_PRISMA[id] as 'ROOM' | 'OUTDOOR' | 'PORCH' | 'VIEW' | 'OTHER';
}

export const GALLERY_CATEGORY_OPTIONS = GALLERY_CATEGORY_DEFS.map((c) => ({
  value: c.id,
  label: c.label,
}));

/** Resolve category from CMS media key (`gallery-room-1`, …). */
export function categoryFromMediaKey(key: string): GalleryCategoryId | null {
  const k = key.toLowerCase();
  if (k === 'landing-hero-cover') return null;
  for (const def of GALLERY_CATEGORY_DEFS) {
    const p = def.keyPrefix;
    if (k === p || k.startsWith(`${p}-`)) return def.id;
  }
  return null;
}

function inferGalleryCategoryFromText(item: GallerySlide): GalleryCategoryId {
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

export function resolveGalleryCategory(item: GallerySlide): GalleryCategoryId {
  if (item.category) return item.category;
  const fromKey = categoryFromMediaKey(item.key);
  if (fromKey) return fromKey;
  return inferGalleryCategoryFromText(item);
}

export function groupGalleryByCategory(items: GallerySlide[]): GalleryCategoryGroup[] {
  const buckets = new Map<GalleryCategoryId, GallerySlide[]>();
  for (const def of GALLERY_CATEGORY_DEFS) {
    buckets.set(def.id, []);
  }
  for (const item of items) {
    const cat = resolveGalleryCategory(item);
    buckets.get(cat)!.push(item);
  }
  return GALLERY_CATEGORY_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    items: buckets.get(def.id) ?? [],
  })).filter((g) => g.items.length > 0);
}

/** One preview slide per category (landing bento squares), always five slots in definition order. */
export type CategoryRepresentativeSlot = {
  id: GalleryCategoryId;
  label: string;
  slide: GallerySlide | null;
};

export function representativesPerCategory(items: GallerySlide[]): CategoryRepresentativeSlot[] {
  const buckets = new Map<GalleryCategoryId, GallerySlide[]>();
  for (const def of GALLERY_CATEGORY_DEFS) {
    buckets.set(def.id, []);
  }
  for (const item of items) {
    buckets.get(resolveGalleryCategory(item))!.push(item);
  }
  return GALLERY_CATEGORY_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    slide: buckets.get(def.id)!.find((item) => Boolean(item.url?.trim())) ?? null,
  }));
}

/** Pull marketing hero out of the stream used for category bentos. */
export function splitGalleryHero(
  items: GallerySlide[],
  heroImageUrl?: string | null,
): { hero: GallerySlide | null; rest: GallerySlide[] } {
  const heroUrl = heroImageUrl?.trim() || null;
  let hero: GallerySlide | null = null;
  const rest: GallerySlide[] = [];

  for (const item of items) {
    const isHeroKey = item.key.toLowerCase() === 'landing-hero-cover';
    const matchesHeroUrl = heroUrl && item.url === heroUrl;
    if (!hero && (isHeroKey || matchesHeroUrl)) {
      hero = item;
      continue;
    }
    if (matchesHeroUrl) continue;
    rest.push(item);
  }

  if (!hero && heroUrl) {
    hero = {
      url: heroUrl,
      alt: 'Mavu Days farm stay',
      key: 'landing-hero-cover',
    };
  }

  return { hero, rest };
}
