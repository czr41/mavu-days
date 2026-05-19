import Link from 'next/link';

import {
  groupGalleryByCategory,
  representativesPerCategory,
  splitGalleryHero,
  type GallerySlide,
} from '@/lib/gallery-categories';
import { RevealFigure } from '@/components/landing/reveal-section';

const HOMEPAGE_FULL_CATEGORY_PREVIEW = 10;

type Props = {
  items: GallerySlide[];
  heroImageUrl?: string | null;
  /** Base path for category tile links (homepage header already links here). */
  galleryHref?: string;
};

function CategoryThumbFill({ slide, phMod }: { slide: GallerySlide; phMod: number }) {
  const ph = (Math.abs(phMod) % 4) + 1;
  return slide.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={slide.url} alt={slide.alt} loading="lazy" className="md-gallery-bento-img" />
  ) : (
    <div className={`md-gallery-ph-${ph} md-gallery-bento-ph-fill`} role="img" aria-label={slide.alt} />
  );
}

/** Homepage: single hero tile (no label), same image as marketing hero when available. */
function GalleryHeroTile({ slide, delayIndex = 0 }: { slide: GallerySlide; delayIndex?: number }) {
  return (
    <RevealFigure delayIndex={delayIndex} className="md-gallery-unified-hero md-gallery-cat-cell" aria-label={slide.alt}>
      <CategoryThumbFill slide={slide} phMod={0} />
    </RevealFigure>
  );
}

function GalleryCategorySquareLinked({
  slot,
  delayIndex,
  galleryHref,
}: {
  slot: { id: string; label: string; slide: GallerySlide | null };
  delayIndex: number;
  galleryHref: string;
}) {
  const slide: GallerySlide =
    slot.slide ??
    ({
      url: null,
      alt: slot.label,
      key: `placeholder-${slot.id}`,
    } as GallerySlide);

  return (
    <Link href={`${galleryHref}#gallery-${slot.id}`} className="md-gallery-unified-tile-wrap md-gallery-cat-cell">
      <RevealFigure delayIndex={delayIndex} className="md-gallery-unified-tile">
        <CategoryThumbFill slide={slide} phMod={delayIndex} />
        <span className="md-gallery-unified-label">{slot.label}</span>
      </RevealFigure>
    </Link>
  );
}

/** Single homepage gallery: hero + five labeled squares (one section). */
export function GalleryLandingUnified({
  items,
  heroImageUrl,
  galleryHref,
}: {
  items: GallerySlide[];
  heroImageUrl?: string | null;
  galleryHref?: string;
}) {
  const href = galleryHref ?? '/gallery';
  const { hero, rest } = splitGalleryHero(items, heroImageUrl);
  const slots = representativesPerCategory(rest);
  const hasHero = Boolean(hero?.url);

  return (
    <div
      className={`md-gallery-unified${hasHero ? '' : ' md-gallery-unified--no-hero'}`}
      aria-label="Photo gallery preview"
    >
      {hasHero && hero ? <GalleryHeroTile slide={hero} /> : null}
      {slots.map((slot, i) => (
        <GalleryCategorySquareLinked key={slot.id} slot={slot} delayIndex={i + 1} galleryHref={href} />
      ))}
    </div>
  );
}

function CategoryBento({ group, delayStart }: { group: { id: string; label: string; items: GallerySlide[] }; delayStart: number }) {
  const preview = group.items.slice(0, HOMEPAGE_FULL_CATEGORY_PREVIEW);
  const [feature, ...thumbs] = preview;
  if (!feature) return null;

  return (
    <section className="md-gallery-cat-block" id={`gallery-${group.id}`} aria-label={group.label}>
      <h3 className="md-gallery-cat-title">{group.label}</h3>
      <div className={`md-gallery-cat-bento${thumbs.length === 0 ? ' md-gallery-cat-bento--solo' : ''}`}>
        <RevealFigure delayIndex={delayStart} className="md-gallery-cat-feature md-gallery-cat-cell">
          <CategoryThumbFill slide={feature} phMod={delayStart} />
        </RevealFigure>
        {thumbs.length > 0 ? (
          <div className="md-gallery-cat-thumbs">
            {thumbs.map((slide, i) => (
              <RevealFigure
                key={slide.key}
                delayIndex={delayStart + i + 1}
                className="md-gallery-cat-thumb md-gallery-cat-cell"
              >
                <CategoryThumbFill slide={slide} phMod={delayStart + i + 1} />
              </RevealFigure>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function GalleryCategoryGroups({ items, heroImageUrl, galleryHref = '/gallery' }: Props) {
  return (
    <div className="md-gallery-unified-outer">
      <GalleryLandingUnified items={items} heroImageUrl={heroImageUrl} galleryHref={galleryHref} />
    </div>
  );
}

/** Full gallery page: hero + every image grouped by category. */
export function GalleryFullView({
  items,
  heroImageUrl,
  orgName,
}: {
  items: GallerySlide[];
  heroImageUrl?: string | null;
  orgName?: string;
}) {
  const { hero, rest } = splitGalleryHero(items, heroImageUrl);
  const groups = groupGalleryByCategory(rest);
  let delay = 0;

  return (
    <div className="md-gallery-full-page">
      <div className="md-wrap">
        <header className="md-gallery-full-head">
          <p className="md-section-label md-section-label-left">Around the homestead</p>
          <h1 className="md-h1">{orgName ? `${orgName} — Gallery` : 'Gallery'}</h1>
          <p className="md-lead md-lead-tight">
            <Link href="/#gallery" className="md-link">
              ← Back to homepage
            </Link>
          </p>
        </header>

        {hero?.url ? (
          <div className="md-gallery-full-hero-wrap">
            <GalleryHeroTile slide={hero} />
          </div>
        ) : null}

        {groups.map((group) => {
          const block = <CategoryBento key={group.id} group={group} delayStart={delay + 1} />;
          delay += group.items.length;
          return block;
        })}
      </div>
    </div>
  );
}
