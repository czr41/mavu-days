import { flattenGalleryByCategory, type GallerySlide } from '@/lib/gallery-categories';
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
        <img src={slide.url} alt={slide.alt} loading="lazy" className="md-gallery-bento-img" />
      ) : (
        <div className={`md-gallery-ph-${ph} md-gallery-bento-ph-fill`} role="img" aria-label={slide.alt} />
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

function padBentoSlots(slides: GallerySlide[], count = 7): GallerySlide[] {
  const out = [...slides];
  let n = 0;
  while (out.length < count) {
    out.push({
      url: null,
      alt: 'Mavu Days farm stay',
      key: `gallery-bento-pad-${n}`,
    });
    n += 1;
  }
  return out.slice(0, count);
}

/**
 * Original single homepage bento grid — square tiles only (no tall side column).
 * Photos are ordered by category behind the scenes; layout stays one mosaic.
 */
export function GalleryCategoryGroups({ items }: { items: GallerySlide[] }) {
  const ordered = flattenGalleryByCategory(items, 7);
  const [lead, wide, tri1, tri2, tri3, duo1, duo2] = padBentoSlots(ordered, 7);

  return (
    <div className="md-gallery-bento md-gallery-bento-unified md-gallery-bento-desktop" aria-label="Property photo gallery">
      <RevealFigure key={lead.key} delayIndex={0} className="md-gallery-bento-lead md-gallery-bento-cell md-gallery-bento-square">
        <GalleryThumb slide={lead} phMod={0} />
      </RevealFigure>
      <RevealFigure key={wide.key} delayIndex={1} className="md-gallery-bento-wide md-gallery-bento-cell">
        <GalleryThumb slide={wide} phMod={1} />
      </RevealFigure>
      <div className="md-gallery-bento-triple">
        <RevealFigure key={tri1.key} delayIndex={2} className="md-gallery-bento-tile md-gallery-bento-cell md-gallery-bento-square">
          <GalleryThumb slide={tri1} phMod={2} />
        </RevealFigure>
        <RevealFigure key={tri2.key} delayIndex={3} className="md-gallery-bento-tile md-gallery-bento-cell md-gallery-bento-square">
          <GalleryThumb slide={tri2} phMod={3} />
        </RevealFigure>
        <RevealFigure key={tri3.key} delayIndex={4} className="md-gallery-bento-tile md-gallery-bento-cell md-gallery-bento-square">
          <GalleryThumb slide={tri3} phMod={4} />
        </RevealFigure>
      </div>
      <div className="md-gallery-bento-duo">
        <RevealFigure key={duo1.key} delayIndex={5} className="md-gallery-bento-tile md-gallery-bento-cell md-gallery-bento-square">
          <GalleryThumb slide={duo1} phMod={5} />
        </RevealFigure>
        <RevealFigure key={duo2.key} delayIndex={6} className="md-gallery-bento-tile md-gallery-bento-cell md-gallery-bento-square">
          <GalleryThumb slide={duo2} phMod={6} />
        </RevealFigure>
      </div>
    </div>
  );
}
