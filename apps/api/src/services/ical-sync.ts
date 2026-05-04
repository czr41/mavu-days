import { BookingSource, type PrismaClient } from '@prisma/client';
import { IcalChannelConnector } from '@mavu/channels-ical';
import type { NotificationPublisher } from '../notifications/publisher.js';
import { upsertConfirmedBooking } from '../services/booking-flow.js';

const connector = new IcalChannelConnector();

export async function syncAllInboundIcals(prisma: PrismaClient, notify: NotificationPublisher) {
  const links = await prisma.listingLink.findMany({
    where: {
      inboundIcalUrl: { not: null },
    },
    include: {
      rentableUnit: { include: { property: true } },
    },
  });

  let processed = 0;
  let updated = 0;
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

      for (const ev of events) {
        const externalId = `${link.channel}:${link.id}:${ev.uid}`;
        const existing = await prisma.booking.findFirst({
          where: { organizationId: orgId, externalProvider: 'ical-ingest', externalId },
          select: { id: true },
        });

        const res = await upsertConfirmedBooking(prisma, notify, {
          organizationId: orgId,
          rentableUnitId: link.rentableUnitId,
          checkInUtc: ev.startUtc,
          checkOutUtc: ev.endUtc,
          source: BookingSource.PLATFORM,
          externalProvider: 'ical-ingest',
          externalId,
          guestName: ev.summary ?? 'Calendar import',
          sendCaretakerNotifications: !existing,
        });

        if (res.ok) updated += 1;
        processed += 1;
      }
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

  return { processed, updated, links: links.length, errors };
}
