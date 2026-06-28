import type { PrismaClient } from '@prisma/client';

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|pingdom|uptime/i;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgoUtc(days: number): Date {
  const now = new Date();
  const start = startOfUtcDay(now);
  start.setUTCDate(start.getUTCDate() - days);
  return start;
}

export function classifyDevice(userAgent: string | undefined): string | null {
  if (!userAgent?.trim()) return 'unknown';
  const ua = userAgent.trim();
  if (BOT_UA.test(ua)) return 'bot';
  const l = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(l)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(l)) return 'mobile';
  return 'desktop';
}

export function sanitizeAnalyticsPath(raw: string): string {
  const t = raw.trim().slice(0, 500);
  if (!t.startsWith('/')) return `/${t}`.slice(0, 500);
  return t;
}

export function referrerHostFromUrl(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  try {
    const u = new URL(raw.trim());
    return u.hostname.slice(0, 200) || null;
  } catch {
    return null;
  }
}

export function sanitizeVisitorKey(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const k = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  return k.length >= 8 ? k : null;
}

export async function recordSitePageView(
  prisma: PrismaClient,
  args: {
    organizationId: string;
    path: string;
    referrer?: string | null;
    visitorKey?: string | null;
    userAgent?: string | null;
  },
): Promise<{ recorded: boolean }> {
  const deviceClass = classifyDevice(args.userAgent ?? undefined);
  if (deviceClass === 'bot') return { recorded: false };

  await prisma.sitePageView.create({
    data: {
      organizationId: args.organizationId,
      path: sanitizeAnalyticsPath(args.path),
      referrerHost: referrerHostFromUrl(args.referrer),
      visitorKey: sanitizeVisitorKey(args.visitorKey),
      deviceClass,
    },
  });
  return { recorded: true };
}

async function countPageviews(prisma: PrismaClient, organizationId: string, since: Date): Promise<number> {
  return prisma.sitePageView.count({
    where: { organizationId, createdAt: { gte: since } },
  });
}

async function countUniqueVisitors(prisma: PrismaClient, organizationId: string, since: Date): Promise<number> {
  const rows = await prisma.sitePageView.groupBy({
    by: ['visitorKey'],
    where: {
      organizationId,
      createdAt: { gte: since },
      visitorKey: { not: null },
    },
  });
  return rows.length;
}

export async function getSiteAnalyticsSummary(prisma: PrismaClient, organizationId: string) {
  const todayStart = startOfUtcDay(new Date());
  const sevenDays = daysAgoUtc(6);
  const thirtyDays = daysAgoUtc(29);

  const [todayPv, todayVis, w7Pv, w7Vis, d30Pv, d30Vis, topPages, dailyRows] = await Promise.all([
    countPageviews(prisma, organizationId, todayStart),
    countUniqueVisitors(prisma, organizationId, todayStart),
    countPageviews(prisma, organizationId, sevenDays),
    countUniqueVisitors(prisma, organizationId, sevenDays),
    countPageviews(prisma, organizationId, thirtyDays),
    countUniqueVisitors(prisma, organizationId, thirtyDays),
    prisma.sitePageView.groupBy({
      by: ['path'],
      where: { organizationId, createdAt: { gte: sevenDays } },
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: 6,
    }),
    prisma.sitePageView.findMany({
      where: { organizationId, createdAt: { gte: daysAgoUtc(13) } },
      select: { createdAt: true, visitorKey: true },
    }),
  ]);

  const dailyMap = new Map<string, { pageviews: number; visitorKeys: Set<string> }>();
  for (let i = 13; i >= 0; i--) {
    const d = daysAgoUtc(i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { pageviews: 0, visitorKeys: new Set() });
  }
  for (const row of dailyRows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    const bucket = dailyMap.get(key);
    if (!bucket) continue;
    bucket.pageviews += 1;
    if (row.visitorKey) bucket.visitorKeys.add(row.visitorKey);
  }

  const daily = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      pageviews: v.pageviews,
      visitors: v.visitorKeys.size,
    }));

  return {
    today: { pageviews: todayPv, visitors: todayVis },
    last7Days: { pageviews: w7Pv, visitors: w7Vis },
    last30Days: { pageviews: d30Pv, visitors: d30Vis },
    topPages: topPages.map((p) => ({ path: p.path, views: p._count.path })),
    daily,
  };
}

export async function listRecentSiteVisits(
  prisma: PrismaClient,
  organizationId: string,
  opts: { days?: number; limit?: number; offset?: number },
) {
  const days = Math.min(Math.max(opts.days ?? 7, 1), 90);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const since = daysAgoUtc(days - 1);

  const [rows, total, uniqueRows] = await Promise.all([
    prisma.sitePageView.findMany({
      where: { organizationId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        createdAt: true,
        path: true,
        referrerHost: true,
        deviceClass: true,
        visitorKey: true,
      },
    }),
    prisma.sitePageView.count({
      where: { organizationId, createdAt: { gte: since } },
    }),
    prisma.sitePageView.groupBy({
      by: ['visitorKey'],
      where: {
        organizationId,
        createdAt: { gte: since },
        visitorKey: { not: null },
      },
    }),
  ]);

  return {
    days,
    total,
    uniqueVisitors: uniqueRows.length,
    visits: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      path: r.path,
      referrerHost: r.referrerHost,
      deviceClass: r.deviceClass,
      visitorLabel: r.visitorKey ? `…${r.visitorKey.slice(-8)}` : null,
    })),
  };
}
