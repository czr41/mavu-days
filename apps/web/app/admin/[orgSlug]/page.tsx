'use client';

import Link from 'next/link';
import { MEDIA_KEY, SECTION_KEY } from '@/lib/landing-content';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

/* ─────────────────────────────── Types ─────────────────────────────── */
type ListingLink = {
  id: string;
  channel: string;
  outboundFeedSlug: string;
  inboundIcalUrl: string | null;
  externalLabel: string | null;
  airbnbHostAccount: { id: string; label: string } | null;
};
type RentableUnit = { id: string; name: string; slug: string; kind: string; listingLinks: ListingLink[]; children: RentableUnit[] };
type Property = { id: string; name: string; slug: string; units: RentableUnit[] };

type AirbnbHostAccountRow = {
  id: string;
  label: string;
  notes: string | null;
  listingLinkCount: number;
  createdAt: string;
  updatedAt: string;
};

type Booking = {
  id: string; checkInUtc: string; checkOutUtc: string; status: string; source: string;
  guestName: string | null; guestEmail: string | null; guestPhone: string | null;
  guestCount: number | null; note: string | null;
  rentableUnit: { id: string; name: string; slug: string } | null;
  offerSelections?: { landingOffer: { id: string; label: string } }[];
};

type GuestReview = {
  id: string; platform: string; rating: number; ratingMax: number;
  guestDisplayName: string | null; title: string | null; body: string;
  reviewedAt: string | null; showOnLanding: boolean; pinnedOrder: number; externalId: string | null;
};

type SiteSection = { id: string; key: string; title: string; bodyMarkdown: string; sortOrder: number; published: boolean };
type LandingOfferRow = {
  id: string;
  label: string;
  sortOrder: number;
  published: boolean;
  rentableUnitId: string | null;
};
type MediaAsset  = { id: string; key: string; publicUrl: string; alt: string | null };
type ListingProfileDto = {
  id: string;
  published: boolean;
  sortOrder: number;
  matrixRole: string;
  cardTitle: string;
  cardShort: string;
  bestFor: unknown;
  descriptionMarkdown: string;
  highlights: unknown;
  amenities: unknown;
  ctaLabel: string | null;
  weekdayPriceMinor: number | null;
  fridayPriceMinor: number | null;
  saturdayPriceMinor: number | null;
  sundayPriceMinor: number | null;
  longWeekendPriceMinor: number | null;
  guestsHint: number | null;
  bedroomsHint: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  detailHeroUrl: string | null;
};
type UnitListingBundle = {
  propertySlug: string;
  propertyName: string;
  unit: { id: string; name: string; slug: string; kind: string };
  listingProfile: ListingProfileDto | null;
};
type Alert       = { id: string; message: string; severity: string };
type DashStats   = { upcoming: Booking[]; alerts: Alert[]; listingLinks: ListingLink[] };

type ListingDraftState = {
  published: boolean;
  sortOrder: string;
  matrixRole: string;
  cardTitle: string;
  cardShort: string;
  bestForText: string;
  descriptionMarkdown: string;
  highlightsText: string;
  amenitiesText: string;
  ctaLabel: string;
  weekday: string;
  friday: string;
  saturday: string;
  sunday: string;
  longWeekend: string;
  guestsHint: string;
  bedroomsHint: string;
  seoTitle: string;
  seoDescription: string;
  detailHeroUrl: string;
};

function jsonStringArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function listingDraftFromRow(row: UnitListingBundle): ListingDraftState {
  const lp = row.listingProfile;
  return {
    published: lp?.published ?? false,
    sortOrder: String(lp?.sortOrder ?? 0),
    matrixRole: lp?.matrixRole ?? 'NONE',
    cardTitle: lp?.cardTitle ?? row.unit.name,
    cardShort: lp?.cardShort ?? '',
    bestForText: jsonStringArr(lp?.bestFor).join('\n'),
    descriptionMarkdown: lp?.descriptionMarkdown ?? '',
    highlightsText: jsonStringArr(lp?.highlights).join('\n'),
    amenitiesText: jsonStringArr(lp?.amenities).join('\n'),
    ctaLabel: lp?.ctaLabel ?? '',
    weekday: lp?.weekdayPriceMinor != null ? String(lp.weekdayPriceMinor) : '',
    friday: lp?.fridayPriceMinor != null ? String(lp.fridayPriceMinor) : '',
    saturday: lp?.saturdayPriceMinor != null ? String(lp.saturdayPriceMinor) : '',
    sunday: lp?.sundayPriceMinor != null ? String(lp.sundayPriceMinor) : '',
    longWeekend: lp?.longWeekendPriceMinor != null ? String(lp.longWeekendPriceMinor) : '',
    guestsHint: lp?.guestsHint != null ? String(lp.guestsHint) : '',
    bedroomsHint: lp?.bedroomsHint != null ? String(lp.bedroomsHint) : '',
    seoTitle: lp?.seoTitle ?? '',
    seoDescription: lp?.seoDescription ?? '',
    detailHeroUrl: lp?.detailHeroUrl ?? '',
  };
}

const MATRIX_ROLE_OPTS = ['NONE', 'FULL_FARM', 'VILLA_1BHK', 'VILLA_2BHK'] as const;
const PLATFORMS  = ['AIRBNB', 'GOOGLE', 'BOOKING_COM', 'DIRECT', 'OTHER'] as const;
const PLT_LABEL: Record<string, string> = { AIRBNB: 'Airbnb', GOOGLE: 'Google', BOOKING_COM: 'Booking.com', DIRECT: 'Direct', OTHER: 'Other' };
const ROLES = ['CARETAKER', 'STAFF_BLOCK', 'ADMIN'] as const;
const BLOCK_REASONS = ['PERSONAL_HOLD', 'MAINTENANCE', 'OTHER'] as const;
const NAV = [
  { key: 'overview',    label: 'Overview',       icon: GridI },
  { key: 'properties',  label: 'Properties',     icon: HomeI },
  { key: 'bookings',    label: 'Bookings',        icon: CalI },
  { key: 'reviews',     label: 'Guest Reviews',  icon: StarI },
  { key: 'cms',         label: 'CMS / Content',  icon: EditI },
  { key: 'channels',    label: 'Channels & iCal', icon: LinkI },
  { key: 'team',        label: 'Team',            icon: UsersI },
];

function formatZodLikeError(o: unknown): string {
  if (!o || typeof o !== 'object') return typeof o === 'string' ? o : 'Validation failed';
  const x = o as Record<string, unknown>;
  const lines: string[] = [];
  if (Array.isArray(x.formErrors)) {
    for (const e of x.formErrors) {
      if (typeof e === 'string') lines.push(e);
      else lines.push(formatZodLikeError(e));
    }
  }
  const fld = x.fieldErrors;
  if (fld && typeof fld === 'object' && !Array.isArray(fld)) {
    for (const [k, v] of Object.entries(fld as Record<string, unknown>)) {
      if (v == null) continue;
      if (Array.isArray(v)) {
        const msgs = v.map((item) => (typeof item === 'string' ? item : formatZodLikeError(item)));
        if (msgs.length) lines.push(`${k}: ${msgs.join(', ')}`);
      } else if (typeof v === 'object' && v !== null && ('formErrors' in v || 'fieldErrors' in v)) {
        lines.push(`${k}: ${formatZodLikeError(v)}`);
      } else {
        lines.push(`${k}: ${String(v)}`);
      }
    }
  }
  return lines.filter(Boolean).join('; ') || 'Validation failed';
}

function toToastMessage(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object' && ('formErrors' in input || 'fieldErrors' in input)) {
    return formatZodLikeError(input);
  }
  if (input && typeof input === 'object') {
    try {
      return JSON.stringify(input);
    } catch {
      return 'Something went wrong';
    }
  }
  return input == null ? 'Something went wrong' : String(input);
}

/* ─────────────────────────────── Page ─────────────────────────────── */
export default function OrgAdminPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.orgSlug === 'string' ? params.orgSlug : '';
  const api = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

  const [tab, setTab]             = useState('overview');
  const [dash, setDash]           = useState<DashStats | null>(null);
  const [properties, setProps]    = useState<Property[]>([]);
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [reviews, setReviews]     = useState<GuestReview[]>([]);
  const [sections, setSections]   = useState<SiteSection[]>([]);
  const [offers, setOffers]       = useState<LandingOfferRow[]>([]);
  const [media, setMedia]         = useState<MediaAsset[]>([]);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [busy, setBusy]           = useState(false);
  const [homepageKind, setHomepageKind] = useState<'LISTING_GRID' | 'MATRIX_THREE_SKU'>('LISTING_GRID');
  const [unitBundles, setUnitBundles] = useState<UnitListingBundle[]>([]);
  const [listingEditUnitId, setListingEditUnitId] = useState<string | null>(null);
  const [listingDraft, setListingDraft] = useState<ListingDraftState | null>(null);
  const [airbnbAccounts, setAirbnbAccounts] = useState<AirbnbHostAccountRow[]>([]);

  const tok = () => localStorage.getItem('mavu_token') ?? '';
  const ah  = (extra?: Record<string, string>) => ({ Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json', ...extra });

  function notify(msg: unknown, ok = true) {
    setToast({ msg: toToastMessage(msg), ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T | null> {
    const res = await fetch(`${api}${path}`, { ...opts, headers: { ...ah(), ...(opts?.headers as Record<string, string> ?? {}) } });
    if (res.status === 401) { router.push('/login'); return null; }
    const j = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
      let errMsg: string;
      if (typeof j.error === 'string') {
        errMsg = j.error;
      } else if (j.error != null && typeof j.error === 'object') {
        errMsg = toToastMessage(j.error);
      } else if (j.formErrors != null || j.fieldErrors != null) {
        errMsg = toToastMessage(j);
      } else {
        errMsg = typeof j.message === 'string' ? j.message : `HTTP ${res.status}`;
      }
      if (
        res.status === 404 &&
        path.startsWith('/orgs/') &&
        (/not\s*found/i.test(errMsg) || errMsg === `HTTP ${res.status}`)
      ) {
        errMsg = `${errMsg} — admin calls your Fastify API. On Vercel, set NEXT_PUBLIC_API_URL to that API base URL (not your marketing site). Redeploy the API if routes are missing.`;
      }
      notify(errMsg, false); return null;
    }
    return j as T;
  }

  const base = `/orgs/${encodeURIComponent(slug)}`;

  const loadDash  = useCallback(async () => { const d = await apiFetch<DashStats>(`${base}/dashboard`); if (d) setDash(d); }, [slug]);
  const loadProps = useCallback(async () => { const d = await apiFetch<{ properties: Property[] }>(`${base}/properties`); if (d) setProps(d.properties); }, [slug]);
  const loadBk    = useCallback(async () => { const d = await apiFetch<{ bookings: Booking[] }>(`${base}/bookings`); if (d) setBookings(d.bookings); }, [slug]);
  const loadRev   = useCallback(async () => { const d = await apiFetch<{ reviews: GuestReview[] }>(`${base}/cms/reviews`); if (d) setReviews(d.reviews); }, [slug]);
  const loadCms   = useCallback(async () => {
    const [s, m, o] = await Promise.all([
      apiFetch<{ sections: SiteSection[] }>(`${base}/cms/sections`),
      apiFetch<{ media: MediaAsset[] }>(`${base}/cms/media`),
      apiFetch<{ offers: LandingOfferRow[] }>(`${base}/cms/offers`),
    ]);
    if (s) setSections(s.sections);
    if (m) setMedia(m.media);
    if (o) setOffers(o.offers);
  }, [slug]);

  const loadUnitListings = useCallback(async () => {
    const d = await apiFetch<{ units: UnitListingBundle[] }>(`${base}/cms/unit-listings`);
    if (d) setUnitBundles(d.units);
  }, [slug]);

  const loadSiteSettings = useCallback(async () => {
    const d = await apiFetch<{ homepageKind: 'LISTING_GRID' | 'MATRIX_THREE_SKU' }>(`${base}/cms/site-settings`);
    if (d?.homepageKind) setHomepageKind(d.homepageKind);
  }, [slug]);

  const loadAirbnb = useCallback(async () => {
    const d = await apiFetch<{ accounts: AirbnbHostAccountRow[] }>(`${base}/airbnb-host-accounts`);
    if (d?.accounts) setAirbnbAccounts(d.accounts);
  }, [slug]);

  useEffect(() => {
    if (!tok()) { router.push('/login'); return; }
    void loadDash();
    void loadProps();
    void loadBk();
    void loadRev();
    void loadCms();
    void loadUnitListings();
    void loadSiteSettings();
    void loadAirbnb();
  }, [slug]);

  // Flat list of all units across all properties (for dropdowns)
  const allUnits = properties.flatMap(p => p.units.map(u => ({ ...u, propertyName: p.name, propertySlug: p.slug })));

  /* ─── Overview ─── */
  const TabOverview = (
    <>
      <div className="adm-stats">
        {[
          { label: 'Properties',       value: properties.length,                       sub: 'configured',       cls: '' },
          { label: 'Upcoming (14d)',    value: dash?.upcoming?.length ?? '—',           sub: 'bookings',         cls: 'adm-stat-accent' },
          { label: 'Published Reviews', value: reviews.filter(r=>r.showOnLanding).length, sub: 'on landing',    cls: 'adm-stat-accent-green' },
          { label: 'Open Alerts',       value: dash?.alerts?.length ?? '—',             sub: 'need attention',  cls: 'adm-stat-accent-blue' },
        ].map(s => (
          <div key={s.label} className={`adm-stat-card ${s.cls}`}>
            <span className="adm-stat-label">{s.label}</span>
            <span className="adm-stat-value">{s.value}</span>
            <span className="adm-stat-sub">{s.sub}</span>
          </div>
        ))}
      </div>

      {dash?.alerts?.filter(a => a).map(a => (
        <div key={a.id} className="adm-alert adm-alert-error" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>⚠️ {a.message}</span>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={async () => {
            await apiFetch(`${base}/conflict-alerts/${a.id}/dismiss`, { method:'POST' });
            await loadDash(); notify('Alert dismissed.');
          }} type="button">Dismiss</button>
        </div>
      ))}

      <div className="adm-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Upcoming Bookings (next 14 days)</h2>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={()=>setTab('bookings')} type="button">All bookings →</button>
        </div>
        {dash?.upcoming?.length ? (
          <table className="adm-table">
            <thead><tr><th>Guest</th><th>Check-in</th><th>Check-out</th><th>Unit</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {dash.upcoming.map(b => (
                <tr key={b.id}>
                  <td><strong>{b.guestName ?? 'Guest'}</strong>{b.guestCount ? ` · ${b.guestCount} pax` : ''}</td>
                  <td>{fmtDate(b.checkInUtc)}</td>
                  <td>{fmtDate(b.checkOutUtc)}</td>
                  <td><span className="adm-badge adm-badge-gray">{b.rentableUnit?.name ?? '—'}</span></td>
                  <td><StatusBadge s={b.status}/></td>
                  <td>{b.status==='PENDING' && <ConfirmBtn id={b.id} base={base} apiFetch={apiFetch} reload={async()=>{ await loadDash(); await loadBk(); }} notify={notify}/>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="adm-empty"><CalI size={28}/>No upcoming bookings.</div>}
      </div>
    </>
  );

  /* ─── Properties ─── */
  const [propForm, setPropForm] = useState({ name: '', slug: '' });
  const [unitForms, setUnitForms] = useState<Record<string, { name: string; slug: string; kind: string }>>({});

  const TabProperties = (
    <>
      {/* Add property */}
      <div className="adm-alert adm-alert-info" style={{marginBottom:'1.25rem',fontSize:'0.84rem',lineHeight:1.55}}>
        <strong>Landing site alignment:</strong> the homepage “Full Farm / 1BHK / 2BHK” booking grid resolves units by{' '}
        <strong>slug</strong> (see API <code style={{fontSize:'0.78rem'}}>landing-availability-matrix.ts</code>). Canonical slugs are{' '}
        <code style={{fontSize:'0.78rem'}}>full-farm</code>, <code style={{fontSize:'0.78rem'}}>1bhk-villa</code>,{' '}
        <code style={{fontSize:'0.78rem'}}>2bhk-villa</code> — run <code style={{fontSize:'0.78rem'}}>npm run db:seed</code> after register to create them.
        Stay cards, detail pages, and pricing are edited under <strong>CMS → Stay listings</strong>. Generic homepage copy lives in{' '}
        <strong>Text Sections</strong> &amp; <strong>Media</strong>; run <code style={{fontSize:'0.78rem'}}>npm run db:seed</code> after register to preload Mavu-style content when the DB is empty.
      </div>
      <div className="adm-card" style={{marginBottom:'1.5rem'}}>
        <div className="adm-card-header"><h2 className="adm-card-title">Add Property</h2></div>
        <div className="adm-card-body">
          <form onSubmit={async e => {
            e.preventDefault(); setBusy(true);
            const r = await apiFetch<{property:Property}>(`${base}/properties`, { method:'POST', body: JSON.stringify(propForm) });
            setBusy(false); if (!r) return;
            setPropForm({name:'',slug:''}); await loadProps(); notify('Property added.');
          }}>
            <div className="adm-form-grid">
              <div className="adm-field">
                <label className="adm-label">Property Name</label>
                <input className="adm-input" placeholder="e.g. Mavu Days Farm" value={propForm.name} required
                  onChange={e=>setPropForm(s=>({...s, name:e.target.value, slug: s.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}))} />
              </div>
              <div className="adm-field">
                <label className="adm-label">Slug (URL-safe)</label>
                <input className="adm-input" placeholder="e.g. mavu-farm" value={propForm.slug} required pattern="[a-z0-9-]+"
                  onChange={e=>setPropForm(s=>({...s, slug:e.target.value}))} />
              </div>
            </div>
            <button className="adm-btn adm-btn-primary" style={{marginTop:'1rem'}} disabled={busy} type="submit">Add Property</button>
          </form>
        </div>
      </div>

      {/* Properties list */}
      {properties.length === 0 && <div className="adm-empty"><HomeI size={28}/>No properties yet. Add one above.</div>}
      {properties.map(p => (
        <div key={p.id} className="adm-card" style={{marginBottom:'1.5rem'}}>
          <div className="adm-card-header">
            <div>
              <h2 className="adm-card-title">{p.name}</h2>
              <span className="adm-badge adm-badge-gray" style={{marginTop:'0.25rem',display:'inline-block'}}>/{p.slug}</span>
            </div>
            <button className="adm-btn adm-btn-danger adm-btn-sm" type="button" onClick={async()=>{
              if(!confirm(`Delete property "${p.name}" and all its units?`)) return;
              await apiFetch(`${base}/properties/${p.slug}`,{method:'DELETE'});
              await loadProps(); notify('Property deleted.');
            }}>Delete</button>
          </div>

          {/* Units list */}
          <div className="adm-card-body">
            <h3 style={{fontSize:'0.82rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#6B7280',marginTop:0,marginBottom:'0.75rem'}}>Rentable Units</h3>
            {p.units.length === 0
              ? <p style={{fontSize:'0.875rem',color:'#9CA3AF',margin:'0 0 1rem'}}>No units yet.</p>
              : (
                <table className="adm-table" style={{marginBottom:'1rem'}}>
                  <thead><tr><th>Name</th><th>Slug</th><th>Kind</th><th>Feeds</th></tr></thead>
                  <tbody>
                    {p.units.map(u=>(
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong></td>
                        <td><code style={{fontSize:'0.8rem'}}>{u.slug}</code></td>
                        <td><span className="adm-badge adm-badge-blue">{u.kind}</span></td>
                        <td>{u.listingLinks.length} feed{u.listingLinks.length!==1?'s':''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            {/* Add unit form per property */}
            <div className="adm-divider"/>
            <h3 style={{fontSize:'0.82rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#6B7280',margin:'0 0 0.75rem'}}>Add Unit to {p.name}</h3>
            <form onSubmit={async e => {
              e.preventDefault(); setBusy(true);
              const f = unitForms[p.id] ?? {name:'',slug:'',kind:'WHOLE_HOME'};
              const r = await apiFetch(`${base}/properties/${p.slug}/units`,{method:'POST',body:JSON.stringify({name:f.name,slug:f.slug,kind:f.kind})});
              setBusy(false); if(!r) return;
              setUnitForms(s=>({...s,[p.id]:{name:'',slug:'',kind:'WHOLE_HOME'}}));
              await loadProps(); notify('Unit added.');
            }}>
              <div className="adm-form-grid">
                <div className="adm-field">
                  <label className="adm-label">Unit Name</label>
                  <input className="adm-input" placeholder="e.g. 1BHK Villa" required
                    value={(unitForms[p.id]?.name??'')}
                    onChange={e=>setUnitForms(s=>({...s,[p.id]:{...(s[p.id]??{name:'',slug:'',kind:'WHOLE_HOME'}),name:e.target.value,slug:(s[p.id]?.slug||e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))}}))} />
                </div>
                <div className="adm-field">
                  <label className="adm-label">Slug</label>
                  <input className="adm-input" placeholder="e.g. 1bhk-villa" required pattern="[a-z0-9-]+"
                    value={(unitForms[p.id]?.slug??'')}
                    onChange={e=>setUnitForms(s=>({...s,[p.id]:{...(s[p.id]??{name:'',slug:'',kind:'WHOLE_HOME'}),slug:e.target.value}}))} />
                </div>
                <div className="adm-field">
                  <label className="adm-label">Kind</label>
                  <select className="adm-select" value={(unitForms[p.id]?.kind??'WHOLE_HOME')}
                    onChange={e=>setUnitForms(s=>({...s,[p.id]:{...(s[p.id]??{name:'',slug:'',kind:'WHOLE_HOME'}),kind:e.target.value}}))}>
                    <option value="WHOLE_HOME">Whole Home</option>
                    <option value="PRIVATE_ROOM">Private Room</option>
                    <option value="SHARED_ROOM">Shared Room</option>
                  </select>
                </div>
              </div>
              <button className="adm-btn adm-btn-primary adm-btn-sm" style={{marginTop:'0.75rem'}} disabled={busy} type="submit">Add Unit</button>
            </form>
          </div>
        </div>
      ))}
    </>
  );

  /* ─── Bookings ─── */
  const [bkForm, setBkForm] = useState({ unitId:'', checkIn:'', checkOut:'', guestName:'', guestEmail:'', guestPhone:'', note:'' });
  const [bkOfferIds, setBkOfferIds] = useState<string[]>([]);
  const [blkForm, setBlkForm] = useState({ unitId:'', start:'', end:'', reason:'PERSONAL_HOLD', note:'' });
  const [bkSubTab, setBkSubTab] = useState<'list'|'add'|'block'>('list');

  useEffect(() => {
    setBkOfferIds([]);
  }, [bkForm.unitId]);

  const TabBookings = (
    <>
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem'}}>
        {([['list','All Bookings'],['add','Add Manual Booking'],['block','Block Dates']] as const).map(([k,l])=>(
          <button key={k} className={`adm-btn ${bkSubTab===k?'adm-btn-primary':'adm-btn-ghost'}`} onClick={()=>setBkSubTab(k)} type="button">{l}</button>
        ))}
      </div>

      {bkSubTab==='list' && (
        <div className="adm-card">
          <div className="adm-card-header"><h2 className="adm-card-title">All Bookings ({bookings.length})</h2></div>
          {bookings.length ? (
            <div style={{overflowX:'auto'}}>
              <table className="adm-table">
                <thead><tr><th>Guest</th><th>Unit</th><th>Check-in</th><th>Check-out</th><th>Source</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {bookings.map(b=>(
                    <tr key={b.id}>
                      <td>
                        <strong>{b.guestName??'Guest'}</strong>
                        {b.guestEmail ? <><br/><span style={{fontSize:'0.78rem',color:'#6B7280'}}>{b.guestEmail}</span></> : null}
                        {b.offerSelections?.length ? (
                          <><br/><span style={{fontSize:'0.75rem',color:'#059669'}}>
                            Offers: {b.offerSelections.map((s) => s.landingOffer.label).join(' · ')}
                          </span></>
                        ) : null}
                      </td>
                      <td><span className="adm-badge adm-badge-gray">{b.rentableUnit?.name??'—'}</span></td>
                      <td>{fmtDate(b.checkInUtc)}</td>
                      <td>{fmtDate(b.checkOutUtc)}</td>
                      <td><span className="adm-badge adm-badge-blue">{b.source}</span></td>
                      <td><StatusBadge s={b.status}/></td>
                      <td>{b.status==='PENDING'&&<ConfirmBtn id={b.id} base={base} apiFetch={apiFetch} reload={async()=>{await loadDash();await loadBk();}} notify={notify}/>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="adm-empty"><CalI size={28}/>No bookings found.</div>}
        </div>
      )}

      {bkSubTab==='add' && (
        <div className="adm-card">
          <div className="adm-card-header"><h2 className="adm-card-title">Add Manual Booking</h2></div>
          <div className="adm-card-body">
            {allUnits.length===0 && <div className="adm-alert adm-alert-error">Set up at least one property and unit first.</div>}
            <form onSubmit={async e=>{
              e.preventDefault(); if(!bkForm.unitId){notify('Select a unit.',false);return;} setBusy(true);
              const r = await apiFetch(`${base}/bookings`,{method:'POST',body:JSON.stringify({
                rentableUnitId:bkForm.unitId, checkInUtc:new Date(bkForm.checkIn).toISOString(),
                checkOutUtc:new Date(bkForm.checkOut).toISOString(),
                guestName:bkForm.guestName||undefined, guestEmail:bkForm.guestEmail||undefined,
                guestPhone:bkForm.guestPhone||undefined, note:bkForm.note||undefined,
                offerIds: bkOfferIds.length ? bkOfferIds : undefined,
              })});
              setBusy(false);
              if(!r) return;
              setBkForm({unitId:'',checkIn:'',checkOut:'',guestName:'',guestEmail:'',guestPhone:'',note:''});
              setBkOfferIds([]);
              await loadBk(); await loadDash(); notify('Booking created!'); setBkSubTab('list');
            }}>
              <div className="adm-form-grid">
                <div className="adm-field adm-field-full">
                  <label className="adm-label">Property / Unit</label>
                  <select className="adm-select" value={bkForm.unitId} required onChange={e=>setBkForm(s=>({...s,unitId:e.target.value}))}>
                    <option value="">— select unit —</option>
                    {properties.map(p=>(
                      <optgroup key={p.id} label={p.name}>
                        {p.units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="adm-field">
                  <label className="adm-label">Check-in Date</label>
                  <input className="adm-input" type="date" required value={bkForm.checkIn} onChange={e=>setBkForm(s=>({...s,checkIn:e.target.value}))}/>
                </div>
                <div className="adm-field">
                  <label className="adm-label">Check-out Date</label>
                  <input className="adm-input" type="date" required value={bkForm.checkOut} onChange={e=>setBkForm(s=>({...s,checkOut:e.target.value}))}/>
                </div>
                <div className="adm-field">
                  <label className="adm-label">Guest Name</label>
                  <input className="adm-input" placeholder="Full name" value={bkForm.guestName} onChange={e=>setBkForm(s=>({...s,guestName:e.target.value}))}/>
                </div>
                <div className="adm-field">
                  <label className="adm-label">Guest Email</label>
                  <input className="adm-input" type="email" placeholder="guest@example.com" value={bkForm.guestEmail} onChange={e=>setBkForm(s=>({...s,guestEmail:e.target.value}))}/>
                </div>
                <div className="adm-field">
                  <label className="adm-label">Guest Phone</label>
                  <input className="adm-input" placeholder="+91 9XXXXXXX" value={bkForm.guestPhone} onChange={e=>setBkForm(s=>({...s,guestPhone:e.target.value}))}/>
                </div>
                <div className="adm-field adm-field-full">
                  <label className="adm-label">Internal Note (optional)</label>
                  <textarea className="adm-textarea" rows={2} value={bkForm.note} onChange={e=>setBkForm(s=>({...s,note:e.target.value}))}/>
                </div>
                {bkForm.unitId ? (
                  offers.filter(o=>o.published && (!o.rentableUnitId || o.rentableUnitId===bkForm.unitId)).length > 0 ? (
                    <div className="adm-field adm-field-full">
                      <label className="adm-label">Offers guest asked for (optional)</label>
                      <div style={{display:'flex',flexDirection:'column',gap:'0.35rem'}}>
                        {offers.filter(o=>o.published && (!o.rentableUnitId || o.rentableUnitId===bkForm.unitId)).map(o=>(
                          <label key={o.id} className="adm-toggle-row">
                            <input type="checkbox" checked={bkOfferIds.includes(o.id)} onChange={()=>{
                              setBkOfferIds(ids=>ids.includes(o.id)?ids.filter(x=>x!==o.id):[...ids,o.id]);
                            }}/>
                            {o.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null
                ) : null}
              </div>
              <button className="adm-btn adm-btn-primary" style={{marginTop:'1rem'}} disabled={busy||!allUnits.length} type="submit">Create Booking</button>
            </form>
          </div>
        </div>
      )}

      {bkSubTab==='block' && (
        <div className="adm-card">
          <div className="adm-card-header"><h2 className="adm-card-title">Block Dates</h2></div>
          <div className="adm-card-body">
            <p style={{fontSize:'0.84rem',color:'#6B7280',marginTop:0}}>Block dates for maintenance, personal use, or other reasons. Blocked periods show as unavailable in the booking flow.</p>
            {allUnits.length===0 && <div className="adm-alert adm-alert-error">Set up at least one property and unit first.</div>}
            <form onSubmit={async e=>{
              e.preventDefault(); if(!blkForm.unitId){notify('Select a unit.',false);return;} setBusy(true);
              const r = await apiFetch(`${base}/availability-blocks`,{method:'POST',body:JSON.stringify({
                rentableUnitId:blkForm.unitId, startsAtUtc:new Date(blkForm.start).toISOString(),
                endsAtUtc:new Date(blkForm.end).toISOString(), reason:blkForm.reason, note:blkForm.note||undefined,
              })});
              setBusy(false); if(!r) return;
              setBlkForm({unitId:'',start:'',end:'',reason:'PERSONAL_HOLD',note:''});
              notify('Dates blocked.'); await loadDash();
            }}>
              <div className="adm-form-grid">
                <div className="adm-field adm-field-full">
                  <label className="adm-label">Unit</label>
                  <select className="adm-select" value={blkForm.unitId} required onChange={e=>setBlkForm(s=>({...s,unitId:e.target.value}))}>
                    <option value="">— select unit —</option>
                    {properties.map(p=>(
                      <optgroup key={p.id} label={p.name}>
                        {p.units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="adm-field">
                  <label className="adm-label">From Date</label>
                  <input className="adm-input" type="date" required value={blkForm.start} onChange={e=>setBlkForm(s=>({...s,start:e.target.value}))}/>
                </div>
                <div className="adm-field">
                  <label className="adm-label">To Date</label>
                  <input className="adm-input" type="date" required value={blkForm.end} onChange={e=>setBlkForm(s=>({...s,end:e.target.value}))}/>
                </div>
                <div className="adm-field">
                  <label className="adm-label">Reason</label>
                  <select className="adm-select" value={blkForm.reason} onChange={e=>setBlkForm(s=>({...s,reason:e.target.value}))}>
                    <option value="PERSONAL_HOLD">Personal Hold</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="adm-field adm-field-full">
                  <label className="adm-label">Note (optional)</label>
                  <input className="adm-input" value={blkForm.note} placeholder="e.g. Family visit" onChange={e=>setBlkForm(s=>({...s,note:e.target.value}))}/>
                </div>
              </div>
              <button className="adm-btn adm-btn-yellow" style={{marginTop:'1rem'}} disabled={busy||!allUnits.length} type="submit">Block Dates</button>
            </form>
          </div>
        </div>
      )}
    </>
  );

  /* ─── Reviews ─── */
  const [revForm, setRevForm] = useState({ platform:'AIRBNB', rating:5, guestDisplayName:'', title:'', body:'', pinnedOrder:'6', showOnLanding:true, externalId:'' });
  const [editRev, setEditRev] = useState<string|null>(null);
  const [editPatch, setEditPatch] = useState<{showOnLanding:boolean;pinnedOrder:string}>({showOnLanding:true,pinnedOrder:'6'});

  const TabReviews = (
    <>
      <div className="adm-card" style={{marginBottom:'1.5rem'}}>
        <div className="adm-card-header">
          <h2 className="adm-card-title">Reviews ({reviews.filter(r=>r.showOnLanding).length} visible on landing)</h2>
        </div>
        <div className="adm-card-body" style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          {reviews.length===0 && <div className="adm-empty"><StarI size={28}/>No reviews yet.</div>}
          {reviews.map(r=>(
            <div key={r.id} className="adm-review-item">
              {editRev===r.id ? (
                <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                  <div className="adm-form-grid">
                    <div className="adm-field">
                      <label className="adm-label">Pinned Order</label>
                      <input className="adm-input" type="number" value={editPatch.pinnedOrder} onChange={e=>setEditPatch(s=>({...s,pinnedOrder:e.target.value}))}/>
                    </div>
                    <div className="adm-field" style={{justifyContent:'flex-end'}}>
                      <label className="adm-toggle-row" style={{marginTop:'1.5rem'}}>
                        <input type="checkbox" checked={editPatch.showOnLanding} onChange={e=>setEditPatch(s=>({...s,showOnLanding:e.target.checked}))}/>
                        Show on landing page
                      </label>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'0.5rem'}}>
                    <button className="adm-btn adm-btn-primary adm-btn-sm" type="button" onClick={async()=>{
                      await apiFetch(`${base}/cms/reviews/${r.id}`,{method:'PATCH',body:JSON.stringify({showOnLanding:editPatch.showOnLanding,pinnedOrder:parseInt(editPatch.pinnedOrder,10)||1000})});
                      setEditRev(null); await loadRev(); notify('Review updated.');
                    }}>Save</button>
                    <button className="adm-btn adm-btn-ghost adm-btn-sm" type="button" onClick={()=>setEditRev(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="adm-review-row">
                  <div className="adm-review-meta">
                    <span className="adm-badge adm-badge-blue">{PLT_LABEL[r.platform]??r.platform}</span>
                    <span className="adm-review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(Math.max(0,r.ratingMax-r.rating))}</span>
                    {r.guestDisplayName&&<strong style={{fontSize:'0.875rem'}}>{r.guestDisplayName}</strong>}
                    {!r.showOnLanding&&<span className="adm-badge adm-badge-yellow">Hidden</span>}
                    <span className="adm-badge adm-badge-gray">pin {r.pinnedOrder}</span>
                  </div>
                  <div style={{display:'flex',gap:'0.5rem'}}>
                    <button className="adm-btn adm-btn-ghost adm-btn-sm" type="button" onClick={()=>{setEditRev(r.id);setEditPatch({showOnLanding:r.showOnLanding,pinnedOrder:String(r.pinnedOrder)});}}>Edit</button>
                    <button className="adm-btn adm-btn-danger adm-btn-sm" type="button" onClick={async()=>{
                      if(!confirm('Remove review?')) return;
                      await apiFetch(`${base}/cms/reviews/${r.id}`,{method:'DELETE'});
                      await loadRev(); notify('Removed.');
                    }}>Remove</button>
                  </div>
                </div>
              )}
              {editRev!==r.id&&<>{r.title&&<p style={{margin:0,fontWeight:600,fontSize:'0.875rem'}}>{r.title}</p>}<p className="adm-review-body">{r.body.slice(0,280)}{r.body.length>280?'…':''}</p></>}
            </div>
          ))}
        </div>
      </div>
      <div className="adm-card">
        <div className="adm-card-header"><h2 className="adm-card-title">Add Review</h2></div>
        <div className="adm-card-body">
          <form onSubmit={async e=>{
            e.preventDefault(); setBusy(true);
            const r = await apiFetch(`${base}/cms/reviews`,{method:'POST',body:JSON.stringify({...revForm,rating:Number(revForm.rating),ratingMax:5,pinnedOrder:parseInt(revForm.pinnedOrder,10)||1000,guestDisplayName:revForm.guestDisplayName||undefined,title:revForm.title||undefined,externalId:revForm.externalId||undefined})});
            setBusy(false); if(!r) return;
            setRevForm(s=>({...s,body:'',title:'',guestDisplayName:'',externalId:''}));
            await loadRev(); notify('Review saved.');
          }}>
            <div className="adm-form-grid">
              <div className="adm-field"><label className="adm-label">Platform</label><select className="adm-select" value={revForm.platform} onChange={e=>setRevForm(s=>({...s,platform:e.target.value}))}>{PLATFORMS.map(p=><option key={p} value={p}>{PLT_LABEL[p]}</option>)}</select></div>
              <div className="adm-field"><label className="adm-label">Rating (/ 5)</label><input className="adm-input" type="number" min={1} max={5} value={revForm.rating} onChange={e=>setRevForm(s=>({...s,rating:Number(e.target.value)}))}/></div>
              <div className="adm-field"><label className="adm-label">Guest Name</label><input className="adm-input" value={revForm.guestDisplayName} placeholder="Guest display name" onChange={e=>setRevForm(s=>({...s,guestDisplayName:e.target.value}))}/></div>
              <div className="adm-field"><label className="adm-label">Title (optional)</label><input className="adm-input" value={revForm.title} onChange={e=>setRevForm(s=>({...s,title:e.target.value}))}/></div>
              <div className="adm-field adm-field-full"><label className="adm-label">Review Text</label><textarea className="adm-textarea" required minLength={10} rows={3} value={revForm.body} onChange={e=>setRevForm(s=>({...s,body:e.target.value}))}/></div>
              <div className="adm-field"><label className="adm-label">Pinned Order (1=top)</label><input className="adm-input" type="number" min={0} value={revForm.pinnedOrder} onChange={e=>setRevForm(s=>({...s,pinnedOrder:e.target.value}))}/></div>
              <div className="adm-field"><label className="adm-label">External ID (optional)</label><input className="adm-input" value={revForm.externalId} placeholder="Airbnb review ID…" onChange={e=>setRevForm(s=>({...s,externalId:e.target.value}))}/></div>
              <div className="adm-field adm-field-full"><label className="adm-toggle-row"><input type="checkbox" checked={revForm.showOnLanding} onChange={e=>setRevForm(s=>({...s,showOnLanding:e.target.checked}))}/>Show on landing page</label></div>
            </div>
            <button className="adm-btn adm-btn-primary" style={{marginTop:'1rem'}} disabled={busy} type="submit">Save Review</button>
          </form>
        </div>
      </div>
    </>
  );

  /* ─── CMS ─── */
  const [cmsSubTab, setCmsSubTab] = useState<'sections'|'media'|'offers'|'listings'|'site'>('sections');
  const [secForm, setSecForm] = useState({key:'',title:'',bodyMarkdown:'',published:true});
  const [editSec, setEditSec] = useState<string|null>(null);
  const [editSecPatch, setEditSecPatch] = useState({title:'',bodyMarkdown:'',published:true});
  const [mediaForm, setMediaForm] = useState({key:'',publicUrl:'',alt:''});
  const [editOffer, setEditOffer] = useState<string|null>(null);
  const [editOfferPatch, setEditOfferPatch] = useState({label:'',sortOrder:'0',published:true,rentableUnitId:''});
  const [offerForm, setOfferForm] = useState({label:'',sortOrder:'0',published:true,rentableUnitId:''});

  const optionalInt = (s: string) => {
    const t = s.trim();
    if (!t) return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  };

  const TabCms = (
    <>
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
        {([
          ['sections','Text sections'],
          ['media','Media / images'],
          ['listings','Stay listings'],
          ['site','Homepage layout'],
          ['offers','Landing offers'],
        ] as const).map(([k,l])=>(
          <button key={k} className={`adm-btn ${cmsSubTab===k?'adm-btn-primary':'adm-btn-ghost'}`} onClick={()=>setCmsSubTab(k)} type="button">{l}</button>
        ))}
      </div>

      {cmsSubTab==='site' && (
        <div className="adm-card" style={{marginBottom:'1.25rem'}}>
          <div className="adm-card-header"><h2 className="adm-card-title">Public homepage layout</h2></div>
          <div className="adm-card-body">
            <p style={{fontSize:'0.84rem',color:'#6B7280',marginTop:0,lineHeight:1.55}}>
              <strong>Listing grid</strong> shows every published unit as a card (good for multiple properties).{' '}
              <strong>Three-SKU matrix</strong> matches Full Farm / 1BHK / 2BHK availability like the current Mavu Days flow.
            </p>
            <div className="adm-field adm-field-full">
              <label className="adm-label">Layout</label>
              <select className="adm-select" value={homepageKind} onChange={(e)=>setHomepageKind(e.target.value as 'LISTING_GRID'|'MATRIX_THREE_SKU')}>
                <option value="LISTING_GRID">Listing grid (multi-property)</option>
                <option value="MATRIX_THREE_SKU">Three-SKU matrix (single compound)</option>
              </select>
            </div>
            <button className="adm-btn adm-btn-primary" type="button" disabled={busy} onClick={async()=>{
              setBusy(true);
              const r = await apiFetch(`${base}/cms/site-settings`,{method:'PATCH',body:JSON.stringify({homepageKind})});
              setBusy(false);
              if (!r) return;
              notify('Homepage layout saved.');
            }}>Save layout</button>
          </div>
        </div>
      )}

      {cmsSubTab==='listings' && (
        <>
          <div className="adm-alert adm-alert-info" style={{marginBottom:'1.25rem',fontSize:'0.84rem',lineHeight:1.55}}>
            These fields power the marketing <strong>stay cards</strong>, <strong>/stays/…</strong> detail heroes, and (when prices are set) rate hints. Published listings appear on the public site immediately after save.
          </div>
          {unitBundles.length===0 ? <div className="adm-empty"><HomeI size={28}/>No units found. Add properties &amp; units first.</div> : null}
          {unitBundles.map((row)=>{
            const isOpen = listingEditUnitId===row.unit.id && listingDraft;
            return (
              <div key={row.unit.id} className="adm-card" style={{marginBottom:'1.25rem'}}>
                <div className="adm-card-header" style={{alignItems:'center'}}>
                  <div>
                    <h2 className="adm-card-title" style={{margin:0}}>{row.unit.name}</h2>
                    <span className="adm-badge adm-badge-gray" style={{marginTop:'0.35rem'}}>{row.propertyName} · {row.unit.slug}</span>
                    {row.listingProfile?.published ? (
                      <span className="adm-badge adm-badge-green" style={{marginLeft:'0.35rem'}}>Published</span>
                    ) : (
                      <span className="adm-badge adm-badge-yellow" style={{marginLeft:'0.35rem'}}>Draft / hidden</span>
                    )}
                  </div>
                  <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={()=>{
                    if (isOpen) {
                      setListingEditUnitId(null);
                      setListingDraft(null);
                    } else {
                      setListingEditUnitId(row.unit.id);
                      setListingDraft(listingDraftFromRow(row));
                    }
                  }}>{isOpen ? 'Close' : 'Edit'}</button>
                </div>
                {isOpen && listingDraft ? (
                  <div className="adm-card-body" style={{display:'flex',flexDirection:'column',gap:'0.85rem'}}>
                    <label className="adm-toggle-row">
                      <input type="checkbox" checked={listingDraft.published} onChange={(e)=>setListingDraft((d)=>d ? {...d,published:e.target.checked}: d)}/>
                      Published on marketing site
                    </label>
                    <div className="adm-form-grid">
                      <div className="adm-field"><label className="adm-label">Sort order</label><input className="adm-input" value={listingDraft.sortOrder} onChange={(e)=>setListingDraft((d)=>d?{...d,sortOrder:e.target.value}:d)}/></div>
                      <div className="adm-field adm-field-full">
                        <label className="adm-label">Matrix role (three-SKU mode)</label>
                        <select className="adm-select" value={listingDraft.matrixRole} onChange={(e)=>setListingDraft((d)=>d?{...d,matrixRole:e.target.value}:d)}>
                          {MATRIX_ROLE_OPTS.map((r)=><option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="adm-field adm-field-full"><label className="adm-label">Card title</label><input className="adm-input" value={listingDraft.cardTitle} onChange={(e)=>setListingDraft((d)=>d?{...d,cardTitle:e.target.value}:d)}/></div>
                      <div className="adm-field adm-field-full"><label className="adm-label">Card subtitle</label><textarea className="adm-textarea" rows={2} value={listingDraft.cardShort} onChange={(e)=>setListingDraft((d)=>d?{...d,cardShort:e.target.value}:d)}/></div>
                      <div className="adm-field adm-field-full"><label className="adm-label">Best for (one per line)</label><textarea className="adm-textarea" rows={3} value={listingDraft.bestForText} onChange={(e)=>setListingDraft((d)=>d?{...d,bestForText:e.target.value}:d)}/></div>
                      <div className="adm-field adm-field-full"><label className="adm-label">Detail page copy (markdown)</label><textarea className="adm-textarea" rows={8} value={listingDraft.descriptionMarkdown} onChange={(e)=>setListingDraft((d)=>d?{...d,descriptionMarkdown:e.target.value}:d)}/></div>
                      <div className="adm-field adm-field-full"><label className="adm-label">Highlights (one per line)</label><textarea className="adm-textarea" rows={4} value={listingDraft.highlightsText} onChange={(e)=>setListingDraft((d)=>d?{...d,highlightsText:e.target.value}:d)}/></div>
                      <div className="adm-field adm-field-full"><label className="adm-label">Amenities (one per line)</label><textarea className="adm-textarea" rows={4} value={listingDraft.amenitiesText} onChange={(e)=>setListingDraft((d)=>d?{...d,amenitiesText:e.target.value}:d)}/></div>
                      <div className="adm-field adm-field-full"><label className="adm-label">CTA button label</label><input className="adm-input" value={listingDraft.ctaLabel} onChange={(e)=>setListingDraft((d)=>d?{...d,ctaLabel:e.target.value}:d)} placeholder="e.g. Book 1BHK Villa"/></div>
                    </div>
                    <div className="adm-form-grid">
                      {(['weekday','friday','saturday','sunday','longWeekend'] as const).map((k)=>(
                        <div key={k} className="adm-field"><label className="adm-label">{k} (INR / night)</label><input className="adm-input" value={listingDraft[k]} onChange={(e)=>setListingDraft((d)=>d?{...d,[k]:e.target.value}:d)} placeholder="optional"/></div>
                      ))}
                    </div>
                    <div className="adm-form-grid">
                      <div className="adm-field"><label className="adm-label">Guests hint</label><input className="adm-input" value={listingDraft.guestsHint} onChange={(e)=>setListingDraft((d)=>d?{...d,guestsHint:e.target.value}:d)} placeholder="e.g. 6"/></div>
                      <div className="adm-field"><label className="adm-label">Bedrooms hint</label><input className="adm-input" value={listingDraft.bedroomsHint} onChange={(e)=>setListingDraft((d)=>d?{...d,bedroomsHint:e.target.value}:d)} placeholder="e.g. 2"/></div>
                    </div>
                    <div className="adm-form-grid">
                      <div className="adm-field adm-field-full"><label className="adm-label">SEO title</label><input className="adm-input" value={listingDraft.seoTitle} onChange={(e)=>setListingDraft((d)=>d?{...d,seoTitle:e.target.value}:d)}/></div>
                      <div className="adm-field adm-field-full"><label className="adm-label">SEO description</label><textarea className="adm-textarea" rows={2} value={listingDraft.seoDescription} onChange={(e)=>setListingDraft((d)=>d?{...d,seoDescription:e.target.value}:d)}/></div>
                      <div className="adm-field adm-field-full">
                        <label className="adm-label">Detail hero image URL</label>
                        <input className="adm-input" value={listingDraft.detailHeroUrl} onChange={(e)=>setListingDraft((d)=>d?{...d,detailHeroUrl:e.target.value}:d)} placeholder="https://… or /photo.jpg"/>
                        {listingDraft.detailHeroUrl.trim() ? (
                          <div style={{marginTop:'0.5rem',maxWidth:280,borderRadius:8,overflow:'hidden',border:'1px solid #E5E7EB'}}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={listingDraft.detailHeroUrl.trim()} alt="" style={{width:'100%',display:'block',maxHeight:140,objectFit:'cover'}} />
                          </div>
                        ):null}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                      <button type="button" className="adm-btn adm-btn-primary" disabled={busy} onClick={async()=>{
                        if(!listingDraft) return;
                        const bf = listingDraft.bestForText.split('\n').map((l)=>l.trim()).filter(Boolean);
                        const hi = listingDraft.highlightsText.split('\n').map((l)=>l.trim()).filter(Boolean);
                        const am = listingDraft.amenitiesText.split('\n').map((l)=>l.trim()).filter(Boolean);
                        const sortOrder = parseInt(listingDraft.sortOrder,10);
                        setBusy(true);
                        const r = await apiFetch(`${base}/rentable-units/${row.unit.id}/listing-profile`,{method:'PUT',body:JSON.stringify({
                          published:listingDraft.published,
                          sortOrder:Number.isFinite(sortOrder)?sortOrder:0,
                          matrixRole:listingDraft.matrixRole,
                          cardTitle:listingDraft.cardTitle.trim(),
                          cardShort:listingDraft.cardShort.trim(),
                          bestFor:bf,
                          descriptionMarkdown:listingDraft.descriptionMarkdown.trim(),
                          highlights:hi,
                          amenities:am,
                          ctaLabel:listingDraft.ctaLabel.trim()||null,
                          weekdayPriceMinor:optionalInt(listingDraft.weekday),
                          fridayPriceMinor:optionalInt(listingDraft.friday),
                          saturdayPriceMinor:optionalInt(listingDraft.saturday),
                          sundayPriceMinor:optionalInt(listingDraft.sunday),
                          longWeekendPriceMinor:optionalInt(listingDraft.longWeekend),
                          guestsHint:optionalInt(listingDraft.guestsHint),
                          bedroomsHint:optionalInt(listingDraft.bedroomsHint),
                          seoTitle:listingDraft.seoTitle.trim()||null,
                          seoDescription:listingDraft.seoDescription.trim()||null,
                          detailHeroUrl:listingDraft.detailHeroUrl.trim()||null,
                        })});
                        setBusy(false);
                        if(!r) return;
                        notify('Stay listing saved.');
                        setListingEditUnitId(null);
                        setListingDraft(null);
                        await loadUnitListings();
                      }}>Save stay listing</button>
                      <button type="button" className="adm-btn adm-btn-ghost" onClick={()=>{setListingEditUnitId(null);setListingDraft(null);}}>Cancel</button>
                    </div>
                  </div>
                ):null}
              </div>
            );
          })}
        </>
      )}

      {cmsSubTab==='sections' && (
        <>
          <details className="adm-card" style={{marginBottom:'1.25rem'}}>
            <summary style={{cursor:'pointer',padding:'1rem 1.5rem',fontWeight:600,color:'#1a1a2e'}}>Section key reference (public landing page)</summary>
            <div className="adm-card-body" style={{paddingTop:0}}>
              <p style={{fontSize:'0.84rem',color:'#6B7280',lineHeight:1.55,marginTop:0}}>
                Published rows override built-in defaults. Use <strong>Markdown</strong> for long prose. For JSON-driven blocks paste a valid JSON array in the section body{' '}
                (why blocks / house rules: objects with <code>title</code> and <code>text</code>; who cards: <code>title</code> and <code>body</code>; FAQs: <code>q</code> and <code>a</code>).
              </p>
              <p style={{fontSize:'0.78rem',color:'#6B7280',wordBreak:'break-all',marginBottom:'0.35rem'}}>
                Keys: {[...new Set(Object.values(SECTION_KEY) as string[])].sort().join(', ')}
              </p>
              <p style={{fontSize:'0.78rem',color:'#6B7280',margin:0}}>
                Hero image key: <code>{MEDIA_KEY.heroCover}</code>. Gallery: <code>{MEDIA_KEY.galleryPrefix}01</code> … <code>{MEDIA_KEY.galleryPrefix}08</code>.
              </p>
            </div>
          </details>
          <div className="adm-card" style={{marginBottom:'1.5rem'}}>
            <div className="adm-card-header"><h2 className="adm-card-title">Site Text Sections ({sections.length})</h2></div>
            {sections.length===0
              ? <div className="adm-empty"><EditI size={28}/>No custom sections yet.</div>
              : sections.map(s=>(
                  <div key={s.id} style={{borderBottom:'1px solid #F3F4F6',padding:'1rem 1.5rem'}}>
                    {editSec===s.key ? (
                      <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                        <input className="adm-input" value={editSecPatch.title} onChange={e=>setEditSecPatch(x=>({...x,title:e.target.value}))} placeholder="Title"/>
                        <textarea className="adm-textarea" rows={5} value={editSecPatch.bodyMarkdown} onChange={e=>setEditSecPatch(x=>({...x,bodyMarkdown:e.target.value}))}/>
                        <label className="adm-toggle-row"><input type="checkbox" checked={editSecPatch.published} onChange={e=>setEditSecPatch(x=>({...x,published:e.target.checked}))}/>Published</label>
                        <div style={{display:'flex',gap:'0.5rem'}}>
                          <button className="adm-btn adm-btn-primary adm-btn-sm" type="button" onClick={async()=>{
                            await apiFetch(`${base}/cms/sections/${encodeURIComponent(s.key)}`,{method:'PATCH',body:JSON.stringify(editSecPatch)});
                            setEditSec(null); await loadCms(); notify('Section saved.');
                          }}>Save</button>
                          <button className="adm-btn adm-btn-ghost adm-btn-sm" type="button" onClick={()=>setEditSec(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'1rem'}}>
                        <div>
                          <strong>{s.title}</strong>
                          <span className="adm-badge adm-badge-gray" style={{marginLeft:'0.5rem'}}>{s.key}</span>
                          {!s.published&&<span className="adm-badge adm-badge-yellow" style={{marginLeft:'0.35rem'}}>Draft</span>}
                          <p style={{margin:'0.35rem 0 0',fontSize:'0.84rem',color:'#6B7280'}}>{s.bodyMarkdown.slice(0,120)}{s.bodyMarkdown.length>120?'…':''}</p>
                        </div>
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" type="button" onClick={()=>{setEditSec(s.key);setEditSecPatch({title:s.title,bodyMarkdown:s.bodyMarkdown,published:s.published});}}>Edit</button>
                      </div>
                    )}
                  </div>
                ))}
          </div>
          <div className="adm-card">
            <div className="adm-card-header"><h2 className="adm-card-title">Add Section</h2></div>
            <div className="adm-card-body">
              <form onSubmit={async e=>{
                e.preventDefault(); setBusy(true);
                const r = await apiFetch(`${base}/cms/sections`,{method:'POST',body:JSON.stringify({...secForm,sortOrder:sections.length})});
                setBusy(false); if(!r) return;
                setSecForm({key:'',title:'',bodyMarkdown:'',published:true}); await loadCms(); notify('Section created.');
              }}>
                <div className="adm-form-grid">
                  <div className="adm-field"><label className="adm-label">Key (slug)</label><input className="adm-input" required pattern="[a-z0-9-]+" placeholder="e.g. landing-about" value={secForm.key} onChange={e=>setSecForm(s=>({...s,key:e.target.value}))}/></div>
                  <div className="adm-field"><label className="adm-label">Title</label><input className="adm-input" required placeholder="Section title" value={secForm.title} onChange={e=>setSecForm(s=>({...s,title:e.target.value}))}/></div>
                  <div className="adm-field adm-field-full"><label className="adm-label">Body (Markdown)</label><textarea className="adm-textarea" required rows={5} value={secForm.bodyMarkdown} onChange={e=>setSecForm(s=>({...s,bodyMarkdown:e.target.value}))}/></div>
                  <div className="adm-field adm-field-full"><label className="adm-toggle-row"><input type="checkbox" checked={secForm.published} onChange={e=>setSecForm(s=>({...s,published:e.target.checked}))}/>Publish immediately</label></div>
                </div>
                <button className="adm-btn adm-btn-primary" style={{marginTop:'1rem'}} disabled={busy} type="submit">Add Section</button>
              </form>
            </div>
          </div>
        </>
      )}

      {cmsSubTab==='media' && (
        <>
          <div className="adm-card" style={{marginBottom:'1.5rem'}}>
            <div className="adm-card-header"><h2 className="adm-card-title">Media Assets ({media.length})</h2></div>
            {media.length===0
              ? <div className="adm-empty"><EditI size={28}/>No media registered yet.</div>
              : (
                <table className="adm-table">
                  <thead><tr><th>Key</th><th>Alt</th><th>URL</th></tr></thead>
                  <tbody>
                    {media.map(m=>(
                      <tr key={m.id}>
                        <td><code style={{fontSize:'0.8rem'}}>{m.key}</code></td>
                        <td style={{fontSize:'0.84rem'}}>{m.alt??'—'}</td>
                        <td><a href={m.publicUrl} target="_blank" rel="noreferrer" style={{fontSize:'0.78rem',color:'var(--sage)',wordBreak:'break-all'}}>{m.publicUrl.slice(0,60)}{m.publicUrl.length>60?'…':''}</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
          <div className="adm-card">
            <div className="adm-card-header"><h2 className="adm-card-title">Register Media URL</h2></div>
            <div className="adm-card-body">
              <p style={{fontSize:'0.84rem',color:'#6B7280',marginTop:0}}>Use a full HTTPS URL or a root-relative path served by your site (e.g. <code>/hero.jpg</code>). Hero key:{' '}
                <code>{MEDIA_KEY.heroCover}</code>; gallery: <code>{MEDIA_KEY.galleryPrefix}01</code> … <code>{MEDIA_KEY.galleryPrefix}08</code>.</p>
              <form onSubmit={async e=>{
                e.preventDefault(); setBusy(true);
                const r = await apiFetch(`${base}/cms/media`,{method:'POST',body:JSON.stringify({key:mediaForm.key,publicUrl:mediaForm.publicUrl.trim(),alt:mediaForm.alt||undefined})});
                setBusy(false); if(!r) return;
                setMediaForm({key:'',publicUrl:'',alt:''}); await loadCms(); notify('Media registered.');
              }}>
                <div className="adm-form-grid">
                  <div className="adm-field"><label className="adm-label">Key</label><input className="adm-input" required pattern="[a-z0-9-]+" placeholder="e.g. landing-hero-cover" value={mediaForm.key} onChange={e=>setMediaForm(s=>({...s,key:e.target.value}))}/></div>
                  <div className="adm-field"><label className="adm-label">Alt Text</label><input className="adm-input" placeholder="Describe the image" value={mediaForm.alt} onChange={e=>setMediaForm(s=>({...s,alt:e.target.value}))}/></div>
                  <div className="adm-field adm-field-full"><label className="adm-label">Public URL or path</label><input className="adm-input" required placeholder="https://cdn…/photo.jpg or /hero.jpg" value={mediaForm.publicUrl} onChange={e=>setMediaForm(s=>({...s,publicUrl:e.target.value}))}/></div>
                </div>
                <button className="adm-btn adm-btn-primary" style={{marginTop:'1rem'}} disabled={busy} type="submit">Register</button>
              </form>
            </div>
          </div>
        </>
      )}

      {cmsSubTab==='offers' && (
        <>
          <div className="adm-card" style={{marginBottom:'1.5rem'}}>
            <div className="adm-card-header"><h2 className="adm-card-title">Ticker lines ({offers.length})</h2></div>
            <p style={{fontSize:'0.84rem',color:'#6B7280',margin:'0 1.5rem 1rem'}}>
              Short promo messages for guests booking online: everyone sees lines scoped to &quot;All units&quot;; lines tied to a
              specific unit appear only when that unit is booked. Only &quot;All units&quot; offers appear on the homepage ticker.
            </p>
            {offers.length===0
              ? <div className="adm-empty"><EditI size={28}/>No offers yet — add one below.</div>
              : offers.map(o=>(
                  <div key={o.id} style={{borderBottom:'1px solid #F3F4F6',padding:'1rem 1.5rem'}}>
                    {editOffer===o.id ? (
                      <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                        <input className="adm-input" value={editOfferPatch.label} onChange={e=>setEditOfferPatch(x=>({...x,label:e.target.value}))} placeholder="Offer text" maxLength={500}/>
                        <div className="adm-form-grid">
                          <div className="adm-field"><label className="adm-label">Sort order</label><input className="adm-input" type="number" value={editOfferPatch.sortOrder} onChange={e=>setEditOfferPatch(x=>({...x,sortOrder:e.target.value}))}/></div>
                        </div>
                        <label className="adm-toggle-row"><input type="checkbox" checked={editOfferPatch.published} onChange={e=>setEditOfferPatch(x=>({...x,published:e.target.checked}))}/>Published on landing</label>
                        <div className="adm-field adm-field-full">
                          <label className="adm-label">Applies to</label>
                          <select className="adm-select" value={editOfferPatch.rentableUnitId} onChange={e=>setEditOfferPatch(x=>({...x,rentableUnitId:e.target.value}))}>
                            <option value="">All units + homepage ticker</option>
                            {allUnits.map(u=>(
                              <option key={u.id} value={u.id}>{u.propertyName} — {u.name}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                          <button className="adm-btn adm-btn-primary adm-btn-sm" type="button" onClick={async()=>{
                            const sortOrder = parseInt(editOfferPatch.sortOrder,10);
                            if (Number.isNaN(sortOrder)) { notify('Sort order must be a number.',false); return; }
                            await apiFetch(`${base}/cms/offers/${encodeURIComponent(o.id)}`,{method:'PATCH',body:JSON.stringify({
                              label:editOfferPatch.label.trim(),
                              sortOrder,
                              published:editOfferPatch.published,
                              rentableUnitId: editOfferPatch.rentableUnitId === '' ? null : editOfferPatch.rentableUnitId,
                            })});
                            setEditOffer(null); await loadCms(); notify('Offer saved.');
                          }}>Save</button>
                          <button className="adm-btn adm-btn-ghost adm-btn-sm" type="button" onClick={()=>setEditOffer(null)}>Cancel</button>
                          <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{color:'#B91C1C'}} type="button" onClick={async()=>{
                            if (!confirm('Delete this offer?')) return;
                            await apiFetch(`${base}/cms/offers/${encodeURIComponent(o.id)}`,{method:'DELETE'});
                            setEditOffer(null); await loadCms(); notify('Offer deleted.');
                          }}>Delete</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'1rem'}}>
                        <div>
                          <strong style={{fontSize:'0.95rem'}}>{o.label}</strong>
                          {!o.published&&<span className="adm-badge adm-badge-yellow" style={{marginLeft:'0.5rem'}}>Hidden</span>}
                          <p style={{margin:'0.35rem 0 0',fontSize:'0.84rem',color:'#6B7280'}}>
                            Sort: {o.sortOrder}
                            {' · '}
                            <span style={{color:o.rentableUnitId?'#4B5563':'#059669'}}>
                              {o.rentableUnitId ? (allUnits.find(u=>u.id===o.rentableUnitId)?.name ?? 'Unit') : 'All units'}
                            </span>
                          </p>
                        </div>
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" type="button" onClick={()=>{setEditOffer(o.id);setEditOfferPatch({label:o.label,sortOrder:String(o.sortOrder),published:o.published,rentableUnitId:o.rentableUnitId??''});}}>Edit</button>
                      </div>
                    )}
                  </div>
                ))}
          </div>
          <div className="adm-card">
            <div className="adm-card-header"><h2 className="adm-card-title">Add offer</h2></div>
            <div className="adm-card-body">
              <form onSubmit={async e=>{
                e.preventDefault(); setBusy(true);
                const sortOrder = parseInt(offerForm.sortOrder,10);
                if (Number.isNaN(sortOrder)) { setBusy(false); notify('Sort order must be a number.',false); return; }
                const r = await apiFetch(`${base}/cms/offers`,{method:'POST',body:JSON.stringify({
                  label:offerForm.label.trim(),
                  sortOrder,
                  published:offerForm.published,
                  rentableUnitId: offerForm.rentableUnitId === '' ? null : offerForm.rentableUnitId,
                })});
                setBusy(false); if(!r) return;
                setOfferForm({label:'',sortOrder:String(offers.length),published:true,rentableUnitId:''}); await loadCms(); notify('Offer added.');
              }}>
                <div className="adm-form-grid">
                  <div className="adm-field adm-field-full"><label className="adm-label">Ticker text</label><input className="adm-input" required maxLength={500} placeholder="e.g. Mon–Thu: 15% off on direct bookings" value={offerForm.label} onChange={e=>setOfferForm(s=>({...s,label:e.target.value}))}/></div>
                  <div className="adm-field"><label className="adm-label">Sort order</label><input className="adm-input" type="number" required value={offerForm.sortOrder} onChange={e=>setOfferForm(s=>({...s,sortOrder:e.target.value}))}/></div>
                  <div className="adm-field adm-field-full">
                    <label className="adm-label">Applies to</label>
                    <select className="adm-select" value={offerForm.rentableUnitId} onChange={e=>setOfferForm(s=>({...s,rentableUnitId:e.target.value}))}>
                      <option value="">All units + homepage ticker</option>
                      {allUnits.map(u=>(
                        <option key={u.id} value={u.id}>{u.propertyName} — {u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="adm-field adm-field-full"><label className="adm-toggle-row"><input type="checkbox" checked={offerForm.published} onChange={e=>setOfferForm(s=>({...s,published:e.target.checked}))}/>Published on landing</label></div>
                </div>
                <button className="adm-btn adm-btn-primary" style={{marginTop:'1rem'}} disabled={busy} type="submit">Add offer</button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );

  /* ─── Channels ─── */
  const [chUnit, setChUnit] = useState('');
  const [chForm, setChForm] = useState({
    channel: 'AIRBNB',
    inboundIcalUrl: '',
    externalLabel: '',
    airbnbHostAccountId: '',
  });
  const [abForm, setAbForm] = useState({ label: '', notes: '' });
  const [abEditing, setAbEditing] = useState<{ id: string; label: string; notes: string } | null>(null);

  const TabChannels = (
    <>
      <div className="adm-alert adm-alert-error" style={{ marginBottom: '1.25rem', fontSize: '0.84rem', lineHeight: 1.55 }}>
        <strong>Calendar URLs go here:</strong>{' '}
        <a href="#connect-ical-feed" style={{ fontWeight: 700, color: 'inherit', textDecoration: 'underline' }}>
          Connect channel / add iCal feed
        </a>{' '}
        → choose your unit → paste Airbnb&apos;s <strong>Export calendar</strong> link into <strong>Inbound iCal URL</strong>.
        The <strong>Airbnb profiles</strong> block below is <em>not</em> for .ics links—it&apos;s only optional grouping labels.
      </div>

      <div className="adm-card" style={{ marginBottom: '1.5rem' }}>
        <div className="adm-card-header">
          <h2 className="adm-card-title">Airbnb profiles (optional grouping)</h2>
        </div>
        <div className="adm-card-body">
          <p style={{ fontSize: '0.84rem', color: '#6B7280', marginTop: 0 }}>
            Optional labels for organising feeds when you run multiple Airbnb accounts or entities. Paste calendar URLs under{' '}
            <a href="#connect-ical-feed" style={{ fontWeight: 600, color: 'var(--sage)' }}>
              Connect channel / add iCal feed
            </a>
            . Availability sync is <strong>iCal only</strong>: inbound pulls update Mavu; outbound URLs push busy dates when Airbnb or Booking imports your feed.
          </p>
          {!abEditing ? (
            <form
              style={{ marginTop: '1rem' }}
              onSubmit={async (e) => {
                e.preventDefault();
                const label = abForm.label.trim();
                if (!label) {
                  notify('Enter a profile name.', false);
                  return;
                }
                setBusy(true);
                const r = await apiFetch(`${base}/airbnb-host-accounts`, {
                  method: 'POST',
                  body: JSON.stringify({ label, notes: abForm.notes.trim() || null }),
                });
                setBusy(false);
                if (!r) return;
                setAbForm({ label: '', notes: '' });
                await loadAirbnb();
                notify('Airbnb profile created.');
              }}
            >
              <div className="adm-form-grid">
                <div className="adm-field adm-field-full">
                  <label className="adm-label">Profile name</label>
                  <input
                    className="adm-input"
                    required
                    maxLength={120}
                    placeholder='e.g. "Personal Airbnb" or "Oak Villa LLC"'
                    value={abForm.label}
                    onChange={(e) => setAbForm((s) => ({ ...s, label: e.target.value }))}
                  />
                </div>
                <div className="adm-field adm-field-full">
                  <label className="adm-label">Notes (optional)</label>
                  <textarea
                    className="adm-input"
                    rows={2}
                    maxLength={2000}
                    placeholder="Short notes only—not for calendar (.ics) URLs"
                    value={abForm.notes}
                    onChange={(e) => setAbForm((s) => ({ ...s, notes: e.target.value }))}
                  />
                </div>
              </div>
              <button className="adm-btn adm-btn-primary" style={{ marginTop: '0.75rem' }} disabled={busy} type="submit">
                Add Airbnb profile
              </button>
            </form>
          ) : (
            <form
              style={{ marginTop: '1rem' }}
              onSubmit={async (e) => {
                e.preventDefault();
                const label = abEditing.label.trim();
                if (!label) {
                  notify('Profile name required.', false);
                  return;
                }
                setBusy(true);
                const r = await apiFetch(`${base}/airbnb-host-accounts/${abEditing.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ label, notes: abEditing.notes.trim() || null }),
                });
                setBusy(false);
                if (!r) return;
                setAbEditing(null);
                await loadAirbnb();
                notify('Profile updated.');
              }}
            >
              <div className="adm-form-grid">
                <div className="adm-field adm-field-full">
                  <label className="adm-label">Profile name</label>
                  <input
                    className="adm-input"
                    required
                    maxLength={120}
                    value={abEditing.label}
                    onChange={(e) => setAbEditing((s) => (s ? { ...s, label: e.target.value } : s))}
                  />
                </div>
                <div className="adm-field adm-field-full">
                  <label className="adm-label">Notes</label>
                  <textarea
                    className="adm-input"
                    rows={2}
                    maxLength={8000}
                    value={abEditing.notes}
                    onChange={(e) => setAbEditing((s) => (s ? { ...s, notes: e.target.value } : s))}
                  />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="adm-btn adm-btn-primary" disabled={busy} type="submit">
                  Save profile
                </button>
                <button className="adm-btn adm-btn-ghost" disabled={busy} type="button" onClick={() => setAbEditing(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          <div className="adm-divider" />
          {airbnbAccounts.length === 0 ? (
            <p style={{ fontSize: '0.84rem', color: '#9CA3AF', marginBottom: 0 }}>
              No profiles yet—optional. Create one if you want feeds tagged under a label in the table below.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {airbnbAccounts.map((a) => (
                <li
                  key={a.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    padding: '0.65rem 0',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{a.label}</div>
                    {a.notes ? (
                      <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>{a.notes}</p>
                    ) : null}
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: '0.35rem 0 0' }}>
                      {a.listingLinkCount} iCal feed{a.listingLinkCount === 1 ? '' : 's'} tagged
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="adm-btn adm-btn-ghost adm-btn-sm"
                      onClick={() => setAbEditing({ id: a.id, label: a.label, notes: a.notes ?? '' })}
                      disabled={busy || !!abEditing}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="adm-btn adm-btn-ghost adm-btn-sm"
                      style={{ color: '#B91C1C' }}
                      disabled={busy}
                      onClick={async () => {
                        if (!globalThis.confirm(`Remove profile “${a.label}”? iCal feeds remain; they are detached from this profile.`)) return;
                        setBusy(true);
                        await apiFetch(`${base}/airbnb-host-accounts/${a.id}`, { method: 'DELETE' });
                        setBusy(false);
                        await loadAirbnb();
                        await loadProps();
                        notify('Profile removed.');
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="adm-card" style={{ marginBottom: '1.5rem' }}>
        <div className="adm-card-header">
          <h2 className="adm-card-title">All iCal feeds</h2>
        </div>
        <div className="adm-card-body" style={{ paddingBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.84rem', color: '#6B7280', marginTop: 0 }}>
            Two-way calendar sync uses iCal only: <strong>Inbound</strong> pulls below update Mavu when Airbnb or Booking changes; reservations removed there are cancelled here after the next sync.
            <strong> Outbound</strong> URLs refresh whenever Airbnb/Booking re-fetch them (plus immediately on each pull for display consistency). Production also runs a worker every ~15 minutes if Redis is configured.
          </p>
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            disabled={busy}
            style={{ marginTop: '0.5rem' }}
            onClick={async () => {
              setBusy(true);
              const r = await apiFetch<{
                processed: number;
                updated: number;
                removed: number;
                links: number;
                errors: number;
              }>(`${base}/channels/sync-ical`, { method: 'POST' });
              setBusy(false);
              if (!r) return;
              await loadProps();
              notify(
                `Pull complete: ${r.links} feed(s), ${r.updated} upserted, ${r.removed} removed (no longer on remote calendar), ${r.errors} fetch error(s).`,
              );
            }}
          >
            Sync calendars now
          </button>
        </div>
        {allUnits.length === 0 ? (
          <div className="adm-empty">
            <LinkI size={28} />Set up a property and unit first.
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Unit</th>
                <th>Airbnb profile</th>
                <th>Channel</th>
                <th>Inbound iCal</th>
                <th>Outbound feed URL</th>
              </tr>
            </thead>
            <tbody>
              {properties.flatMap((p) =>
                p.units.flatMap((u) =>
                  u.listingLinks.map((l) => (
                    <tr key={l.id}>
                      <td>{p.name}</td>
                      <td>
                        <span className="adm-badge adm-badge-gray">{u.name}</span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {l.airbnbHostAccount ? (
                          <span className="adm-badge adm-badge-green">{l.airbnbHostAccount.label}</span>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className="adm-badge adm-badge-blue">{l.channel}</span>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>
                        {l.inboundIcalUrl ? (
                          <a href={l.inboundIcalUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--sage)' }}>
                            Linked ↗
                          </a>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>—</span>
                        )}
                      </td>
                      <td>
                        <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                          {api}/feeds/{l.outboundFeedSlug}.ics
                        </code>
                      </td>
                    </tr>
                  )),
                ),
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="adm-card" id="connect-ical-feed" style={{ marginBottom: '1.5rem', scrollMarginTop: '6rem' }}>
        <div className="adm-card-header">
          <h2 className="adm-card-title">Connect channel / add iCal feed</h2>
        </div>
        <div className="adm-card-body">
          <p style={{ fontSize: '0.84rem', color: '#6B7280', marginTop: 0 }}>
            Paste the <strong>import</strong> calendar link from Airbnb (Availability → Availability settings → Airbnb calendar sync → Export calendar). Paste the{' '}
            <strong>Mavu outbound URL</strong> back into Airbnb as the import link under “Guests who can&apos;t book can still see dates” → Linked calendars, when you&apos;re
            ready for two-way calendar visibility.
          </p>
          {allUnits.length === 0 && <div className="adm-alert adm-alert-error">Create a property and unit first.</div>}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!chUnit) {
                notify('Select a unit.', false);
                return;
              }
              if (chForm.channel === 'AIRBNB' && !chForm.inboundIcalUrl.trim()) {
                notify('Paste Airbnb’s Inbound iCal URL (Export calendar link from Airbnb).', false);
                return;
              }
              const payload: Record<string, unknown> = {
                channel: chForm.channel,
                inboundIcalUrl: chForm.inboundIcalUrl || undefined,
                externalLabel: chForm.externalLabel || undefined,
              };
              if (chForm.airbnbHostAccountId) payload.airbnbHostAccountId = chForm.airbnbHostAccountId;
              setBusy(true);
              const r = await apiFetch(`${base}/rentable-units/${chUnit}/listing-links`, {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              setBusy(false);
              if (!r) return;
              setChUnit('');
              setChForm({ channel: 'AIRBNB', inboundIcalUrl: '', externalLabel: '', airbnbHostAccountId: '' });
              await loadProps();
              await loadAirbnb();
              notify('Channel linked!');
            }}
          >
            <div className="adm-form-grid">
              <div className="adm-field adm-field-full">
                <label className="adm-label">Unit</label>
                <select className="adm-select" value={chUnit} required onChange={(e) => setChUnit(e.target.value)}>
                  <option value="">— select unit —</option>
                  {properties.map((p) => (
                    <optgroup key={p.id} label={p.name}>
                      {p.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="adm-field adm-field-full">
                <label className="adm-label">Airbnb profile (optional)</label>
                <select
                  className="adm-select"
                  value={chForm.airbnbHostAccountId}
                  onChange={(e) => setChForm((s) => ({ ...s, airbnbHostAccountId: e.target.value }))}
                >
                  <option value="">— none —</option>
                  {airbnbAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.listingLinkCount} feeds)
                    </option>
                  ))}
                </select>
              </div>
              <div className="adm-field">
                <label className="adm-label">Channel</label>
                <select className="adm-select" value={chForm.channel} onChange={(e) => setChForm((s) => ({ ...s, channel: e.target.value }))}>
                  {['AIRBNB', 'BOOKING_COM', 'VRBO', 'DIRECT', 'OTHER'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="adm-field">
                <label className="adm-label">Label (optional)</label>
                <input
                  className="adm-input"
                  value={chForm.externalLabel}
                  placeholder="e.g. 1BHK listing"
                  onChange={(e) => setChForm((s) => ({ ...s, externalLabel: e.target.value }))}
                />
              </div>
              <div className="adm-field adm-field-full">
                <label className="adm-label">Inbound iCal URL</label>
                <input
                  className="adm-input"
                  type="url"
                  value={chForm.inboundIcalUrl}
                  placeholder="https://www.airbnb.com/calendar/ical/…"
                  onChange={(e) => setChForm((s) => ({ ...s, inboundIcalUrl: e.target.value }))}
                />
              </div>
            </div>
            <button className="adm-btn adm-btn-primary" style={{ marginTop: '1rem' }} disabled={busy || !allUnits.length} type="submit">
              Connect channel
            </button>
          </form>
        </div>
      </div>
    </>
  );

  /* ─── Team ─── */
  const [invForm, setInvForm] = useState({email:'',role:'CARETAKER'});

  const TabTeam = (
    <div className="adm-card">
      <div className="adm-card-header"><h2 className="adm-card-title">Invite Team Member</h2></div>
      <div className="adm-card-body">
        <p style={{fontSize:'0.84rem',color:'#6B7280',marginTop:0}}>Send an invite link to a caretaker, staff member, or admin. They&apos;ll receive a link to set up their account.</p>
        <form onSubmit={async e=>{
          e.preventDefault(); setBusy(true);
          const r = await apiFetch<{invite:{token:string;expiresAt:string}}>(`${base}/invites`,{method:'POST',body:JSON.stringify({email:invForm.email,role:invForm.role})});
          setBusy(false); if(!r) return;
          const link = `${window.location.origin}/invites/${r.invite.token}/accept`;
          notify(`Invite created! Share this link: ${link}`);
          setInvForm({email:'',role:'CARETAKER'});
        }}>
          <div className="adm-form-grid">
            <div className="adm-field">
              <label className="adm-label">Email Address</label>
              <input className="adm-input" type="email" required placeholder="caretaker@example.com" value={invForm.email} onChange={e=>setInvForm(s=>({...s,email:e.target.value}))}/>
            </div>
            <div className="adm-field">
              <label className="adm-label">Role</label>
              <select className="adm-select" value={invForm.role} onChange={e=>setInvForm(s=>({...s,role:e.target.value}))}>
                <option value="CARETAKER">Caretaker (view bookings, block dates)</option>
                <option value="STAFF_BLOCK">Staff Block (block dates only)</option>
                <option value="ADMIN">Admin (full access except owner actions)</option>
              </select>
            </div>
          </div>
          <button className="adm-btn adm-btn-primary" style={{marginTop:'1rem'}} disabled={busy} type="submit">Send Invite</button>
        </form>
        <div className="adm-divider"/>
        <h3 style={{fontSize:'0.875rem',fontWeight:700,marginBottom:'0.5rem',color:'#374151'}}>Role Permissions</h3>
        <table className="adm-table" style={{fontSize:'0.82rem'}}>
          <thead><tr><th>Role</th><th>View Bookings</th><th>Create Bookings</th><th>Block Dates</th><th>Manage CMS</th></tr></thead>
          <tbody>
            <tr><td><strong>Owner</strong></td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
            <tr><td><strong>Admin</strong></td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
            <tr><td><strong>Caretaker</strong></td><td>✅</td><td>—</td><td>—</td><td>—</td></tr>
            <tr><td><strong>Staff Block</strong></td><td>—</td><td>—</td><td>✅</td><td>—</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const TAB_TITLES: Record<string, string> = { overview:'Overview', properties:'Properties & Units', bookings:'Bookings', reviews:'Guest Reviews', cms:'CMS / Content', channels:'Channels & iCal', team:'Team' };

  return (
    <div className="adm-root">
      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-brand">
          <Link href="/" className="adm-sidebar-brand-name" aria-label="Mavu Days">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Mavu Days" style={{ height: 32, width: 'auto', display: 'block' }} />
          </Link>
          <span className="adm-sidebar-brand-sub">Host Dashboard</span>
        </div>
        <nav className="adm-nav">
          <span className="adm-nav-section">Menu</span>
          {NAV.map(({key,label,icon:Icon})=>(
            <button key={key} className={`adm-nav-item${tab===key?' active':''}`} onClick={()=>setTab(key)} type="button">
              <Icon size={16}/>{label}
            </button>
          ))}
          <span className="adm-nav-section">Site</span>
          <Link href="/" className="adm-nav-item" target="_blank" rel="noreferrer"><ExternalI size={16}/>View Website</Link>
        </nav>
        <div className="adm-sidebar-footer">
          <span className="adm-nav-item" style={{color:'rgba(255,255,255,0.4)',fontSize:'0.72rem',padding:'0.35rem 0.85rem',cursor:'default'}}>{slug}</span>
          <button type="button" className="adm-nav-item" style={{color:'#F87171'}} onClick={()=>{localStorage.removeItem('mavu_token');router.push('/login');}}>
            <LogoutI size={16}/>Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="adm-main">
        <div className="adm-topbar">
          <span className="adm-topbar-title">{TAB_TITLES[tab]}</span>
          <div className="adm-topbar-actions">
            <span className="adm-topbar-org">{slug}</span>
            <Link href="/" className="adm-btn adm-btn-ghost adm-btn-sm" target="_blank">View Site ↗</Link>
          </div>
        </div>
        <div className="adm-content">
          {toast && <div className={`adm-alert ${toast.ok?'adm-alert-success':'adm-alert-error'}`}>{toToastMessage(toast.msg)}</div>}
          {tab==='overview'   && TabOverview}
          {tab==='properties' && TabProperties}
          {tab==='bookings'   && TabBookings}
          {tab==='reviews'    && TabReviews}
          {tab==='cms'        && TabCms}
          {tab==='channels'   && TabChannels}
          {tab==='team'       && TabTeam}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Sub-components ─────────────────── */
function ConfirmBtn({ id, base, apiFetch, reload, notify }: {
  id: string; base: string;
  apiFetch: <T>(path: string, opts?: RequestInit) => Promise<T | null>;
  reload: () => Promise<void>; notify: (m: string, ok?: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button className="adm-btn adm-btn-yellow adm-btn-sm" disabled={busy} type="button" onClick={async () => {
      setBusy(true);
      await apiFetch(`${base}/bookings/${id}/confirm`, { method: 'POST' });
      await reload(); notify('Booking confirmed.'); setBusy(false);
    }}>Confirm</button>
  );
}

function StatusBadge({ s }: { s: string }) {
  const m: Record<string, string> = { CONFIRMED:'adm-badge-green', PENDING:'adm-badge-yellow', CANCELLED:'adm-badge-red', BLOCKED:'adm-badge-gray' };
  return <span className={`adm-badge ${m[s]??'adm-badge-blue'}`}>{s}</span>;
}

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }); }

/* ─────────────────── Icons ─────────────────── */
function GridI({ size=20 }:{size?:number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
function HomeI({ size=20 }:{size?:number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function CalI({ size=20 }:{size?:number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>; }
function StarI({ size=20 }:{size?:number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function EditI({ size=20 }:{size?:number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function LinkI({ size=20 }:{size?:number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>; }
function UsersI({ size=20 }:{size?:number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function ExternalI({ size=20 }:{size?:number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>; }
function LogoutI({ size=20 }:{size?:number}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
