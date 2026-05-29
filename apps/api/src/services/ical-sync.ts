import { BookingSource, BookingStatus, type PrismaClient } from '@prisma/client';
import { IcalChannelConnector } from '@mavu/channels-ical';
import type { NotificationPublisher } from '../notifications/publisher.js';
import { upsertConfirmedBooking } from '../services/booking-flow.js';

/** Bookings created from inbound `.ics` pulls (Airbnb export, Booking.com export, …). */
export const ICAL_INGEST_PROVIDER = 'ical-ingest';

const connector = new IcalChannelConnector();

/** Airbnb / Booking exports often hide the real name in SUMMARY. */
function extractGuestFromIcsDescription(desc: string | undefined): string | null {
  if (!desc) return null;
  const lines = desc.split(/\r?\n/);
  for (const line of lines) {
    const m =
      line.match(/^\s*Guest(?:'s)?\s+name\s*:\s*(.+)$/i) ??
      line.match(/^\s*Guest\s*:\s*(.+)$/i) ??
      line.match(/^\s*Reservation\s+for\s+(.+)$/i);
    const name = m?.[1]?.trim();
    if (name && name.length > 0 && name.length <= 200) return name;
  }
  return null;
}

function guestNameFromIcalEvent(ev: { summary?: string; description?: string }): string {
  const fromDesc = extractGuestFromIcsDescription(ev.description);
  if (fromDesc) return fromDesc;
  const s = (ev.summary ?? '').trim();
  if (!s) return 'Guest (calendar import)';
  if (/^reserved$/i.test(s)) return 'Guest (Airbnb — name not in export)';
  if (/airbnb/i.test(s) && /not\s*available/i.test(s)) return 'Guest (Airbnb — name not in export)';
  if (/not\s*available/i.test(s)) return 'Guest (calendar — name not in export)';
  return s;
}

function externalIdForEvent(link: { channel: string; id: string }, uid: string): string {
  return `${link.channel}:${link.id}:${uid}`;
}

/**
 * Cancel mirror bookings that no longer appear on this link's inbound calendar.
 * Only touches rows created via {@link ICAL_INGEST_PROVIDER} for this listing link.
 */
async function cancelStaleIcalBookingsForLink(
  prisma: PrismaClient,
  link: { id: string; channel: string; rentableUnitId: string },
  organizationId: string,
  wantedExternalIds: ReadonlySet<string>,
): Promise<number> {
  const prefix = `${link.channel}:${link.id}:`;
  const stale = await prisma.booking.findMany({
    where: {
      organizationId,
      rentableUnitId: link.rentableUnitId,
      externalProvider: ICAL_INGEST_PROVIDER,
      externalId: { startsWith: prefix },
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
    },
    select: { id: true, externalId: true, checkOutUtc: true },
  });

  let removed = 0;
  const nowMs = Date.now();
  for (const b of stale) {
    if (!b.externalId || wantedExternalIds.has(b.externalId)) continue;
    /**
     * Airbnb (and similar) feeds usually drop reservations after checkout. Treating those as
     * “removed” would cancel every completed stay on the next sync and wipe admin calendar history.
     * Only cancel mirrors that are still active/upcoming — real cancellations while the stay matters.
     */
    if (b.checkOutUtc.getTime() <= nowMs) continue;
    await prisma.$transaction(async (tx) => {
      await tx.availabilityBlock.deleteMany({ where: { bookingId: b.id } });
      await tx.booking.update({
        where: { id: b.id },
        data: { status: BookingStatus.CANCELLED },
      });
    });
    removed += 1;
  }
  return removed;
}

export type InboundIcalSyncResult = {
  processed: number;
  updated: number;
  removed: number;
  links: number;
  errors: number;
  /** Same inbound URL on multiple units — each stay is mirrored on every linked unit. */
  sharedInboundFeeds: { unitNames: string[] }[];
};

/**
 * Pull every inbound iCal URL, upsert blocked ranges as bookings, and cancel stale mirrors.
 *
 * Outbound sync is passive: OTAs fetch `/feeds/<slug>.ics` on their schedule.
 *
 * @param options.organizationId — if set, only listing links under this org are synced (admin trigger).
 */
export async function syncInboundIcals(
  prisma: PrismaClient,
  notify: NotificationPublisher,
  options?: { organizationId?: string },
): Promise<InboundIcalSyncResult> {
  const links = await prisma.listingLink.findMany({
    where: {
      inboundIcalUrl: { not: null },
      ...(options?.organizationId
        ? { rentableUnit: { property: { organizationId: options.organizationId } } }
        : {}),
    },
    include: {
      rentableUnit: { include: { property: true } },
    },
  });

  let processed = 0;
  let updated = 0;
  let removed = 0;
  let errors = 0;

  const urlToUnitNames = new Map<string, string[]>();
  for (const link of links) {
    if (!link.inboundIcalUrl) continue;
    const key = link.inboundIcalUrl.trim();
    const unitName = link.rentableUnit.name;
    const arr = urlToUnitNames.get(key) ?? [];
    arr.push(unitName);
    urlToUnitNames.set(key, arr);
  }
  const sharedInboundFeeds = [...urlToUnitNames.values()]
    .filter((names) => names.length > 1)
    .map((names) => ({ unitNames: [...new Set(names)] }));

  for (const link of links) {
    if (!link.inboundIcalUrl) continue;
    const orgId = link.rentableUnit.property.organizationId;

    try {
      const events = await connector.fetchExternalCalendar(link.inboundIcalUrl);
      await prisma.listingLink.update({
        where: { id: link.id },
        data: { lastIcalFetchedAt: new Date(), lastIcalFetchError: null },
      });

      const wantedExternalIds = new Set(events.map((ev) => externalIdForEvent(link, ev.uid)));

      for (const ev of events) {
        const externalId = externalIdForEvent(link, ev.uid);
        const existing = await prisma.booking.findFirst({
          where: { organizationId: orgId, externalProvider: ICAL_INGEST_PROVIDER, externalId },
          select: { id: true },
        });

        const res = await upsertConfirmedBooking(prisma, notify, {
          organizationId: orgId,
          rentableUnitId: link.rentableUnitId,
          checkInUtc: ev.startUtc,
          checkOutUtc: ev.endUtc,
          source: BookingSource.PLATFORM,
          externalProvider: ICAL_INGEST_PROVIDER,
          externalId,
          guestName: guestNameFromIcalEvent(ev),
          sendCaretakerNotifications: !existing,
        });

        if (res.ok) updated += 1;
        processed += 1;
      }

      removed += await cancelStaleIcalBookingsForLink(prisma, link, orgId, wantedExternalIds);
    } catch (e) {
      errors += 1;
      await prisma.listingLink.update({
        where: { id: link.id },
        data: {
          lastIcalFetchError: e instanceof Error ? e.message : 'Unknown error',
        },
      });
    }
  }

  return { processed, updated, removed, links: links.length, errors, sharedInboundFeeds };
}

/** Sync all orgs’ inbound links (used by BullMQ worker). */
export async function syncAllInboundIcals(prisma: PrismaClient, notify: NotificationPublisher) {
  return syncInboundIcals(prisma, notify);
}
