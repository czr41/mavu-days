import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BookingStatus, OrgHomepageKind } from '@prisma/client';
import { confirmPendingBooking, createPendingBooking } from '../services/booking-flow.js';
import {
  computeLandingAvailabilityMatrix,
  computePerUnitAvailability,
  publishedOffersForLandingUnit,
  resolveLandingBookingTargets,
  resolveLandingUnitIds,
} from '../services/landing-availability-matrix.js';
import { validateOffersForBookingUnit } from '../services/booking-offers.js';
import { toPublicGuestReviewDto } from '../lib/guest-review-dto.js';
import { buildPublicSitePayload } from '../lib/public-site-dto.js';

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

  app.get('/public/orgs/:orgSlug/site', async (req, reply) => {
    const slug = (req.params as { orgSlug: string }).orgSlug;
    const org = await app.prisma.organization.findUnique({
      where: { slug },
      include: {
        siteSettings: true,
        sections: {
          where: { published: true },
          orderBy: { sortOrder: 'asc' },
        },
        landingOffers: {
          where: { published: true, rentableUnitId: null },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, label: true },
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
        properties: {
          orderBy: { createdAt: 'asc' },
          include: {
            units: {
              orderBy: { slug: 'asc' },
              include: { listingProfile: true },
            },
          },
        },
      },
    });
    if (!org) return reply.status(404).send({ error: 'Organization not found' });
    const payload = buildPublicSitePayload({
      organization: org,
      siteSettings: org.siteSettings,
      properties: org.properties,
      sections: org.sections,
      media: org.media,
      guestReviews: org.guestReviews,
      tickerOffers: org.landingOffers,
    });
    return reply.send(payload);
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
        landingOffers: {
          where: { published: true, rentableUnitId: null },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, label: true },
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
      offers: org.landingOffers,
    });
  });

  app.get('/public/orgs/:orgSlug/landing-availability', async (req, reply) => {
    const orgSlug = (req.params as { orgSlug: string }).orgSlug;
    const parsed = landingAvailabilityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'checkIn and checkOut must be YYYY-MM-DD dates' });
    }

    const org = await app.prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: {
        siteSettings: true,
        properties: {
          include: {
            units: { include: { listingProfile: true } },
          },
        },
      },
    });
    if (!org) return reply.status(404).send({ error: 'Organization not found' });

    const homepageKind = org.siteSettings?.homepageKind ?? OrgHomepageKind.LISTING_GRID;

    const checkInUtc = utcDay(parsed.data.checkIn);
    const checkOutUtc = utcDay(parsed.data.checkOut);

    if (checkOutUtc <= checkInUtc) {
      return reply.status(400).send({ error: 'checkOut must be strictly after checkIn' });
    }

    type GridUnit = {
      unitId: string;
      propertySlug: string;
      unitSlug: string;
      key: string;
      title: string;
      sortOrder: number;
    };

    if (homepageKind === OrgHomepageKind.LISTING_GRID) {
      const gridUnits: GridUnit[] = [];
      for (const prop of org.properties) {
        for (const u of prop.units) {
          const lp = u.listingProfile;
          if (!lp?.published) continue;
          gridUnits.push({
            unitId: u.id,
            propertySlug: prop.slug,
            unitSlug: u.slug,
            key: u.slug,
            title: lp.cardTitle?.trim() || u.name,
            sortOrder: lp.sortOrder,
          });
        }
      }
      gridUnits.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.unitSlug.localeCompare(b.unitSlug);
      });

      if (gridUnits.length === 0) {
        return reply.send({
          organizationSlug: org.slug,
          homepageKind,
          configured: false,
          message: 'Publish at least one unit listing for grid availability.',
          checkInUtc: checkInUtc.toISOString(),
          checkOutUtc: checkOutUtc.toISOString(),
          columns: [],
        });
      }

      const availMap = await computePerUnitAvailability(
        app.prisma,
        org.id,
        gridUnits.map((g) => g.unitId),
        { checkInUtc, checkOutUtc },
      );

      const columns = await Promise.all(
        gridUnits.map(async (g) => ({
          key: g.key,
          title: g.title,
          available: availMap.get(g.unitId) ?? false,
          bookingTarget: { propertySlug: g.propertySlug, unitSlug: g.unitSlug },
          offers: await publishedOffersForLandingUnit(app.prisma, org.id, g.unitId),
        })),
      );

      return reply.send({
        organizationSlug: org.slug,
        homepageKind,
        configured: true,
        checkInUtc: checkInUtc.toISOString(),
        checkOutUtc: checkOutUtc.toISOString(),
        columns,
      });
    }

    const ids = await resolveLandingUnitIds(app.prisma, org.id);
    if (!ids.configured || !ids.fullFarm || !ids.bhk1 || !ids.bhk2) {
      return reply.send({
        organizationSlug: org.slug,
        homepageKind,
        configured: false,
        message:
          'MATRIX_THREE_SKU: assign matrix roles on unit listings or add units with slugs full-farm, 1bhk-villa, and 2bhk-villa.',
        checkInUtc: checkInUtc.toISOString(),
        checkOutUtc: checkOutUtc.toISOString(),
        columns: [],
      });
    }

    const availability = await computeLandingAvailabilityMatrix(
      app.prisma,
      org.id,
      { fullFarm: ids.fullFarm, bhk1: ids.bhk1, bhk2: ids.bhk2 },
      { checkInUtc, checkOutUtc },
    );

    const bookingTargets = await resolveLandingBookingTargets(app.prisma, {
      fullFarm: ids.fullFarm,
      bhk1: ids.bhk1,
      bhk2: ids.bhk2,
    });

    const [offFf, offV1, offV2] = await Promise.all([
      publishedOffersForLandingUnit(app.prisma, org.id, ids.fullFarm),
      publishedOffersForLandingUnit(app.prisma, org.id, ids.bhk1),
      publishedOffersForLandingUnit(app.prisma, org.id, ids.bhk2),
    ]);

    const columns = [
      {
        key: 'fullFarm',
        title: 'Full Farm',
        available: availability.fullFarm,
        bookingTarget: bookingTargets.fullFarm,
        offers: offFf,
      },
      {
        key: 'villa1bhk',
        title: '1 BHK Villa',
        available: availability.villa1bhk,
        bookingTarget: bookingTargets.villa1bhk,
        offers: offV1,
      },
      {
        key: 'villa2bhk',
        title: '2 BHK Villa',
        available: availability.villa2bhk,
        bookingTarget: bookingTargets.villa2bhk,
        offers: offV2,
      },
    ];

    return reply.send({
      organizationSlug: org.slug,
      homepageKind,
      configured: true,
      checkInUtc: checkInUtc.toISOString(),
      checkOutUtc: checkOutUtc.toISOString(),
      columns,
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
        offerIds: z.array(z.string().uuid()).max(24).optional(),
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

    const offerCheck = await validateOffersForBookingUnit(app.prisma, org.id, unit.id, body.data.offerIds);
    if (!offerCheck.ok) return reply.status(400).send({ error: offerCheck.error });

    const res = await createPendingBooking(app.prisma, {
      organizationId: org.id,
      rentableUnitId: unit.id,
      checkInUtc: body.data.checkInUtc,
      checkOutUtc: body.data.checkOutUtc,
      landingOfferIds: offerCheck.ids,
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
