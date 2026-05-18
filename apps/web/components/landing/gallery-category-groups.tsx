import Link from 'next/link';

import {
  groupGalleryByCategory,
  splitGalleryHero,
  type GallerySlide,
} from '@/lib/gallery-categories';
import { RevealFigure } from '@/components/landing/reveal-section';

const HOMEPAGE_CATEGORY_PREVIEW = 10;

type Props = {
  items: GallerySlide[];
  heroImageUrl?: string | null;
  fullGalleryHref?: string;
  orgName?: string;
};

function galleryCaptionLabel(altRaw: string): string {
  const trimmed = altRaw?.trim();
  if (!trimmed) return 'Mavu Days';
  const first = trimmed.split(/\s*[·•|–—]\s*/)[0]?.trim();
  const base = first && first.length >= 3 ? first : trimmed;
  if (base.length <= 46) return base;
  return `${base.slice(0, 43).trimEnd()}…`;
}

function GalleryThumb({
  slide,
  phMod,
  showCaption = true,
}: {
  slide: GallerySlide;
  phMod: number;
  showCaption?: boolean;
}) {
  const cap = galleryCaptionLabel(slide.alt);
  const ph = (Math.abs(phMod) % 4) + 1;
  return (
    <>
      {slide.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.url} alt={slide.alt} loading="lazy" className="md-gallery-bento-img" />
      ) : (
        <div className={`md-gallery-ph-${ph} md-gallery-bento-ph-fill`} role="img" aria-label={slide.alt} />
      )}
      {showCaption ? (
        <span className="md-gallery-bento-cap">
          <svg className="md-gallery-bento-cap-ic" width="14" height="14" viewBox="0 0 24 24" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
            <circle cx="8.25" cy="10" r="1.05" fill="currentColor" />
            <path d="M14 13h4M14 15.5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="md-gallery-bento-cap-text">{cap}</span>
        </span>
      ) : null}
    </>
  );
}

function GalleryFeaturedTile({ slide, delayIndex = 0 }: { slide: GallerySlide; delayIndex?: number }) {
  return (
    <RevealFigure delayIndex={delayIndex} className="md-gallery-featured md-gallery-cat-cell" aria-label={slide.alt}>
      <GalleryThumb slide={slide} phMod={0} showCaption={false} />
    </RevealFigure>
  );
}

function CategoryBento({ group, delayStart }: { group: { label: string; items: GallerySlide[] }; delayStart: number }) {
  const preview = group.items.slice(0, HOMEPAGE_CATEGORY_PREVIEW);
  const [feature, ...thumbs] = preview;
  if (!feature) return null;

  return (
    <section className="md-gallery-cat-block" aria-label={group.label}>
      <h3 className="md-gallery-cat-title">{group.label}</h3>
      <div className={`md-gallery-cat-bento${thumbs.length === 0 ? ' md-gallery-cat-bento--solo' : ''}`}>
        <RevealFigure delayIndex={delayStart} className="md-gallery-cat-feature md-gallery-cat-cell">
          <GalleryThumb slide={feature} phMod={delayStart} showCaption={false} />
        </RevealFigure>
        {thumbs.length > 0 ? (
          <div className="md-gallery-cat-thumbs">
            {thumbs.map((slide, i) => (
              <RevealFigure
                key={slide.key}
                delayIndex={delayStart + i + 1}
                className="md-gallery-cat-thumb md-gallery-cat-cell"
              >
                <GalleryThumb slide={slide} phMod={delayStart + i + 1} showCaption={false} />
              </RevealFigure>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function GalleryCategoryGroups({ items, heroImageUrl, fullGalleryHref, orgName }: Props) {
  const { hero, rest } = splitGalleryHero(items, heroImageUrl);
  const groups = groupGalleryByCategory(rest);

  const renderCategoryBlocks = (idPrefix: string) => {
    let d = 0;
    return groups.map((group) => {
      const block = <CategoryBento key={`${idPrefix}-${group.id}`} group={group} delayStart={d + 1} />;
      d += Math.min(group.items.length, HOMEPAGE_CATEGORY_PREVIEW);
      return block;
    });
  };

  return (
    <>
      <div className="md-gallery-stack md-gallery-bento-desktop">
        {hero?.url ? <GalleryFeaturedTile slide={hero} /> : null}
        {renderCategoryBlocks('d')}
        {fullGalleryHref ? (
          <p className="md-gallery-full-cta-wrap">
            <Link className="md-gallery-bento-cta-outline" href={fullGalleryHref}>
              View full gallery
              <span className="md-gallery-bento-cta-arrow" aria-hidden>
                →
              </span>
            </Link>
            {orgName ? (
              <span className="md-muted md-gallery-full-cta-hint">All photos for {orgName}, grouped by area</span>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="md-gallery-mobile-stack" aria-label="Photo gallery">
        {hero?.url ? <GalleryFeaturedTile slide={hero} /> : null}
        {renderCategoryBlocks('m')}
      </div>
    </>
  );
}

/** Full gallery page: every image in each category. */
export function GalleryFullView({ items, heroImageUrl, orgName }: Omit<Props, 'fullGalleryHref'>) {
  const { hero, rest } = splitGalleryHero(items, heroImageUrl);
  const groups = groupGalleryByCategory(rest);
  let delay = 0;

  return (
    <div className="md-gallery-full-page">
      <div className="md-wrap">
        <header className="md-gallery-full-head">
          <p className="md-gallery-bento-eyeb">Photo gallery</p>
          <h1 className="md-h1">{orgName ? `${orgName} — Gallery` : 'Gallery'}</h1>
          <p className="md-lead md-lead-tight">
            <Link href="/#gallery" className="md-link">
              ← Back to homepage
            </Link>
          </p>
        </header>

        {hero?.url ? <GalleryFeaturedTile slide={hero} /> : null}

        {groups.map((group) => {
          const block = <CategoryBento key={group.id} group={group} delayStart={delay + 1} />;
          delay += group.items.length;
          return block;
        })}
      </div>
    </div>
  );
}
