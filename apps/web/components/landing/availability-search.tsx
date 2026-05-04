'use client';

import { useCallback, useMemo, useState } from 'react';

import { RevealSection } from '@/components/landing/reveal-section';
import type { StayFilter } from '@/lib/whatsapp';
import { whatsappBookingMessage, whatsappHref } from '@/lib/whatsapp';

type Props = {
  orgSlug: string;
  availabilityTitle: string;
  availabilitySubtitle: string;
  whatsappDigits: string;
};

type AvailabilityRow = {
  fullFarm: boolean;
  villa1bhk: boolean;
  villa2bhk: boolean;
};

export function AvailabilitySearch({
  orgSlug,
  availabilityTitle,
  availabilitySubtitle,
  whatsappDigits,
}: Props) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [stayFilter, setStayFilter] = useState<StayFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avail, setAvail] = useState<AvailabilityRow | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001', []);

  const search = useCallback(async () => {
    setError(null);
    setAvail(null);
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
      const data = (await res.json()) as {
        configured?: boolean;
        availability?: AvailabilityRow;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? 'Could not load availability.');
        return;
      }
      if (data.configured === false) {
        setNotConfigured(true);
        return;
      }
      if (data.availability) setAvail(data.availability);
    } catch {
      setError('Please try again in a moment, or message us on WhatsApp.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, orgSlug, checkIn, checkOut]);

  const label = (ok: boolean) => (ok ? 'Available' : 'Booked');

  const showCol = (key: 'fullFarm' | 'villa1bhk' | 'villa2bhk') => {
    if (stayFilter === 'all') return true;
    if (stayFilter === 'full-farm') return key === 'fullFarm';
    if (stayFilter === '1bhk') return key === 'villa1bhk';
    if (stayFilter === '2bhk') return key === 'villa2bhk';
    return true;
  };

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
            <select className="md-input" value={stayFilter} onChange={(e) => setStayFilter(e.target.value as StayFilter)}>
              <option value="all">Show all available options</option>
              <option value="full-farm">Full Farm</option>
              <option value="1bhk">1BHK Villa</option>
              <option value="2bhk">2BHK Villa</option>
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

        {error && <p role="alert" className="md-error">{error}</p>}
        {notConfigured && (
          <p className="md-muted">
            We&apos;ll personally confirm calendars for those dates — tap WhatsApp below and we&apos;ll reply with what&apos;s available.
          </p>
        )}

        {avail && (
          <div className="md-table-wrap">
            <table className="md-table" aria-label="Availability for selected dates">
              <thead>
                <tr>
                  <th scope="col">Stay window</th>
                  {showCol('fullFarm') && <th scope="col">Full Farm</th>}
                  {showCol('villa1bhk') && <th scope="col">1BHK Villa</th>}
                  {showCol('villa2bhk') && <th scope="col">2BHK Villa</th>}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">
                    {checkIn} → {checkOut}
                  </th>
                  {showCol('fullFarm') && <td>{label(avail.fullFarm)}</td>}
                  {showCol('villa1bhk') && <td>{label(avail.villa1bhk)}</td>}
                  {showCol('villa2bhk') && <td>{label(avail.villa2bhk)}</td>}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <p className="md-muted md-booking-hint">
          Booking requests:{' '}
          <a
            className="md-link"
            href={whatsappHref(
              whatsappDigits,
              whatsappBookingMessage(guests, { checkIn, checkOut, stay: stayFilter }),
            )}
          >
            WhatsApp with these dates
          </a>
        </p>
      </div>
    </RevealSection>
  );
}
