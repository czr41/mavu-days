'use client';

import { useCallback, useMemo, useState } from 'react';

import { RevealSection } from '@/components/landing/reveal-section';
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
  return '₹' + n.toLocaleString('en-IN');
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
  return (
    <label className="md-booking-field">
      <span className="md-field-label">{label}</span>
      <div className={`md-booking-date-wrap ${hasVal ? 'md-booking-date-wrap--filled' : ''}`}>
        <span className="md-booking-date-ph" aria-hidden={hasVal}>
          Choose date
        </span>
        <svg className="md-booking-cal-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M16 2v4M8 2v4M3 10h18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        <input
          className="md-input md-booking-date-input"
          type="date"
          value={value}
          aria-describedby={hintId}
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

  const apiBase = useMemo(() => (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/+$/, ''), []);

  const stayLabel = useMemo(() => {
    const hit = stayOptions.find((o) => o.value === stayFilter);
    return hit?.label ?? formatStayPreference(stayFilter);
  }, [stayFilter, stayOptions]);

  const search = useCallback(async () => {
    setError(null);
    setColumns(null);
    setNotConfigured(false);
    if (!checkIn || !checkOut) {
      setError('Please choose check-in and check-out dates.');
      return;
    }
    if (checkOut <= checkIn) {
      setError('Check-out must be after check-in.');
      return;
    }
    setLoading(true);
    try {
      const q = new URLSearchParams({ checkIn, checkOut });
      const res = await fetch(`${apiBase}/public/orgs/${encodeURIComponent(orgSlug)}/landing-availability?${q}`);
      const data = (await res.json()) as LandingAvailResponse;
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not load availability.');
        return;
      }
      if (data.configured === false) {
        setNotConfigured(true);
        return;
      }
      setColumns(data.columns ?? []);
    } catch {
      setError('Please try again in a moment, or message us on WhatsApp.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, orgSlug, checkIn, checkOut]);

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
          </div>

          <div className="md-card md-booking-toolbar-card md-booking-search-shell">
            <div className="md-booking-toolbar-rows">
              <div className="md-booking-toolbar-row md-booking-toolbar-row-main">
                <BookingDateField label="Check-in" value={checkIn} onChange={setCheckIn} />
                <BookingDateField label="Check-out" value={checkOut} onChange={setCheckOut} />
                <label className="md-booking-field">
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
                <div className="md-booking-search-cell">
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
        </div>

        {homepageKind === 'MATRIX_THREE_SKU' ? (
          <p className="md-muted md-booking-micro-foot">
            Availability uses the three-SKU matrix (full farm vs villas). Filters narrow the table rows below.
          </p>
        ) : (
          <p className="md-muted md-booking-micro-foot">
            Showing published units only — add or publish listings in the admin when you expand inventory.
          </p>
        )}

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
                        <th scope="col">Status</th>
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
                            <td>
                              <span className={c.available ? 'md-booking-status md-booking-status--ok' : 'md-booking-status md-booking-status--busy'}>
                                {c.available ? 'Available' : 'Booked'}
                              </span>
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

              <div className="md-booking-direct-stack">
                <p className="md-booking-direct-intro">
                  Book directly below when status shows <strong>Available</strong>. Add offers if they apply — we&apos;ll attach them to
                  your request.
                </p>
                {visibleColumns.map((c) => (
                  <DirectBookingPanel
                    key={c.key}
                    title={c.title}
                    columnKey={c.key}
                    available={c.available}
                    target={c.bookingTarget}
                    offers={c.offers}
                    orgSlug={orgSlug}
                    apiBase={apiBase}
                    checkIn={checkIn}
                    checkOut={checkOut}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <p className="md-muted md-booking-hint">
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
    </RevealSection>
  );
}

function DirectBookingPanel({
  title,
  columnKey,
  available,
  target,
  offers,
  orgSlug,
  apiBase,
  checkIn,
  checkOut,
}: {
  title: string;
  columnKey: string;
  available: boolean;
  target: BookingTarget | null;
  offers: { id: string; label: string }[];
  orgSlug: string;
  apiBase: string;
  checkIn: string;
  checkOut: string;
}) {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [selectedOffers, setSelectedOffers] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const toggleOffer = (id: string) => {
    setSelectedOffers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const submit = async () => {
    setFeedback(null);
    if (!available || !target) {
      setFeedback({ ok: false, text: 'This option is not available for the dates you picked.' });
      return;
    }
    setBusy(true);
    try {
      const offerIds = Object.entries(selectedOffers)
        .filter(([, on]) => on)
        .map(([id]) => id);
      const res = await fetch(`${apiBase}/public/orgs/${encodeURIComponent(orgSlug)}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertySlug: target.propertySlug,
          unitSlug: target.unitSlug,
          checkInUtc: `${checkIn}T00:00:00.000Z`,
          checkOutUtc: `${checkOut}T00:00:00.000Z`,
          guestName: guestName.trim() || undefined,
          guestEmail: guestEmail.trim() || undefined,
          guestPhone: guestPhone.trim() || undefined,
          offerIds: offerIds.length ? offerIds : undefined,
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
          setFeedback({
            ok: false,
            text: 'Those dates were just taken — refresh availability or choose another stay option.',
          });
          return;
        }
        const errText =
          typeof data.error === 'string'
            ? data.error
            : data.message ?? 'Could not submit booking. Please try WhatsApp instead.';
        setFeedback({ ok: false, text: errText });
        return;
      }
      const thanks =
        data.mockedPayment === true
          ? "Booking received — you're confirmed for this demo (mock payment)."
          : "Booking request sent — we'll confirm shortly.";
      setFeedback({ ok: true, text: thanks });
      setGuestName('');
      setGuestEmail('');
      setGuestPhone('');
      setSelectedOffers({});
    } catch {
      setFeedback({ ok: false, text: 'Network error. Please try again or use WhatsApp.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`md-booking-direct-card ${available ? '' : 'md-booking-direct-card-muted'}`} data-stay={columnKey}>
      <div className="md-booking-direct-card-head">
        <h3 className="md-booking-direct-title">{title}</h3>
        <span className={available ? 'md-tag md-tag-open' : 'md-tag md-tag-busy'}>{available ? 'Open' : 'Unavailable'}</span>
      </div>

      {!available ? (
        <p className="md-muted" style={{ marginTop: 0 }}>
          Pick different dates or message us on WhatsApp — this option is booked for your window.
        </p>
      ) : !target ? (
        <p className="md-muted" style={{ marginTop: 0 }}>
          We couldn&apos;t resolve this stay for online booking yet. Please use WhatsApp.
        </p>
      ) : (
        <>
          {offers.length > 0 && (
            <fieldset className="md-offer-fieldset">
              <legend className="md-offer-legend">Available offers</legend>
              {offers.map((o) => (
                <label key={o.id} className="md-offer-row">
                  <input type="checkbox" checked={!!selectedOffers[o.id]} onChange={() => toggleOffer(o.id)} />
                  <span>{o.label}</span>
                </label>
              ))}
            </fieldset>
          )}
          <div className="md-booking-direct-fields">
            <label className="md-field">
              <span className="md-field-label">Name</span>
              <input className="md-input" value={guestName} onChange={(e) => setGuestName(e.target.value)} autoComplete="name" />
            </label>
            <label className="md-field">
              <span className="md-field-label">Email</span>
              <input
                className="md-input"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="md-field md-field-span">
              <span className="md-field-label">Phone</span>
              <input
                className="md-input"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                autoComplete="tel"
              />
            </label>
          </div>
          <button type="button" className="md-btn md-btn-primary" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Sending…' : 'Request this stay'}
          </button>
        </>
      )}

      {feedback && (
        <p className={feedback.ok ? 'md-success' : 'md-error'} role={feedback.ok ? 'status' : 'alert'} style={{ marginBottom: 0 }}>
          {feedback.text}
        </p>
      )}
    </div>
  );
}
