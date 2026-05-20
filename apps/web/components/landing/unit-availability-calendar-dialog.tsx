'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type DayDto = { date: string; available: boolean };

type Props = {
  apiBase: string;
  /** Slugs to try against the API (typically `availabilityOrgSlug ?? orgSlug` from landing). */
  orgSlugCandidates: readonly string[];
  propertySlug: string;
  unitSlug: string;
  stayLabel: string;
  open: boolean;
  onClose: () => void;
};

function ymTodayUtc(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function shiftYm(ym: string, delta: number): string {
  const [ys, ms] = ym.split('-').map(Number);
  const t = Date.UTC(ys, ms - 1 + delta, 1);
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parseYm(ym: string): { y: number; m: number } {
  const [ys, ms] = ym.split('-').map(Number);
  return { y: ys, m: ms };
}

function utcMonthLength(y: number, /** 1-based */ mo: number): number {
  return new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

const WEEK_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function UnitAvailabilityCalendarDialog({
  apiBase,
  orgSlugCandidates,
  propertySlug,
  unitSlug,
  stayLabel,
  open,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [cursorYm, setCursorYm] = useState(ymTodayUtc);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<DayDto[] | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return undefined;
    setCursorYm(ymTodayUtc());
    setDays(null);
    setError(null);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!mounted || !open) return undefined;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams({ propertySlug, unitSlug, month: cursorYm });
      let lastErr = 'Could not load calendar.';
      for (const slug of orgSlugCandidates) {
        try {
          const res = await fetch(
            `${apiBase}/public/orgs/${encodeURIComponent(slug)}/unit-calendar?${q}`,
            { signal: ac.signal },
          );
          const data = (await res.json().catch(() => ({}))) as { days?: DayDto[]; error?: string };
          if (res.ok && Array.isArray(data.days)) {
            setDays(data.days);
            setLoading(false);
            return;
          }
          lastErr = typeof data.error === 'string' ? data.error : lastErr;
        } catch {
          if (ac.signal.aborted) return;
        }
      }
      if (!ac.signal.aborted) {
        setDays(null);
        setError(lastErr);
      }
      setLoading(false);
    })();
    return () => ac.abort();
  }, [mounted, open, apiBase, orgSlugCandidates, propertySlug, unitSlug, cursorYm]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const byDate = useMemo(() => new Map(days?.map((d) => [d.date, d.available]) ?? []), [days]);

  const { y: gridY, m: gridM } = parseYm(cursorYm);
  const dim = utcMonthLength(gridY, gridM);
  const firstDow = new Date(Date.UTC(gridY, gridM - 1, 1)).getUTCDay();

  const monthTitle = useMemo(
    () =>
      new Date(Date.UTC(gridY, gridM - 1, 1)).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    [gridY, gridM],
  );

  const goPrev = useCallback(() => setCursorYm((ym) => shiftYm(ym, -1)), []);
  const goNext = useCallback(() => setCursorYm((ym) => shiftYm(ym, 1)), []);

  if (!mounted || !open) return null;

  const cells: { key: string; dom: number | null }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ key: `pad-${i}`, dom: null });
  for (let dom = 1; dom <= dim; dom++) cells.push({ key: `d-${dom}`, dom });
  while (cells.length % 7 !== 0) cells.push({ key: `trail-${cells.length}`, dom: null });
  while (cells.length < 42) cells.push({ key: `fill-${cells.length}`, dom: null });

  const todayIso = new Date().toISOString().slice(0, 10);

  return createPortal(
    <div className="md-unit-cal-overlay" role="presentation" onClick={() => onClose()}>
      <div
        className="md-unit-cal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="md-unit-cal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="md-unit-cal-head">
          <button type="button" className="md-unit-cal-nav-btn" aria-label="Previous month" onClick={goPrev}>
            ‹
          </button>
          <div className="md-unit-cal-head-text">
            <p id="md-unit-cal-title" className="md-unit-cal-title">
              {stayLabel}
            </p>
            <p className="md-unit-cal-sub">{monthTitle}</p>
          </div>
          <button type="button" className="md-unit-cal-nav-btn" aria-label="Next month" onClick={goNext}>
            ›
          </button>
        </header>

        <p className="md-unit-cal-hint">Green = night available · Muted tint = unavailable (booked or blocked)</p>

        <div className="md-unit-cal-grid md-unit-cal-grid--head">
          {WEEK_HEADERS.map((w) => (
            <span key={w} className="md-unit-cal-weekday">
              {w}
            </span>
          ))}
        </div>

        {loading ? <p className="md-unit-cal-status">Loading…</p> : null}
        {error && !loading ? (
          <p role="alert" className="md-unit-cal-status md-unit-cal-status--error">
            {error}
          </p>
        ) : null}

        <div className="md-unit-cal-grid md-unit-cal-grid--days">
          {cells.map((c) => {
            if (c.dom == null) {
              return <span key={c.key} className="md-unit-cal-cell md-unit-cal-cell--empty" />;
            }
            const iso = `${String(gridY)}-${String(gridM).padStart(2, '0')}-${String(c.dom).padStart(2, '0')}`;
            const avail = byDate.get(iso);
            const isToday = iso === todayIso;
            const cls = [
              'md-unit-cal-cell',
              avail === true ? 'md-unit-cal-cell--free' : avail === false ? 'md-unit-cal-cell--busy' : 'md-unit-cal-cell--unknown',
              isToday ? 'md-unit-cal-cell--today' : '',
            ]
              .filter(Boolean)
              .join(' ');
            const label =
              avail === true ? 'Available' : avail === false ? 'Unavailable' : 'Unknown';
            return (
              <span key={c.key} className={cls} title={`${iso}: ${label}`}>
                {c.dom}
              </span>
            );
          })}
        </div>

        <div className="md-unit-cal-legend" aria-hidden>
          <span className="md-unit-cal-legend-item">
            <span className="md-unit-cal-swatch md-unit-cal-swatch--free" /> Available
          </span>
          <span className="md-unit-cal-legend-item">
            <span className="md-unit-cal-swatch md-unit-cal-swatch--busy" /> Unavailable
          </span>
        </div>

        <button type="button" className="md-btn md-btn-secondary md-unit-cal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>,
    document.body,
  );
}
