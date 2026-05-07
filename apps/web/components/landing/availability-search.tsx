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

type Column = {
  key: string;
  title: string;
  available: boolean;
  bookingTarget: BookingTarget | null;
  offers: { id: string; label: string }[];
};

type LandingAvailResponse = {
  configured?: boolean;
  homepageKind?: string;
  columns?: Column[];
  error?: string;
  message?: string;
};

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

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001', []);

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

  const label = (ok: boolean) => (ok ? 'Available' : 'Booked');

  const visibleColumns = useMemo(() => {
    if (!columns?.length) return [];
    if (stayFilter === 'all') return columns;
    return columns.filter((c) => c.key === stayFilter);
  }, [columns, stayFilter]);

  const showCol = useCallback(
    (key: string) => {
      if (stayFilter === 'all') return true;
      return stayFilter === key;
    },
    [stayFilter],
  );

  return (
    <RevealSection className="md-section md-section-booking" id="booking" aria-labelledby="booking-title">
      <div className="md-wrap">
        <h2 id="booking-title" className="md-h2">
          {availabilityTitle}
        </h2>
        <p className="md-lead">{availabilitySubtitle}</p>

        <div className="md-card md-booking-grid">
          <label className="md-field">
            <span className="md-field-label">Check-in</span>
            <input className="md-input" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </label>
          <label className="md-field">
            <span className="md-field-label">Check-out</span>
            <input className="md-input" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </label>
          <label className="md-field">
            <span className="md-field-label">Guests</span>
            <input
              className="md-input"
              type="number"
              inputMode="numeric"
              min={1}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            />
          </label>
          <label className="md-field md-field-span">
            <span className="md-field-label">Stay type</span>
            <select className="md-input" value={stayFilter} onChange={(e) => setStayFilter(e.target.value)}>
              {stayOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="md-field-span md-actions-row">
            <button type="button" className="md-btn md-btn-primary" disabled={loading} onClick={() => search()}>
              {loading ? 'Searching…' : 'Search Availability'}
            </button>
            <p className="md-microcopy-inline">
              <strong>Not sure which option?</strong> Select “Show all available options” and we&apos;ll outline what is free for
              your dates.
            </p>
          </div>
        </div>

        {homepageKind === 'MATRIX_THREE_SKU' ? (
          <p className="md-muted" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
            Availability uses the three-SKU matrix (full farm vs villas). Stay filters match that grid.
          </p>
        ) : (
          <p className="md-muted" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
            Showing published units only — add or publish listings in the admin when you expand inventory.
          </p>
        )}

        {error && (
          <p role="alert" className="md-error">
            {error}
          </p>
        )}
        {notConfigured && (
          <p className="md-muted">
            We&apos;ll personally confirm calendars for those dates — tap WhatsApp below and we&apos;ll reply with what&apos;s
            available.
          </p>
        )}

        {columns && columns.length > 0 && (
          <>
            <div className="md-table-wrap">
              <table className="md-table" aria-label="Availability for selected dates">
                <thead>
                  <tr>
                    <th scope="col">Stay window</th>
                    {columns.map((c) =>
                      showCol(c.key) ? (
                        <th key={c.key} scope="col">
                          {c.title}
                        </th>
                      ) : null,
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">
                      {checkIn} → {checkOut}
                    </th>
                    {columns.map((c) => (showCol(c.key) ? <td key={c.key}>{label(c.available)}</td> : null))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="md-booking-direct-stack">
              <p className="md-booking-direct-intro">
                Book directly on our site when dates show as available. Select any offers that apply — we&apos;ll attach them to
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
        )}

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
