'use client';

export type SiteAnalyticsSummary = {
  today: { pageviews: number; visitors: number };
  last7Days: { pageviews: number; visitors: number };
  last30Days: { pageviews: number; visitors: number };
  topPages: { path: string; views: number }[];
  daily: { date: string; pageviews: number; visitors: number }[];
};

export type SiteVisitRow = {
  id: string;
  createdAt: string;
  path: string;
  referrerHost: string | null;
  deviceClass: string | null;
  visitorLabel: string | null;
};

function fmtShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function deviceLabel(d: string | null): string {
  if (!d) return '—';
  if (d === 'mobile') return 'Mobile';
  if (d === 'tablet') return 'Tablet';
  if (d === 'desktop') return 'Desktop';
  return d;
}

function maxDailyVisitors(daily: SiteAnalyticsSummary['daily']): number {
  return Math.max(1, ...daily.map((d) => d.visitors));
}

export function SiteInsightsOverview({
  analytics,
  onViewAll,
}: {
  analytics: SiteAnalyticsSummary | null | undefined;
  onViewAll?: () => void;
}) {
  if (!analytics) {
    return (
      <div className="adm-card adm-insights-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Website insights</h2>
        </div>
        <div className="adm-card-body">
          <p className="adm-insights-empty">Visitor stats will appear after the marketing site records page views.</p>
        </div>
      </div>
    );
  }

  const maxVis = maxDailyVisitors(analytics.daily);

  return (
    <div className="adm-card adm-insights-card">
      <div className="adm-card-header">
        <h2 className="adm-card-title">Website insights</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="adm-insights-badge">Last 14 days</span>
          {onViewAll ? (
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onViewAll}>
              All visits →
            </button>
          ) : null}
        </div>
      </div>
      <div className="adm-card-body">
        <div className="adm-stats adm-insights-stats">
          {[
            { label: 'Visitors today', value: analytics.today.visitors, sub: `${analytics.today.pageviews} page views` },
            { label: 'Visitors (7d)', value: analytics.last7Days.visitors, sub: `${analytics.last7Days.pageviews} page views` },
            { label: 'Visitors (30d)', value: analytics.last30Days.visitors, sub: `${analytics.last30Days.pageviews} page views` },
          ].map((s) => (
            <div key={s.label} className="adm-stat-card adm-stat-accent-purple">
              <span className="adm-stat-label">{s.label}</span>
              <span className="adm-stat-value">{s.value}</span>
              <span className="adm-stat-sub">{s.sub}</span>
            </div>
          ))}
        </div>

        <div className="adm-insights-grid">
          <div className="adm-insights-panel">
            <h3 className="adm-insights-panel-title">Daily visitors</h3>
            <div className="adm-insights-bars" role="img" aria-label="Daily unique visitors for the last 14 days">
              {analytics.daily.map((d) => (
                <div key={d.date} className="adm-insights-bar-col" title={`${fmtShortDate(d.date)}: ${d.visitors} visitors`}>
                  <div
                    className="adm-insights-bar"
                    style={{ height: `${Math.max(4, Math.round((d.visitors / maxVis) * 100))}%` }}
                  />
                  <span className="adm-insights-bar-label">{fmtShortDate(d.date).replace(/\s+\d{4}$/, '')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="adm-insights-panel">
            <h3 className="adm-insights-panel-title">Top pages (7 days)</h3>
            {analytics.topPages.length ? (
              <ul className="adm-insights-top-pages">
                {analytics.topPages.map((p) => (
                  <li key={p.path}>
                    <span className="adm-insights-path">{p.path}</span>
                    <span className="adm-insights-views">{p.views}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-insights-empty">No page views yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SiteVisitorsTab({
  visits,
  total,
  uniqueVisitors,
  days,
  loading,
  onDaysChange,
  onRefresh,
  onOpenOverview,
}: {
  visits: SiteVisitRow[];
  total: number;
  uniqueVisitors: number;
  days: number;
  loading: boolean;
  onDaysChange: (days: number) => void;
  onRefresh?: () => void;
  onOpenOverview?: () => void;
}) {
  return (
    <>
      <div className="adm-stats">
        {[
          { label: 'Page views', value: total, sub: `last ${days} day${days === 1 ? '' : 's'}` },
          { label: 'Unique visitors', value: uniqueVisitors, sub: `last ${days} day${days === 1 ? '' : 's'}` },
        ].map((s) => (
          <div key={s.label} className="adm-stat-card adm-stat-accent-purple">
            <span className="adm-stat-label">{s.label}</span>
            <span className="adm-stat-value">{s.value}</span>
            <span className="adm-stat-sub">{s.sub}</span>
          </div>
        ))}
      </div>

      <div className="adm-card">
        <div className="adm-card-header">
          <h2 className="adm-card-title">Recent visits</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="adm-select adm-select-sm"
              value={String(days)}
              disabled={loading}
              onChange={(e) => onDaysChange(Number(e.target.value))}
              aria-label="Time range"
            >
              <option value="1">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
            {onRefresh ? (
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" disabled={loading} onClick={onRefresh}>
                Refresh
              </button>
            ) : null}
            {onOpenOverview ? (
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={onOpenOverview}>
                Overview chart →
              </button>
            ) : null}
          </div>
        </div>
        {loading ? (
          <div className="adm-empty">Loading visits…</div>
        ) : visits.length ? (
          <table className="adm-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Page</th>
                <th>Referrer</th>
                <th>Device</th>
                <th>Visitor</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id}>
                  <td>{fmtDateTime(v.createdAt)}</td>
                  <td>
                    <code className="adm-insights-path-code">{v.path}</code>
                  </td>
                  <td>{v.referrerHost ?? 'Direct / none'}</td>
                  <td>{deviceLabel(v.deviceClass)}</td>
                  <td>{v.visitorLabel ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="adm-empty">
            No visits recorded yet. Page views are counted from the public marketing site (not admin).
          </div>
        )}
      </div>
    </>
  );
}
