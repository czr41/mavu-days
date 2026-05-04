import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BookingStatus } from '@prisma/client';
import { confirmPendingBooking, createPendingBooking } from '../services/booking-flow.js';
import {
  computeLandingAvailabilityMatrix,
  resolveLandingUnitIds,
} from '../services/landing-availability-matrix.js';
import { toPublicGuestReviewDto } from '../lib/guest-review-dto.js';

const PUBLIC_LANDING_REVIEWS_LIMIT = 12;

const landingAvailabilityQuerySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Calendar date at UTC midnight — matches common direct-booking payloads. */
function utcDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function registerPublicRoutes(app: FastifyInstance) {
  app.get('/public/orgs/:orgSlug/inventory', async (req, reply) => {
    const slug = (req.params as { orgSlug: string }).orgSlug;
    const org = await app.prisma.organization.findUnique({
      where: { slug },
      include: {
        properties: {
          include: {
            units: {
              select: {
                id: true,
                name: true,
                slug: true,
                kind: true,
                listingLinks: { select: { id: true, channel: true, outboundFeedSlug: true } },
              },
            },
          },
        },
      },
    });
    if (!org) return reply.status(404).send({ error: 'Organization not found' });
    return reply.send({
      organization: { id: org.id, slug: org.slug, name: org.name },
      properties: org.properties.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        units: p.units,
      })),
    });
  });

  app.get('/public/orgs/:orgSlug/content', async (req, reply) => {
    const slug = (req.params as { orgSlug: string }).orgSlug;
    const org = await app.prisma.organization.findUnique({
      where: { slug },
      include: {
        sections: {
          where: { published: true },
          orderBy: { sortOrder: 'asc' },
        },
        media: true,
        guestReviews: {
          where: { showOnLanding: true },
          orderBy: [
            { pinnedOrder: 'asc' },
            { rating: 'desc' },
            { reviewedAt: 'desc' },
            { createdAt: 'desc' },
          ],
          take: PUBLIC_LANDING_REVIEWS_LIMIT,
        },
      },
    });
    if (!org) return reply.status(404).send({ error: 'Organization not found' });
    return reply.send({
      organization: { slug: org.slug, name: org.name },
      sections: org.sections,
      media: org.media,
      reviews: org.guestReviews.map(toPublicGuestReviewDto),
    });
  });

  app.get('/public/orgs/:orgSlug/landing-availability', async (req, reply) => {
    const orgSlug = (req.params as { orgSlug: string }).orgSlug;
    const parsed = landingAvailabilityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'checkIn and checkOut must be YYYY-MM-DD dates' });
    }

    const org = await app.prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return reply.status(404).send({ error: 'Organization not found' });

    const ids = await resolveLandingUnitIds(app.prisma, org.id);
    if (!ids.configured || !ids.fullFarm || !ids.bhk1 || !ids.bhk2) {
      return reply.send({
        organizationSlug: org.slug,
        configured: false,
        message:
          'Add three rentable units with slugs full-farm, 1bhk-villa, and 2bhk-villa (or close aliases documented in landing-availability-matrix).',
      });
    }

    const checkInUtc = utcDay(parsed.data.checkIn);
    const checkOutUtc = utcDay(parsed.data.checkOut);

    if (checkOutUtc <= checkInUtc) {
      return reply.status(400).send({ error: 'checkOut must be strictly after checkIn' });
    }

    const availability = await computeLandingAvailabilityMatrix(
      app.prisma,
      org.id,
      { fullFarm: ids.fullFarm, bhk1: ids.bhk1, bhk2: ids.bhk2 },
      { checkInUtc, checkOutUtc },
    );

    return reply.send({
      organizationSlug: org.slug,
      configured: true,
      checkInUtc: checkInUtc.toISOString(),
      checkOutUtc: checkOutUtc.toISOString(),
      availability: {
        fullFarm: availability.fullFarm,
        villa1bhk: availability.villa1bhk,
        villa2bhk: availability.villa2bhk,
      },
    });
  });

  app.post('/public/orgs/:orgSlug/bookings', async (req, reply) => {
    const orgSlug = (req.params as { orgSlug: string }).orgSlug;
    const body = z
      .object({
        propertySlug: z.string().min(1),
        unitSlug: z.string().min(1),
        checkInUtc: z.coerce.date(),
        checkOutUtc: z.coerce.date(),
        guestName: z.string().optional(),
        guestEmail: z.string().email().optional(),
        guestPhone: z.string().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const org = await app.prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: {
        properties: {
          where: { slug: body.data.propertySlug },
          include: { units: { where: { slug: body.data.unitSlug } } },
        },
      },
    });

    const prop = org?.properties.at(0);
    const unit = prop?.units.at(0);
    if (!org || !prop || !unit) return reply.status(404).send({ error: 'Unit not found' });

    const res = await createPendingBooking(app.prisma, {
      organizationId: org.id,
      rentableUnitId: unit.id,
      checkInUtc: body.data.checkInUtc,
      checkOutUtc: body.data.checkOutUtc,
    });
    if (!res.ok) return reply.status(409).send({ conflict: true, clash: res.clash });

    await app.prisma.booking.update({
      where: { id: res.booking.id },
      data: {
        guestName: body.data.guestName,
        guestEmail: body.data.guestEmail,
        guestPhone: body.data.guestPhone,
      },
    });

    if (process.env.MOCK_PAYMENTS === 'true' || process.env.MOCK_PAYMENTS === '1') {
      const updated = await confirmPendingBooking(app.prisma, app.notify, res.booking.id, org.slug);
      return reply.send({ booking: updated, mockedPayment: true });
    }

    const full = await app.prisma.booking.findUniqueOrThrow({ where: { id: res.booking.id } });
    return reply.send({
      booking: full,
      status: BookingStatus.PENDING,
      message:
        'Booking is pending confirmation. Flip MOCK_PAYMENTS=true for local demos, or wire a payment webhook to confirm.',
    });
  });
}
