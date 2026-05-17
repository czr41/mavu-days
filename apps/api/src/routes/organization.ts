import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  AvailabilityBlockReason,
  BookingSource,
  BookingStatus,
  MembershipRole,
  OrgHomepageKind,
  RentableUnitKind,
  RentableUnitMatrixRole,
  ReviewPlatform,
} from '@prisma/client';
import type { Prisma } from '@mavu/db';
import { getMembership, requireUser } from '../lib/org-access.js';
import { confirmPendingBooking, upsertConfirmedBooking } from '../services/booking-flow.js';
import { syncInboundIcals } from '../services/ical-sync.js';
import { validateOffersForBookingUnit } from '../services/booking-offers.js';
import { fetchAirbnbListingImageCandidates } from '../services/airbnb-listing-images.js';

type PropertyWithUnitsForListings = Prisma.PropertyGetPayload<{
  include: {
    units: { orderBy: { slug: 'asc' }; include: { listingProfile: true; listingLinks: true } };
  };
}>;

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

async function airbnbHostAccountInOrg(app: FastifyInstance, organizationId: string, accountId: string) {
  const n = await app.prisma.airbnbHostAccount.count({
    where: { id: accountId, organizationId },
  });
  return n === 1;
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
        include: {
          rentableUnit: { include: { property: true } },
          airbnbHostAccount: { select: { id: true, label: true } },
        },
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

  app.get('/orgs/:orgSlug/airbnb-host-accounts', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const rows = await app.prisma.airbnbHostAccount.findMany({
      where: { organizationId: m.organizationId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { listingLinks: true } } },
    });
    return reply.send({
      accounts: rows.map((a) => ({
        id: a.id,
        label: a.label,
        notes: a.notes,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        listingLinkCount: a._count.listingLinks,
      })),
    });
  });

  app.post('/orgs/:orgSlug/airbnb-host-accounts', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const body = z
      .object({
        label: z.string().min(1).max(120),
        notes: z.string().max(8000).nullable().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const acc = await app.prisma.airbnbHostAccount.create({
      data: {
        organizationId: m.organizationId,
        label: body.data.label.trim(),
        notes: body.data.notes?.trim() ?? null,
      },
    });
    return reply.send({ account: acc });
  });

  app.patch('/orgs/:orgSlug/airbnb-host-accounts/:accountId', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const accountId = (req.params as { accountId: string }).accountId;
    const body = z
      .object({
        label: z.string().min(1).max(120).optional(),
        notes: z.union([z.string().max(8000), z.null()]).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const patched = await app.prisma.airbnbHostAccount.updateMany({
      where: { id: accountId, organizationId: m.organizationId },
      data: {
        ...(body.data.label !== undefined ? { label: body.data.label.trim() } : {}),
        ...(body.data.notes !== undefined ? { notes: body.data.notes === null ? null : body.data.notes.trim() } : {}),
      },
    });
    if (patched.count === 0) return reply.status(404).send({ error: 'Account not found' });
    const acc = await app.prisma.airbnbHostAccount.findUniqueOrThrow({ where: { id: accountId } });
    return reply.send({ account: acc });
  });

  app.delete('/orgs/:orgSlug/airbnb-host-accounts/:accountId', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const accountId = (req.params as { accountId: string }).accountId;
    const del = await app.prisma.airbnbHostAccount.deleteMany({
      where: { id: accountId, organizationId: m.organizationId },
    });
    if (del.count === 0) return reply.status(404).send({ error: 'Account not found' });
    return reply.send({ ok: true });
  });

  app.get('/orgs/:orgSlug/properties', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const rows = await app.prisma.property.findMany({
      where: { organizationId: m.organizationId },
      include: {
        units: {
          include: {
            listingLinks: { include: { airbnbHostAccount: { select: { id: true, label: true } } } },
            children: true,
          },
        },
      },
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
        airbnbHostAccountId: z.string().uuid().nullable().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const count = await app.prisma.rentableUnit.count({
      where: { id: unitId, property: { organizationId: m.organizationId } },
    });
    if (!count) return reply.status(404).send({ error: 'Unit not found' });
    if (
      body.data.airbnbHostAccountId &&
      !(await airbnbHostAccountInOrg(app, m.organizationId, body.data.airbnbHostAccountId))
    ) {
      return reply.status(400).send({ error: 'Airbnb account not found for this org' });
    }
    const slug = body.data.outboundFeedSlug ?? crypto.randomBytes(10).toString('hex');
    try {
      const link = await app.prisma.listingLink.create({
        data: {
          rentableUnitId: unitId,
          channel: body.data.channel,
          inboundIcalUrl: body.data.inboundIcalUrl ?? undefined,
          externalLabel: body.data.externalLabel ?? undefined,
          outboundFeedSlug: slug,
          airbnbHostAccountId: body.data.airbnbHostAccountId ?? undefined,
        },
      });
      return reply.send({ listingLink: link });
    } catch {
      return reply.status(409).send({ error: 'Could not create listing link (e.g. duplicate outbound feed slug)' });
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
        airbnbHostAccountId: z.string().uuid().nullable().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const owned = await app.prisma.listingLink.count({
      where: { id: linkId, rentableUnit: { property: { organizationId: m.organizationId } } },
    });
    if (!owned) return reply.status(404).send({ error: 'Not found' });
    if (
      body.data.airbnbHostAccountId &&
      !(await airbnbHostAccountInOrg(app, m.organizationId, body.data.airbnbHostAccountId))
    ) {
      return reply.status(400).send({ error: 'Airbnb account not found for this org' });
    }
    const patch: Prisma.ListingLinkUpdateInput = {};
    if (body.data.inboundIcalUrl !== undefined) patch.inboundIcalUrl = body.data.inboundIcalUrl ?? null;
    if (body.data.externalLabel !== undefined) patch.externalLabel = body.data.externalLabel;
    if (body.data.airbnbHostAccountId !== undefined) {
      patch.airbnbHostAccount = body.data.airbnbHostAccountId
        ? { connect: { id: body.data.airbnbHostAccountId } }
        : { disconnect: true };
    }
    const updated = await app.prisma.listingLink.update({
      where: { id: linkId },
      data: patch,
    });
    return reply.send({ listingLink: updated });
  });

  /** Pull inbound iCal URLs for this org, upsert mirror bookings, cancel stale mirrors (two-way inbound leg). */
  app.post('/orgs/:orgSlug/channels/sync-ical', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const result = await syncInboundIcals(app.prisma, app.notify, { organizationId: m.organizationId });
    return reply.send(result);
  });

  app.get('/orgs/:orgSlug/bookings', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const rows = await app.prisma.booking.findMany({
      where: { organizationId: m.organizationId },
      orderBy: { checkInUtc: 'desc' },
      take: 200,
      include: {
        rentableUnit: true,
        offerSelections: { include: { landingOffer: { select: { id: true, label: true } } } },
      },
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
        offerIds: z.array(z.string().uuid()).max(24).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const unitOk = await app.prisma.rentableUnit.count({
      where: { id: body.data.rentableUnitId, property: { organizationId: m.organizationId } },
    });
    if (!unitOk) return reply.status(404).send({ error: 'Unit not found' });

    const offerCheck = await validateOffersForBookingUnit(
      app.prisma,
      m.organizationId,
      body.data.rentableUnitId,
      body.data.offerIds,
    );
    if (!offerCheck.ok) return reply.status(400).send({ error: offerCheck.error });

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
      landingOfferIds: offerCheck.ids,
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
  app.get('/orgs/:orgSlug/cms/site-settings', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const row = await app.prisma.orgSiteSettings.findUnique({ where: { organizationId: m.organizationId } });
    return reply.send({ homepageKind: row?.homepageKind ?? OrgHomepageKind.LISTING_GRID });
  });

  app.patch('/orgs/:orgSlug/cms/site-settings', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const body = z.object({ homepageKind: z.nativeEnum(OrgHomepageKind) }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    await app.prisma.orgSiteSettings.upsert({
      where: { organizationId: m.organizationId },
      create: { organizationId: m.organizationId, homepageKind: body.data.homepageKind },
      update: { homepageKind: body.data.homepageKind },
    });
    return reply.send({ ok: true, homepageKind: body.data.homepageKind });
  });

  app.get('/orgs/:orgSlug/cms/unit-listings', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const props: PropertyWithUnitsForListings[] = await app.prisma.property.findMany({
      where: { organizationId: m.organizationId },
      orderBy: { createdAt: 'asc' },
      include: {
        units: { orderBy: { slug: 'asc' }, include: { listingProfile: true, listingLinks: true } },
      },
    });
    const units = props.flatMap((p: PropertyWithUnitsForListings) =>
      p.units.map((u: PropertyWithUnitsForListings['units'][number]) => ({
        propertySlug: p.slug,
        propertyName: p.name,
        unit: u,
        listingProfile: u.listingProfile,
      })),
    );
    return reply.send({ units });
  });

  const listingProfileUpsertBody = z.object({
    published: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    matrixRole: z.nativeEnum(RentableUnitMatrixRole).optional(),
    cardTitle: z.string().min(1),
    cardShort: z.string().max(4000),
    bestFor: z.array(z.string()).optional(),
    descriptionMarkdown: z.string().min(1),
    highlights: z.array(z.string()).optional(),
    amenities: z.array(z.string()).optional(),
    ctaLabel: z.union([z.string(), z.null()]).optional(),
    weekdayPriceMinor: z.union([z.number().int(), z.null()]).optional(),
    fridayPriceMinor: z.union([z.number().int(), z.null()]).optional(),
    saturdayPriceMinor: z.union([z.number().int(), z.null()]).optional(),
    sundayPriceMinor: z.union([z.number().int(), z.null()]).optional(),
    longWeekendPriceMinor: z.union([z.number().int(), z.null()]).optional(),
    guestsHint: z.union([z.number().int(), z.null()]).optional(),
    bedroomsHint: z.union([z.number().int(), z.null()]).optional(),
    seoTitle: z.union([z.string(), z.null()]).optional(),
    seoDescription: z.union([z.string(), z.null()]).optional(),
    detailHeroUrl: z
      .union([
        z.string().url(),
        z.string().regex(/^\/[^\s]+$/),
        z.literal(''),
        z.null(),
      ])
      .optional(),
    airbnbProfileLabel: z.union([z.string().max(200), z.literal(''), z.null()]).optional(),
    airbnbListingUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    galleryImageUrls: z.array(z.string().url()).max(24).optional(),
  });

  app.put('/orgs/:orgSlug/rentable-units/:unitId/listing-profile', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const unitId = (req.params as { unitId: string }).unitId;
    const parsed = listingProfileUpsertBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const unit = await app.prisma.rentableUnit.findFirst({
      where: { id: unitId, property: { organizationId: m.organizationId } },
      select: { id: true },
    });
    if (!unit) return reply.status(404).send({ error: 'Unit not found' });

    const d = parsed.data;
    const detailHeroUrl =
      d.detailHeroUrl === undefined || d.detailHeroUrl === null || d.detailHeroUrl === ''
        ? null
        : d.detailHeroUrl;

    const airbnbListingUrl =
      d.airbnbListingUrl === undefined || d.airbnbListingUrl === null || d.airbnbListingUrl === ''
        ? null
        : d.airbnbListingUrl;

    const airbnbProfileLabel =
      d.airbnbProfileLabel === undefined || d.airbnbProfileLabel === null || d.airbnbProfileLabel === ''
        ? null
        : d.airbnbProfileLabel.trim();

    const galleryImageUrls = d.galleryImageUrls ?? [];

    const payload = {
      published: d.published ?? true,
      sortOrder: d.sortOrder ?? 0,
      matrixRole: d.matrixRole ?? RentableUnitMatrixRole.NONE,
      cardTitle: d.cardTitle.trim(),
      cardShort: d.cardShort.trim(),
      bestFor: d.bestFor ?? [],
      descriptionMarkdown: d.descriptionMarkdown,
      highlights: d.highlights ?? [],
      amenities: d.amenities ?? [],
      ctaLabel: d.ctaLabel === undefined ? null : d.ctaLabel,
      weekdayPriceMinor: d.weekdayPriceMinor ?? null,
      fridayPriceMinor: d.fridayPriceMinor ?? null,
      saturdayPriceMinor: d.saturdayPriceMinor ?? null,
      sundayPriceMinor: d.sundayPriceMinor ?? null,
      longWeekendPriceMinor: d.longWeekendPriceMinor ?? null,
      guestsHint: d.guestsHint ?? null,
      bedroomsHint: d.bedroomsHint ?? null,
      seoTitle: d.seoTitle ?? null,
      seoDescription: d.seoDescription ?? null,
      detailHeroUrl,
      airbnbProfileLabel,
      airbnbListingUrl,
      galleryImageUrls,
    };

    const listing = await app.prisma.rentableUnitListing.upsert({
      where: { rentableUnitId: unitId },
      create: { rentableUnitId: unitId, ...payload },
      update: payload,
    });
    return reply.send({ listingProfile: listing });
  });

  /** Best-effort: fetch public listing HTML and extract muscache photo URLs (admin-only). */
  app.post('/orgs/:orgSlug/tools/airbnb-listing-images', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const body = z.object({ listingUrl: z.string().url() }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    try {
      const urls = await fetchAirbnbListingImageCandidates(body.data.listingUrl);
      return reply.send({ urls });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load Airbnb listing HTML';
      return reply.status(422).send({ error: msg });
    }
  });

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
        publicUrl: z
          .string()
          .min(1)
          .refine(
            (s) => /^https?:\/\/.+/i.test(s) || /^\/[^\s]+$/.test(s),
            'Use an http(s) URL or a root-relative path like /hero.jpg',
          ),
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

  app.get('/orgs/:orgSlug/cms/offers', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, careRoles);
    if (!m) return;
    const rows = await app.prisma.landingOffer.findMany({
      where: { organizationId: m.organizationId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return reply.send({ offers: rows });
  });

  app.post('/orgs/:orgSlug/cms/offers', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const body = z
      .object({
        label: z.string().min(1).max(500),
        sortOrder: z.number().int().optional(),
        published: z.boolean().optional(),
        rentableUnitId: z.union([z.string().uuid(), z.null()]).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const unitRef = body.data.rentableUnitId;
    if (unitRef) {
      const okUnit = await app.prisma.rentableUnit.count({
        where: { id: unitRef, property: { organizationId: m.organizationId } },
      });
      if (!okUnit) return reply.status(400).send({ error: 'Unit not found' });
    }

    const row = await app.prisma.landingOffer.create({
      data: {
        organizationId: m.organizationId,
        label: body.data.label.trim(),
        sortOrder: body.data.sortOrder ?? 0,
        published: body.data.published ?? true,
        rentableUnitId: unitRef === undefined ? null : unitRef,
      },
    });
    return reply.send({ offer: row });
  });

  app.patch('/orgs/:orgSlug/cms/offers/:offerId', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const offerId = (req.params as { offerId: string }).offerId;
    const patch = z
      .object({
        label: z.string().min(1).max(500).optional(),
        sortOrder: z.number().int().optional(),
        published: z.boolean().optional(),
        rentableUnitId: z.union([z.string().uuid(), z.null()]).optional(),
      })
      .safeParse(req.body);
    if (!patch.success) return reply.status(400).send({ error: patch.error.flatten() });
    const exists = await app.prisma.landingOffer.findFirst({
      where: { id: offerId, organizationId: m.organizationId },
    });
    if (!exists) return reply.status(404).send({ error: 'Offer not found' });

    if (patch.data.rentableUnitId) {
      const okUnit = await app.prisma.rentableUnit.count({
        where: { id: patch.data.rentableUnitId, property: { organizationId: m.organizationId } },
      });
      if (!okUnit) return reply.status(400).send({ error: 'Unit not found' });
    }

    const nextLabel = patch.data.label != null ? patch.data.label.trim() : undefined;
    const offer = await app.prisma.landingOffer.update({
      where: { id: offerId },
      data: {
        ...(nextLabel != null ? { label: nextLabel } : {}),
        ...(patch.data.sortOrder !== undefined ? { sortOrder: patch.data.sortOrder } : {}),
        ...(patch.data.published !== undefined ? { published: patch.data.published } : {}),
        ...(patch.data.rentableUnitId !== undefined ? { rentableUnitId: patch.data.rentableUnitId } : {}),
      },
    });
    return reply.send({ offer });
  });

  app.delete('/orgs/:orgSlug/cms/offers/:offerId', async (req, reply) => {
    const m = await membershipForRoles(app, req, reply, opsRoles);
    if (!m) return;
    const offerId = (req.params as { offerId: string }).offerId;
    const res = await app.prisma.landingOffer.deleteMany({
      where: { id: offerId, organizationId: m.organizationId },
    });
    if (res.count === 0) return reply.status(404).send({ error: 'Offer not found' });
    return reply.send({ ok: true });
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
