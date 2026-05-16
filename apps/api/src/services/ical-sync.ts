import { BookingSource, BookingStatus, type PrismaClient } from '@prisma/client';
import { IcalChannelConnector } from '@mavu/channels-ical';
import type { NotificationPublisher } from '../notifications/publisher.js';
import { upsertConfirmedBooking } from '../services/booking-flow.js';

/** Bookings created from inbound `.ics` pulls (Airbnb export, Booking.com export, …). */
export const ICAL_INGEST_PROVIDER = 'ical-ingest';

const connector = new IcalChannelConnector();

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
    select: { id: true, externalId: true },
  });

  let removed = 0;
  for (const b of stale) {
    if (!b.externalId || wantedExternalIds.has(b.externalId)) continue;
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
          guestName: ev.summary ?? 'Calendar import',
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

  return { processed, updated, removed, links: links.length, errors };
}

/** Sync all orgs’ inbound links (used by BullMQ worker). */
export async function syncAllInboundIcals(prisma: PrismaClient, notify: NotificationPublisher) {
  return syncInboundIcals(prisma, notify);
}
