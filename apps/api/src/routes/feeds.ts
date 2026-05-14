import type { FastifyInstance } from 'fastify';
import type { AvailabilityBlock, Booking } from '@prisma/client';
import { AvailabilityBlockReason, BookingStatus } from '@prisma/client';
import { buildIcsFeed, type OutboundEvent } from '@mavu/channels-ical';

export function registerFeedsRoutes(app: FastifyInstance) {
  app.get('/feeds/:slug', async (req, reply) => {
    let slugRaw = (req.params as { slug: string }).slug;
    if (slugRaw.endsWith('.ics')) {
      slugRaw = slugRaw.slice(0, -4);
    }

    const link = await app.prisma.listingLink.findUnique({
      where: { outboundFeedSlug: slugRaw },
      include: { rentableUnit: { include: { property: true } } },
    });

    if (!link) return reply.status(404).send('Feed not found');

    const organizationId = link.rentableUnit.property.organizationId;
    const unitId = link.rentableUnitId;
    const now = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const bookings = await app.prisma.booking.findMany({
      where: {
        organizationId,
        rentableUnitId: unitId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
        checkOutUtc: { gt: now },
      },
    });

    const holds = await app.prisma.availabilityBlock.findMany({
      where: {
        organizationId,
        rentableUnitId: unitId,
        reason: { in: [AvailabilityBlockReason.MAINTENANCE, AvailabilityBlockReason.PERSONAL_HOLD] },
        bookingId: null,
        endsAtUtc: { gt: now },
      },
    });

    const events: OutboundEvent[] = [
      ...bookings.map((b: Booking) => ({
        uid: `mavu-booking-${b.id}`,
        startUtc: b.checkInUtc,
        endUtc: b.checkOutUtc,
        summary: b.guestName ? `Booking: ${b.guestName}` : 'Blocked (booking)',
      })),
      ...holds.map((h: AvailabilityBlock) => ({
        uid: `mavu-block-${h.id}`,
        startUtc: h.startsAtUtc,
        endUtc: h.endsAtUtc,
        summary: `Hold (${h.reason})`,
      })),
    ];

    const body = buildIcsFeed(link.externalLabel ?? link.rentableUnit.name, events);

    reply.header('Content-Type', 'text/calendar; charset=utf-8');
    return reply.send(body);
  });
}
