import type { FastifyInstance } from 'fastify';
import type { AvailabilityBlock, Booking } from '@prisma/client';
import { AvailabilityBlockReason, BookingStatus } from '@prisma/client';
import { buildIcsFeed, type OutboundEvent } from '@mavu/channels-ical';
import { refreshCompoundAvailabilityBlocksForOrg } from '../services/booking-flow.js';

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

    await refreshCompoundAvailabilityBlocksForOrg(app.prisma, organizationId);

    const bookings = await app.prisma.booking.findMany({
      where: {
        organizationId,
        rentableUnitId: unitId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
        checkOutUtc: { gt: now },
      },
    });

    const mirroredBookingBlocks = await app.prisma.availabilityBlock.findMany({
      where: {
        organizationId,
        rentableUnitId: unitId,
        reason: AvailabilityBlockReason.BOOKING,
        bookingId: { not: null },
        endsAtUtc: { gt: now },
        booking: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] } },
      },
      include: { booking: { select: { id: true, guestName: true, rentableUnitId: true } } },
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
      ...mirroredBookingBlocks
        .filter((lb) => lb.booking && lb.booking.rentableUnitId !== unitId)
        .map((lb) => ({
          uid: `mavu-compound-${lb.id}`,
          startUtc: lb.startsAtUtc,
          endUtc: lb.endsAtUtc,
          /** Airbnb / OTAs treat any export event as blocked — keep summary generic. */
          summary: 'Not available',
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
