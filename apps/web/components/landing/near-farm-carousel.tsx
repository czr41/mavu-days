'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export type NearFarmSpot = { name: string; distance: string; drive: string };

/**
 * Horizontal strip of nearby-place chips + side arrows + wheel → horizontal scroll while hovered.
 */
export function NearFarmCarousel({ spots }: { spots: readonly NearFarmSpot[] }) {
  const scrollerId = useId();
  const scRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ canPrev: false, canNext: true });

  const refreshEdges = useCallback(() => {
    const el = scRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const eps = 3;
    if (maxScroll <= eps) {
      setEdges({ canPrev: false, canNext: false });
      return;
    }
    const left = el.scrollLeft;
    setEdges({
      canPrev: left > eps,
      canNext: left < maxScroll - eps,
    });
  }, []);

  useEffect(() => {
    const el = scRef.current;
    if (!el) return;
    refreshEdges();
    const ro = new ResizeObserver(refreshEdges);
    ro.observe(el);
    el.addEventListener('scroll', refreshEdges, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', refreshEdges);
    };
  }, [refreshEdges, spots.length]);

  useEffect(() => {
    const el = scRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      let delta = 0;
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        delta = e.deltaY;
      } else if (Math.abs(e.deltaX) > 0) {
        delta = e.deltaX;
      } else return;

      el.scrollLeft += delta;
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const stridePx = () => (scRef.current?.clientWidth ?? 320) * 0.85;

  function onScrollerKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const el = scRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    e.preventDefault();
    const amt = Math.max(120, Math.min(el.clientWidth * 0.5, 360));
    el.scrollBy({
      left: e.key === 'ArrowLeft' ? -amt : amt,
      behavior: 'smooth',
    });
  }

  return (
    <div className="md-near-farm-carousel">
      <button
        type="button"
        className="md-near-farm-nav md-near-farm-nav--prev"
        aria-label="Scroll nearby places left"
        aria-controls={scrollerId}
        disabled={!edges.canPrev}
        onClick={() => scRef.current?.scrollBy({ left: -stridePx(), behavior: 'smooth' })}
      >
        <Chevron direction="prev" />
      </button>
      <button
        type="button"
        className="md-near-farm-nav md-near-farm-nav--next"
        aria-label="Scroll nearby places right"
        aria-controls={scrollerId}
        disabled={!edges.canNext}
        onClick={() => scRef.current?.scrollBy({ left: stridePx(), behavior: 'smooth' })}
      >
        <Chevron direction="next" />
      </button>
      <div
        ref={scRef}
        id={scrollerId}
        tabIndex={0}
        role="region"
        aria-label="Nearby day-trip places — scroll sideways using hover wheel, swipe, arrows, or keyboard arrows"
        className="md-near-farm-tags-scroll md-near-farm-tags-scroll--carousel"
        onKeyDown={onScrollerKeyDown}
      >
        <ul className="md-near-farm-tags md-near-farm-tags--scroll" role="list">
          {spots.map((spot) => (
            <li key={spot.name} className="md-near-farm-chip">
              <span className="md-near-farm-chip-name">{spot.name}</span>
              <span className="md-near-farm-chip-meta">
                {spot.distance}
                <span aria-hidden> · </span>
                {spot.drive}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Chevron({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  );
}
