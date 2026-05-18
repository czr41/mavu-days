import { groupGalleryByCategory, type GallerySlide } from '@/lib/gallery-categories';
import { RevealFigure } from '@/components/landing/reveal-section';

function galleryCaptionLabel(altRaw: string): string {
  const trimmed = altRaw?.trim();
  if (!trimmed) return 'Mavu Days';
  const first = trimmed.split(/\s*[·•|–—]\s*/)[0]?.trim();
  const base = first && first.length >= 3 ? first : trimmed;
  if (base.length <= 46) return base;
  return `${base.slice(0, 43).trimEnd()}…`;
}

function GalleryThumb({ slide, phMod }: { slide: GallerySlide; phMod: number }) {
  const cap = galleryCaptionLabel(slide.alt);
  const ph = (Math.abs(phMod) % 4) + 1;
  return (
    <>
      {slide.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.url} alt={slide.alt} loading="lazy" className="md-gallery-square-img" />
      ) : (
        <div className={`md-gallery-ph-${ph} md-gallery-square-ph`} role="img" aria-label={slide.alt} />
      )}
      <span className="md-gallery-bento-cap">
        <svg className="md-gallery-bento-cap-ic" width="14" height="14" viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <circle cx="8.25" cy="10" r="1.05" fill="currentColor" />
          <path d="M14 13h4M14 15.5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="md-gallery-bento-cap-text">{cap}</span>
      </span>
    </>
  );
}

export function GalleryCategoryGroups({ items }: { items: GallerySlide[] }) {
  const groups = groupGalleryByCategory(items);
  if (!groups.length) return null;

  let delay = 0;
  return (
    <div className="md-gallery-categories">
      {groups.map((group) => {
        const [featured, ...rest] = group.items;
        const groupDelay = delay;
        delay += 1;
        return (
          <section key={group.id} className="md-gallery-category" aria-labelledby={`gallery-cat-${group.id}`}>
            <h3 id={`gallery-cat-${group.id}`} className="md-gallery-category-title">
              {group.label}
            </h3>
            <div className="md-gallery-category-layout">
              <RevealFigure delayIndex={groupDelay} className="md-gallery-category-feature md-gallery-square-cell">
                <GalleryThumb slide={featured} phMod={groupDelay} />
              </RevealFigure>
              {rest.length > 0 ? (
                <div className="md-gallery-category-grid">
                  {rest.map((slide, i) => (
                    <RevealFigure
                      key={slide.key}
                      delayIndex={groupDelay + i + 1}
                      className="md-gallery-category-tile md-gallery-square-cell"
                    >
                      <GalleryThumb slide={slide} phMod={groupDelay + i + 1} />
                    </RevealFigure>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
