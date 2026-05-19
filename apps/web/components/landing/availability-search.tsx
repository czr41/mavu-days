'use client';

import { useCallback, useMemo, useState } from 'react';

import { RevealSection } from '@/components/landing/reveal-section';
import { publicApiBaseUrl } from '@/lib/public-api-base';
import { publicOrgSlugCandidates } from '@/lib/public-org-slug';
import type { StayFilter } from '@/lib/whatsapp';
import { formatStayPreference, whatsappBookingMessage, whatsappHref } from '@/lib/whatsapp';

export type StayOption = { value: string; label: string };

type Props = {
  orgSlug: string;
  availabilityTitle: string;
  availabilitySubtitle: string;
  whatsappDigits: string;
  homepageKind: 'LISTING_GRID' | 'MATRIX_THREE_SKU';
  stayOptions: StayOption[];
};

type BookingTarget = { propertySlug: string; unitSlug: string };

type ColumnPricing = {
  maxGuests: number | null;
  bedroomsHint: number | null;
  extraGuestPerNight: number | null;
  weekdayPerNight: number | null;
  weekendPerNightTypical: number | null;
  stayEstimateTotal: number | null;
  nights: number;
};

type Column = {
  key: string;
  title: string;
  available: boolean;
  bookingTarget: BookingTarget | null;
  offers: { id: string; label: string }[];
  pricing?: ColumnPricing | null;
};

type LandingAvailResponse = {
  configured?: boolean;
  homepageKind?: string;
  columns?: Column[];
  error?: string;
  message?: string;
};

function fmtInr(n: number | null | undefined): string | null {
  if (n == null || Number.isNaN(n)) return null;
  return '\u20B9' + n.toLocaleString('en-IN');
}

function fmtNightCell(n: number | null | undefined) {
  const v = fmtInr(n);
  if (!v) return null;
  return (
    <>
      <span className="md-price-amt">{v}</span>
      <span className="md-price-per"> / night</span>
    </>
  );
}

function fmtExtraGuest(n: number | null | undefined) {
  const v = fmtInr(n);
  if (!v) return null;
  return (
    <>
      <span className="md-price-amt">{v}</span>
      <span className="md-price-per"> / person</span>
    </>
  );
}

function BedroomsCell({
  homepageKind,
  columnKey,
  bedrooms,
}: {
  homepageKind: 'LISTING_GRID' | 'MATRIX_THREE_SKU';
  columnKey: string;
  bedrooms: number | null;
}) {
  if (homepageKind === 'MATRIX_THREE_SKU' && columnKey === 'fullFarm') {
    return <span className="md-booking-bedrooms">Multiple</span>;
  }
  if (bedrooms != null && bedrooms > 0) {
    return (
      <span className="md-booking-bedrooms">
        {bedrooms} bedroom{bedrooms === 1 ? '' : 's'}
      </span>
    );
  }
  return <span className="md-booking-cell-muted">—</span>;
}

/** YYYY-MM-DD → readable label (e.g. 19 May 2026). */
function formatBookingDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function BookingDateField({
  label,
  value,
  onChange,
  hintId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hintId?: string;
}) {
  const hasVal = Boolean(value);
  const displayDate = hasVal ? formatBookingDate(value) : '';
  return (
    <label className="md-booking-field md-booking-field--date">
      <span className="md-field-label">{label}</span>
      <div className={`md-booking-date-wrap ${hasVal ? 'md-booking-date-wrap--filled' : ''}`}>
        {hasVal ? (
          <span className="md-booking-date-display" aria-hidden="true">
            {displayDate}
          </span>
        ) : (
          <span className="md-booking-date-ph" aria-hidden="true">
            Choose date
          </span>
        )}
        <svg className="md-booking-cal-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M16 2v4M8 2v4M3 10h18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        <input
          className="md-input md-booking-date-input"
          type="date"
          value={value}
          aria-describedby={hintId}
          title={displayDate || label}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}

export function AvailabilitySearch({
  orgSlug,
  availabilityTitle,
  availabilitySubtitle,
  whatsappDigits,
  homepageKind,
  stayOptions,
}: Props) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [stayFilter, setStayFilter] = useState<StayFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[] | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  /** Slug that successfully answered landing-availability (may differ from props after env fallback). */
  const [availabilityOrgSlug, setAvailabilityOrgSlug] = useState<string | null>(null);
  const [bookingBusyKey, setBookingBusyKey] = useState<string | null>(null);
  const [bookingNotice, setBookingNotice] = useState<{ key: string; ok: boolean; text: string } | null>(null);

  const apiBase = useMemo(() => publicApiBaseUrl(), []);

  const stayLabel = useMemo(() => {
    const hit = stayOptions.find((o) => o.value === stayFilter);
    return hit?.label ?? formatStayPreference(stayFilter);
  }, [stayFilter, stayOptions]);

  const search = useCallback(async () => {
    setError(null);
    setColumns(null);
    setNotConfigured(false);
    setBookingNotice(null);
    if (!checkIn || !checkOut) {
      setError('Please choose check-in and check-out dates.');
      return;
    }
    if (checkOut <= checkIn) {
      setError('Check-out must be after check-in.');
      return;
    }
    setLoading(true);
    setAvailabilityOrgSlug(null);
    try {
      const q = new URLSearchParams({ checkIn, checkOut });
      const slugCandidates = publicOrgSlugCandidates(orgSlug);
      let lastBad: { res: Response; data: LandingAvailResponse } | null = null;

      for (const slugTry of slugCandidates) {
        const res = await fetch(`${apiBase}/public/orgs/${encodeURIComponent(slugTry)}/landing-availability?${q}`);
        let data: LandingAvailResponse = {};
        try {
          data = (await res.json()) as LandingAvailResponse;
        } catch {
          data = {};
        }
        if (res.ok) {
          if (data.configured === false) {
            setNotConfigured(true);
            return;
          }
          setColumns(data.columns ?? []);
          setAvailabilityOrgSlug(slugTry);
          return;
        }
        lastBad = { res, data };
        const rawMsg = typeof data.error === 'string' ? data.error : 'Could not load availability.';
        const orgMissing =
          res.status === 404 && rawMsg === 'Organization not found';
        if (!orgMissing) {
          setError(rawMsg);
          return;
        }
      }

      const hint404 =
        'We could not load live availability — please WhatsApp us with your dates and we\'ll confirm what\'s open.';
      setError(lastBad?.res.status === 404 ? hint404 : 'Could not load availability.');
    } catch {
      setError('Please try again in a moment, or message us on WhatsApp.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, orgSlug, checkIn, checkOut]);

  const bookingOrgSlug = availabilityOrgSlug ?? orgSlug;

  const submitBooking = useCallback(
    async (column: Column) => {
      if (!column.available || !column.bookingTarget) return;
      setBookingNotice(null);
      setBookingBusyKey(column.key);
      try {
        const res = await fetch(`${apiBase}/public/orgs/${encodeURIComponent(bookingOrgSlug)}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertySlug: column.bookingTarget.propertySlug,
            unitSlug: column.bookingTarget.unitSlug,
            checkInUtc: `${checkIn}T00:00:00.000Z`,
            checkOutUtc: `${checkOut}T00:00:00.000Z`,
          }),
        });
        const data = (await res.json()) as {
          error?: unknown;
          message?: string;
          mockedPayment?: boolean;
          conflict?: boolean;
        };
        if (!res.ok) {
          if (data.conflict === true) {
            setBookingNotice({
              key: column.key,
              ok: false,
              text: `${column.title}: those dates were just taken — refresh availability or pick another stay.`,
            });
            return;
          }
          const errText =
            typeof data.error === 'string'
              ? data.error
              : data.message ?? 'Could not submit booking. Please try WhatsApp instead.';
          setBookingNotice({ key: column.key, ok: false, text: errText });
          return;
        }
        const thanks =
          data.mockedPayment === true
            ? `${column.title}: booking received (demo — mock payment).`
            : `${column.title}: request sent — we'll confirm shortly.`;
        setBookingNotice({ key: column.key, ok: true, text: thanks });
      } catch {
        setBookingNotice({
          key: column.key,
          ok: false,
          text: 'Network error. Please try again or use WhatsApp.',
        });
      } finally {
        setBookingBusyKey(null);
      }
    },
    [apiBase, bookingOrgSlug, checkIn, checkOut],
  );

  const visibleColumns = useMemo(() => {
    if (!columns?.length) return [];
    if (stayFilter === 'all') return columns;
    return columns.filter((c) => c.key === stayFilter);
  }, [columns, stayFilter]);

  const resultsOpen = Boolean(columns && columns.length > 0);

  return (
    <RevealSection className="md-section md-section-booking" id="booking" aria-labelledby="booking-title">
      <div className="md-wrap md-booking-wrap">
        <div className="md-booking-hero-layout">
          <div className="md-booking-head-text">
            <h2 id="booking-title" className="md-h2 md-booking-title">
              {availabilityTitle}
            </h2>
            <p className="md-lead md-booking-sub">{availabilitySubtitle}</p>
            <p className="md-muted md-booking-hint md-booking-hint--inline">
              Booking requests:{' '}
              <a
                className="md-link"
                href={whatsappHref(
                  whatsappDigits,
                  whatsappBookingMessage(guests, { checkIn, checkOut, stay: stayFilter, stayLabel }),
                )}
              >
                WhatsApp with these dates
              </a>
            </p>
          </div>

          <div className="md-card md-booking-toolbar-card md-booking-search-shell">
            <div className="md-booking-toolbar-rows">
              <div className="md-booking-toolbar-row md-booking-toolbar-row-fields">
                <BookingDateField label="Check-in" value={checkIn} onChange={setCheckIn} />
                <BookingDateField label="Check-out" value={checkOut} onChange={setCheckOut} />
                <label className="md-booking-field md-booking-field--guests">
                  <span className="md-field-label">Guests</span>
                  <div className="md-booking-select-wrap">
                    <svg className="md-booking-guest-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                      />
                    </svg>
                    <select
                      className="md-input md-booking-select"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      aria-label="Number of guests"
                    >
                      {Array.from({ length: 14 }, (_, i) => String(i + 1)).map((n) => (
                        <option key={n} value={n}>
                          {n === '1' ? '1 Guest' : `${n} Guests`}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className="md-booking-field md-booking-field--stay">
                  <span className="md-field-label">Stay type</span>
                  <select className="md-input md-booking-select" value={stayFilter} onChange={(e) => setStayFilter(e.target.value)}>
                    {stayOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="md-booking-toolbar-row md-booking-toolbar-row-actions">
                <button
                  type="button"
                  className="md-btn md-btn-primary md-booking-search-btn"
                  disabled={loading}
                  onClick={() => void search()}
                >
                  {loading ? 'Searching…' : 'Check Availability'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p role="alert" className="md-error">
            {error}
          </p>
        ) : null}
        {notConfigured ? (
          <p className="md-muted">
            We&apos;ll personally confirm calendars for those dates — tap WhatsApp below and we&apos;ll reply with what&apos;s
            available.
          </p>
        ) : null}

        <div className={`md-booking-results${resultsOpen ? ' md-booking-results--open' : ''}`} aria-live="polite">
          {resultsOpen ? (
            <>
              <div className="md-booking-results-card">
                <div className="md-booking-price-table-scroll">
                  <table className="md-booking-price-table" aria-label="Stay options and guide pricing for selected dates">
                    <thead>
                      <tr>
                        <th scope="col">Stay option</th>
                        <th scope="col">Max guests</th>
                        <th scope="col">Bedroom(s)</th>
                        <th scope="col">Weekdays (Mon–Thu)</th>
                        <th scope="col">Weekends (Fri–Sun)</th>
                        <th scope="col">Extra guest</th>
                        <th scope="col">Availability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleColumns.map((c) => {
                        const p = c.pricing ?? null;
                        const maxGuests =
                          p?.maxGuests != null ? (
                            <>
                              Max <strong className="md-booking-max-strong">{p.maxGuests}</strong> guests
                            </>
                          ) : (
                            <span className="md-booking-cell-muted">—</span>
                          );
                        return (
                          <tr key={c.key} className={!c.available ? 'md-booking-price-row-muted' : undefined}>
                            <td className="md-booking-col-stay">{c.title}</td>
                            <td>{maxGuests}</td>
                            <td>
                              <BedroomsCell homepageKind={homepageKind} columnKey={c.key} bedrooms={p?.bedroomsHint ?? null} />
                            </td>
                            <td className="md-price-cell">{fmtNightCell(p?.weekdayPerNight ?? null) ?? <span className="md-booking-cell-muted">—</span>}</td>
                            <td className="md-price-cell">
                              {fmtNightCell(p?.weekendPerNightTypical ?? null) ?? (
                                <span className="md-booking-cell-muted">—</span>
                              )}
                            </td>
                            <td className="md-price-cell md-booking-extra-cell">
                              {fmtExtraGuest(p?.extraGuestPerNight ?? null) ?? (
                                <span className="md-booking-cell-muted">—</span>
                              )}
                            </td>
                            <td className="md-booking-avail-cell">
                              <span className={c.available ? 'md-booking-status md-booking-status--ok' : 'md-booking-status md-booking-status--busy'}>
                                {c.available ? 'Available' : 'Booked'}
                              </span>
                              {c.available && c.bookingTarget ? (
                                <button
                                  type="button"
                                  className="md-btn md-btn-primary md-btn-sm md-booking-book-btn"
                                  disabled={bookingBusyKey === c.key}
                                  onClick={() => void submitBooking(c)}
                                >
                                  {bookingBusyKey === c.key ? 'Booking…' : 'Book now'}
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="md-booking-tax-foot" role="note">
                  <svg className="md-booking-info-ic" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
                    <path d="M12 16v-5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span>
                    Prices are exclusive of taxes. Long stay discounts available — we&apos;ll confirm your total when you enquire.
                  </span>
                </div>
              </div>

              {bookingNotice ? (
                <p
                  className={bookingNotice.ok ? 'md-success md-booking-notice' : 'md-error md-booking-notice'}
                  role={bookingNotice.ok ? 'status' : 'alert'}
                >
                  {bookingNotice.text}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </RevealSection>
  );
}
