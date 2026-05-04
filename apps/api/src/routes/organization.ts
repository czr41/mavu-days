import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  AvailabilityBlockReason,
  BookingSource,
  BookingStatus,
  MembershipRole,
  RentableUnitKind,
  ReviewPlatform,
} from '@prisma/client';
import { getMembership, requireUser } from '../lib/org-access.js';
import { confirmPendingBooking, upsertConfirmedBooking } from '../services/booking-flow.js';

const adminRoles: MembershipRole[] = [MembershipRole.OWNER, MembershipRole.ADMIN];
const opsRoles: MembershipRole[] = [...adminRoles];
const careRoles: MembershipRole[] = [...opsRoles, MembershipRole.CARETAKER];

async function membershipForRoles(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
  allowed: MembershipRole[],
) {
  if (!(await requireUser(req, reply))) return null;
  const orgSlug = (req.params as { orgSlug: string }).orgSlug;
  const m = await getMembership(app, req.user.sub, orgSlug, allowed);
  if (!m) {
    await reply.status(403).send({ error: 'Forbidden' });
    return null;
  }
  return m;
}

export function registerOrganizationRoutes(app: FastifyInstance) {
  app.get('/orgs/:orgSlug/dashboard', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const now = new Date();
    const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const [upcoming, alerts, links] = await Promise.all([
      app.prisma.booking.findMany({
        where: {
          organizationId: m.organizationId,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
          checkInUtc: { lte: horizon },
          checkOutUtc: { gte: now },
        },
        orderBy: { checkInUtc: 'asc' },
        take: 50,
        include: { rentableUnit: true },
      }),
      app.prisma.conflictAlert.findMany({
        where: { organizationId: m.organizationId, dismissedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      app.prisma.listingLink.findMany({
        where: { rentableUnit: { property: { organizationId: m.organizationId } } },
        include: { rentableUnit: { include: { property: true } } },
        take: 100,
      }),
    ]);
    return reply.send({ upcoming, alerts, listingLinks: links });
  });

  app.post('/orgs/:orgSlug/invites', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const body = z
      .object({
        email: z.string().email(),
        role: z.nativeEnum(MembershipRole).default(MembershipRole.CARETAKER),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const token = crypto.randomUUID();
    const invite = await app.prisma.invite.create({
      data: {
        organizationId: m.organizationId,
        email: body.data.email.toLowerCase(),
        role: body.data.role,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedByUserId: req.user.sub,
      },
    });
    return reply.send({ invite: { id: invite.id, token: invite.token, expiresAt: invite.expiresAt } });
  });

  app.get('/orgs/:orgSlug/properties', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const rows = await app.prisma.property.findMany({
      where: { organizationId: m.organizationId },
      include: { units: { include: { listingLinks: true, children: true } } },
    });
    return reply.send({ properties: rows });
  });

  const propertyBody = z.object({
    name: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/),
  });

  app.post('/orgs/:orgSlug/properties', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const body = propertyBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    try {
      const p = await app.prisma.property.create({
        data: {
          organizationId: m.organizationId,
          name: body.data.name,
          slug: body.data.slug,
        },
      });
      return reply.send({ property: p });
    } catch {
      return reply.status(409).send({ error: 'Property slug already exists' });
    }
  });

  app.patch('/orgs/:orgSlug/properties/:propertySlug', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const body = z.object({ name: z.string().min(1).optional() }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const propertySlug = (req.params as { propertySlug: string }).propertySlug;
    const p = await app.prisma.property.updateMany({
      where: { organizationId: m.organizationId, slug: propertySlug },
      data: body.data,
    });
    if (p.count === 0) return reply.status(404).send({ error: 'Not found' });
    return reply.send({ ok: true });
  });

  app.delete('/orgs/:orgSlug/properties/:propertySlug', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const propertySlug = (req.params as { propertySlug: string }).propertySlug;
    await app.prisma.property.deleteMany({
      where: { organizationId: m.organizationId, slug: propertySlug },
    });
    return reply.send({ ok: true });
  });

  const unitBody = z.object({
    name: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/),
    kind: z.nativeEnum(RentableUnitKind).default(RentableUnitKind.WHOLE_HOME),
    parentRentableUnitId: z.string().uuid().nullable().optional(),
  });

  app.post('/orgs/:orgSlug/properties/:propertySlug/units', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const body = unitBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const propertySlug = (req.params as { propertySlug: string }).propertySlug;
    const prop = await app.prisma.property.findFirst({
      where: { organizationId: m.organizationId, slug: propertySlug },
    });
    if (!prop) return reply.status(404).send({ error: 'Property not found' });
    try {
      const u = await app.prisma.rentableUnit.create({
        data: {
          propertyId: prop.id,
          name: body.data.name,
          slug: body.data.slug,
          kind: body.data.kind,
          parentRentableUnitId: body.data.parentRentableUnitId ?? undefined,
        },
      });
      return reply.send({ unit: u });
    } catch {
      return reply.status(409).send({ error: 'Unit slug collision' });
    }
  });

  app.patch('/orgs/:orgSlug/rentable-units/:unitId', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const unitId = (req.params as { unitId: string }).unitId;
    const body = unitBody.partial().omit({ slug: true }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const count = await app.prisma.rentableUnit.count({
      where: { id: unitId, property: { organizationId: m.organizationId } },
    });
    if (!count) return reply.status(404).send({ error: 'Unit not found' });
    const u = await app.prisma.rentableUnit.update({
      where: { id: unitId },
      data: body.data,
    });
    return reply.send({ unit: u });
  });

  app.post('/orgs/:orgSlug/rentable-units/:unitId/listing-links', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const unitId = (req.params as { unitId: string }).unitId;
    const body = z
      .object({
        channel: z.string().min(1),
        inboundIcalUrl: z.string().url().nullable().optional(),
        externalLabel: z.string().nullable().optional(),
        outboundFeedSlug: z.string().min(8).regex(/^[a-z0-9-]+$/).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const count = await app.prisma.rentableUnit.count({
      where: { id: unitId, property: { organizationId: m.organizationId } },
    });
    if (!count) return reply.status(404).send({ error: 'Unit not found' });
    const slug = body.data.outboundFeedSlug ?? crypto.randomBytes(10).toString('hex');
    try {
      const link = await app.prisma.listingLink.create({
        data: {
          rentableUnitId: unitId,
          channel: body.data.channel,
          inboundIcalUrl: body.data.inboundIcalUrl ?? undefined,
          externalLabel: body.data.externalLabel ?? undefined,
          outboundFeedSlug: slug,
        },
      });
      return reply.send({ listingLink: link });
    } catch {
      return reply.status(409).send({ error: 'listing link outbound slug or channel exists' });
    }
  });

  app.patch('/orgs/:orgSlug/listing-links/:linkId', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const linkId = (req.params as { linkId: string }).linkId;
    const body = z
      .object({
        inboundIcalUrl: z.string().url().nullable().optional(),
        externalLabel: z.string().nullable().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const owned = await app.prisma.listingLink.count({
      where: { id: linkId, rentableUnit: { property: { organizationId: m.organizationId } } },
    });
    if (!owned) return reply.status(404).send({ error: 'Not found' });
    const updated = await app.prisma.listingLink.update({ where: { id: linkId }, data: body.data });
    return reply.send({ listingLink: updated });
  });

  app.get('/orgs/:orgSlug/bookings', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const rows = await app.prisma.booking.findMany({
      where: { organizationId: m.organizationId },
      orderBy: { checkInUtc: 'desc' },
      take: 200,
      include: { rentableUnit: true },
    });
    return reply.send({ bookings: rows });
  });

  app.post('/orgs/:orgSlug/bookings', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const body = z
      .object({
        rentableUnitId: z.string().uuid(),
        checkInUtc: z.coerce.date(),
        checkOutUtc: z.coerce.date(),
        guestName: z.string().optional(),
        guestEmail: z.string().email().optional(),
        guestPhone: z.string().optional(),
        note: z.string().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const res = await upsertConfirmedBooking(app.prisma, app.notify, {
      organizationId: m.organizationId,
      rentableUnitId: body.data.rentableUnitId,
      checkInUtc: body.data.checkInUtc,
      checkOutUtc: body.data.checkOutUtc,
      source: BookingSource.MANUAL,
      guestName: body.data.guestName,
      guestEmail: body.data.guestEmail,
      guestPhone: body.data.guestPhone,
      note: body.data.note,
      sendCaretakerNotifications: true,
    });
    if (!res.ok) return reply.status(409).send({ conflict: true, clash: res.clash });
    return reply.send({ booking: res.booking });
  });

  app.post('/orgs/:orgSlug/bookings/:bookingId/confirm', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const bookingId = (req.params as { bookingId: string }).bookingId;
    const row = await confirmPendingBooking(app.prisma, app.notify, bookingId, (req.params as { orgSlug: string }).orgSlug);
    if (!row) return reply.status(404).send({ error: 'Pending booking not found' });
    return reply.send({ booking: row });
  });

  app.post('/orgs/:orgSlug/availability-blocks', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, [
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.STAFF_BLOCK,
    ]);
    if (!m) return;
    const body = z
      .object({
        rentableUnitId: z.string().uuid(),
        startsAtUtc: z.coerce.date(),
        endsAtUtc: z.coerce.date(),
        reason: z.nativeEnum(AvailabilityBlockReason),
        note: z.string().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const isOps = opsRoles.includes(m.role);
    const isStaffBlock = m.role === MembershipRole.STAFF_BLOCK;
    if (!isOps && !isStaffBlock) return reply.status(403).send({ error: 'Forbidden' });
    if (body.data.reason === AvailabilityBlockReason.MAINTENANCE && !isOps) {
      return reply.status(403).send({ error: 'Only admins can schedule maintenance' });
    }
    if (body.data.reason === AvailabilityBlockReason.PERSONAL_HOLD && !(isOps || isStaffBlock)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    if (body.data.reason === AvailabilityBlockReason.BOOKING) {
      return reply.status(400).send({ error: 'BOOKING blocks are created only via reservations' });
    }

    const unitOk = await app.prisma.rentableUnit.count({
      where: { id: body.data.rentableUnitId, property: { organizationId: m.organizationId } },
    });
    if (!unitOk) return reply.status(404).send({ error: 'Unit not found' });

    await app.prisma.availabilityBlock.create({
      data: {
        organizationId: m.organizationId,
        rentableUnitId: body.data.rentableUnitId,
        startsAtUtc: body.data.startsAtUtc,
        endsAtUtc: body.data.endsAtUtc,
        reason: body.data.reason,
        note: body.data.note,
        createdByUserId: req.user.sub,
      },
    });
    return reply.send({ ok: true });
  });

  app.post('/orgs/:orgSlug/conflict-alerts/:alertId/dismiss', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const alertId = (req.params as { alertId: string }).alertId;
    await app.prisma.conflictAlert.updateMany({
      where: { id: alertId, organizationId: m.organizationId },
      data: { dismissedAt: new Date() },
    });
    return reply.send({ ok: true });
  });

  /* --- CMS --- */
  app.get('/orgs/:orgSlug/cms/sections', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const rows = await app.prisma.siteSection.findMany({
      where: { organizationId: m.organizationId },
      orderBy: { sortOrder: 'asc' },
    });
    return reply.send({ sections: rows });
  });

  app.post('/orgs/:orgSlug/cms/sections', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const body = z
      .object({
        key: z.string().min(1).regex(/^[a-z0-9-]+$/),
        title: z.string().min(1),
        bodyMarkdown: z.string().min(1),
        sortOrder: z.number().int().optional(),
        published: z.boolean().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    try {
      const s = await app.prisma.siteSection.create({
        data: {
          organizationId: m.organizationId,
          key: body.data.key,
          title: body.data.title,
          bodyMarkdown: body.data.bodyMarkdown,
          sortOrder: body.data.sortOrder ?? 0,
          published: body.data.published ?? false,
        },
      });
      return reply.send({ section: s });
    } catch {
      return reply.status(409).send({ error: 'Section key exists' });
    }
  });

  app.patch('/orgs/:orgSlug/cms/sections/:key', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const key = decodeURIComponent((req.params as { key: string }).key);
    const body = z
      .object({
        title: z.string().optional(),
        bodyMarkdown: z.string().optional(),
        sortOrder: z.number().int().optional(),
        published: z.boolean().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    await app.prisma.siteSection.updateMany({
      where: { organizationId: m.organizationId, key },
      data: body.data,
    });
    return reply.send({ ok: true });
  });

  app.get('/orgs/:orgSlug/cms/media', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const rows = await app.prisma.mediaAsset.findMany({ where: { organizationId: m.organizationId } });
    return reply.send({ media: rows });
  });

  app.post('/orgs/:orgSlug/cms/media', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const body = z
      .object({
        key: z.string().min(1).regex(/^[a-z0-9-]+$/),
        publicUrl: z.string().url(),
        alt: z.string().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    try {
      const row = await app.prisma.mediaAsset.create({
        data: {
          organizationId: m.organizationId,
          key: body.data.key,
          publicUrl: body.data.publicUrl,
          alt: body.data.alt,
        },
      });
      return reply.send({ media: row });
    } catch {
      return reply.status(409).send({ error: 'Media key exists' });
    }
  });

  const guestReviewCreate = z
    .object({
      platform: z.nativeEnum(ReviewPlatform).default(ReviewPlatform.OTHER),
      rating: z.number().int().min(1).max(5),
      ratingMax: z.number().int().min(1).max(10).default(5),
      guestDisplayName: z.string().optional(),
      title: z.string().optional(),
      body: z.string().min(10),
      reviewedAt: z.coerce.date().optional(),
      showOnLanding: z.boolean().default(true),
      pinnedOrder: z.number().int().min(0).max(100000).optional(),
      externalId: z.string().optional(),
    })
    .refine((d) => d.rating <= d.ratingMax, { message: 'rating cannot exceed ratingMax', path: ['rating'] });

  app.get('/orgs/:orgSlug/cms/reviews', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const rows = await app.prisma.guestReview.findMany({
      where: { organizationId: m.organizationId },
      orderBy: [{ pinnedOrder: 'asc' }, { reviewedAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
    return reply.send({ reviews: rows });
  });

  app.post('/orgs/:orgSlug/cms/reviews', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const body = guestReviewCreate.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    try {
      const review = await app.prisma.guestReview.create({
        data: {
          organizationId: m.organizationId,
          platform: body.data.platform,
          rating: body.data.rating,
          ratingMax: body.data.ratingMax,
          guestDisplayName: body.data.guestDisplayName ?? null,
          title: body.data.title ?? null,
          body: body.data.body,
          reviewedAt: body.data.reviewedAt ?? null,
          showOnLanding: body.data.showOnLanding,
          pinnedOrder: body.data.pinnedOrder ?? 1000,
          externalId: body.data.externalId ?? null,
        },
      });
      return reply.send({ review });
    } catch {
      return reply.status(500).send({ error: 'Could not create review' });
    }
  });

  app.patch('/orgs/:orgSlug/cms/reviews/:reviewId', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const reviewId = (req.params as { reviewId: string }).reviewId;
    const patch = z
      .object({
        platform: z.nativeEnum(ReviewPlatform).optional(),
        rating: z.number().int().min(1).max(5).optional(),
        ratingMax: z.number().int().min(1).max(10).optional(),
        guestDisplayName: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        body: z.string().min(10).optional(),
        reviewedAt: z.coerce.date().nullable().optional(),
        showOnLanding: z.boolean().optional(),
        pinnedOrder: z.number().int().min(0).max(100000).optional(),
        externalId: z.string().nullable().optional(),
      })
      .safeParse(req.body);
    if (!patch.success) return reply.status(400).send({ error: patch.error.flatten() });
    const exists = await app.prisma.guestReview.findFirst({
      where: { id: reviewId, organizationId: m.organizationId },
    });
    if (!exists) return reply.status(404).send({ error: 'Review not found' });
    const nextRating = patch.data.rating ?? exists.rating;
    const nextMax = patch.data.ratingMax ?? exists.ratingMax;
    if (nextRating > nextMax) {
      return reply.status(400).send({ error: 'rating cannot exceed ratingMax' });
    }
    const review = await app.prisma.guestReview.update({
      where: { id: reviewId },
      data: patch.data,
    });
    return reply.send({ review });
  });

  app.delete('/orgs/:orgSlug/cms/reviews/:reviewId', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const reviewId = (req.params as { reviewId: string }).reviewId;
    const res = await app.prisma.guestReview.deleteMany({
      where: { id: reviewId, organizationId: m.organizationId },
    });
    if (res.count === 0) return reply.status(404).send({ error: 'Review not found' });
    return reply.send({ ok: true });
  });
}
