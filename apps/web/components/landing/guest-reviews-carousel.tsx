'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

const AUTO_SCROLL_PX_PER_FRAME = 0.42;
const MANUAL_PAUSE_MS = 3800;

type Props = {
  children: ReactNode;
  'aria-label'?: string;
};

function Chevron({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  );
}

/**
 * Horizontal reviews strip: hidden scrollbar, side arrows, wheel → horizontal while hovered,
 * smooth auto-advance that pauses on mouse hover, seamless loop (duplicated row).
 */
export function GuestReviewsCarousel({ children, 'aria-label': ariaLabel = 'Guest reviews' }: Props) {
  const scrollerId = useId();
  const scRef = useRef<HTMLDivElement>(null);
  const seg1Ref = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const loopStrideRef = useRef(0);
  const pausedHoverRef = useRef(false);
  const suppressAutoRef = useRef(false);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotionRef = useRef(false);
  const rafRef = useRef(0);

  const [overflows, setOverflows] = useState(false);

  const secondSegment = useMemo(
    () =>
      Children.map(children, (child, i) => {
        if (!isValidElement(child)) {
          return (
            <span key={`marquee-b-${i}`} className="md-review-marquee-fallback-node">
              {child}
            </span>
          );
        }
        return cloneElement(child as ReactElement<{ key?: string | number }>, {
          key: `marquee-b-${String(child.key ?? i)}`,
        });
      }),
    [children],
  );

  const beginManualPause = useCallback(() => {
    suppressAutoRef.current = true;
    if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = setTimeout(() => {
      suppressAutoRef.current = false;
      suppressTimerRef.current = null;
    }, MANUAL_PAUSE_MS);
  }, []);

  const measure = useCallback(() => {
    const sc = scRef.current;
    const seg1 = seg1Ref.current;
    const track = trackRef.current;
    if (!sc || !seg1 || !track) return;

    const maxScroll = sc.scrollWidth - sc.clientWidth;
    const eps = 4;
    setOverflows(maxScroll > eps);

    const gapRaw = getComputedStyle(track).columnGap || getComputedStyle(track).gap;
    const gapPx = Number.parseFloat(gapRaw) || 16;
    loopStrideRef.current = seg1.offsetWidth + gapPx;
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyMq = () => {
      reducedMotionRef.current = mq.matches;
    };
    applyMq();
    mq.addEventListener('change', applyMq);
    return () => mq.removeEventListener('change', applyMq);
  }, []);

  useEffect(() => {
    const sc = scRef.current;
    const seg1 = seg1Ref.current;
    if (!sc || !seg1) return;

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sc);
    ro.observe(seg1);
    const track = trackRef.current;
    if (track) ro.observe(track);
    sc.addEventListener('scroll', measure, { passive: true });

    return () => {
      ro.disconnect();
      sc.removeEventListener('scroll', measure);
    };
  }, [measure, children]);

  useEffect(() => {
    const tick = () => {
      const sc = scRef.current;
      const stride = loopStrideRef.current;
      if (
        sc &&
        stride > 8 &&
        overflows &&
        !pausedHoverRef.current &&
        !suppressAutoRef.current &&
        !reducedMotionRef.current
      ) {
        sc.scrollLeft += AUTO_SCROLL_PX_PER_FRAME;
        if (sc.scrollLeft >= stride - 1) {
          sc.scrollLeft -= stride;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [overflows, children]);

  useEffect(() => {
    return () => {
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    };
  }, []);

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

      beginManualPause();
      el.scrollLeft += delta;
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [beginManualPause]);

  const stridePx = () => (scRef.current?.clientWidth ?? 320) * 0.82;

  function onScrollerKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const el = scRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    e.preventDefault();
    beginManualPause();
    const amt = Math.max(120, Math.min(el.clientWidth * 0.5, 360));
    el.scrollBy({
      left: e.key === 'ArrowLeft' ? -amt : amt,
      behavior: 'smooth',
    });
  }

  return (
    <div
      className="md-review-marquee-carousel"
      onMouseEnter={() => {
        pausedHoverRef.current = true;
      }}
      onMouseLeave={() => {
        pausedHoverRef.current = false;
      }}
    >
      <button
        type="button"
        className="md-review-marquee-nav md-review-marquee-nav--prev"
        aria-label="Scroll guest reviews left"
        aria-controls={scrollerId}
        disabled={!overflows}
        onClick={() => {
          beginManualPause();
          scRef.current?.scrollBy({ left: -stridePx(), behavior: 'smooth' });
        }}
      >
        <Chevron direction="prev" />
      </button>
      <button
        type="button"
        className="md-review-marquee-nav md-review-marquee-nav--next"
        aria-label="Scroll guest reviews right"
        aria-controls={scrollerId}
        disabled={!overflows}
        onClick={() => {
          beginManualPause();
          scRef.current?.scrollBy({ left: stridePx(), behavior: 'smooth' });
        }}
      >
        <Chevron direction="next" />
      </button>
      <div
        ref={scRef}
        id={scrollerId}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel}
        className="md-review-marquee-viewport"
        onKeyDown={onScrollerKeyDown}
        onTouchStart={() => beginManualPause()}
      >
        <div ref={trackRef} className="md-review-marquee-track">
          <div ref={seg1Ref} className="md-review-marquee-segment">
            {children}
          </div>
          <div className="md-review-marquee-segment" aria-hidden>
            {secondSegment}
          </div>
        </div>
      </div>
    </div>
  );
}
