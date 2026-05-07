import {
  AvailabilityBlockReason,
  BookingSource,
  BookingStatus,
  MembershipRole,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';
import type { NotificationPublisher } from '../notifications/publisher.js';
import { conflictingUnitFootprint, detectAvailabilityConflicts } from '../services/availability.js';

async function upsertBookingBlock(
  tx: Prisma.TransactionClient,
  bookingId: string,
  organizationId: string,
  rentableUnitId: string,
  checkInUtc: Date,
  checkOutUtc: Date,
) {
  await tx.availabilityBlock.deleteMany({ where: { bookingId } });
  await tx.availabilityBlock.create({
    data: {
      organizationId,
      rentableUnitId,
      bookingId,
      reason: AvailabilityBlockReason.BOOKING,
      startsAtUtc: checkInUtc,
      endsAtUtc: checkOutUtc,
    },
  });
}

export async function upsertConfirmedBooking(
  prisma: PrismaClient,
  notify: NotificationPublisher,
  params: {
    organizationId: string;
    rentableUnitId: string;
    checkInUtc: Date;
    checkOutUtc: Date;
    source: BookingSource;
    externalProvider?: string | null;
    externalId?: string | null;
    guestName?: string | null;
    guestEmail?: string | null;
    guestPhone?: string | null;
    note?: string | null;
    sendCaretakerNotifications: boolean;
    landingOfferIds?: string[];
  },
) {
  const footprintIds = await conflictingUnitFootprint(prisma, params.rentableUnitId);

  let existingBooking: Awaited<ReturnType<PrismaClient['booking']['findFirst']>> = null;
  if (params.externalProvider && params.externalId) {
    existingBooking = await prisma.booking.findFirst({
      where: {
        organizationId: params.organizationId,
        externalProvider: params.externalProvider,
        externalId: params.externalId,
      },
    });
  }

  const clash = await detectAvailabilityConflicts(prisma, {
    organizationId: params.organizationId,
    footprintUnitIds: footprintIds,
    checkInUtc: params.checkInUtc,
    checkOutUtc: params.checkOutUtc,
    ignoreBookingId: existingBooking?.id,
  });

  if (clash.hasConflict) {
    await prisma.conflictAlert.create({
      data: {
        organizationId: params.organizationId,
        summary: 'Booking clashes with existing hold or reservation',
        rentableUnitId: params.rentableUnitId,
        severity: 'blocking',
        detailJson: clash,
      },
    });
    return { ok: false as const, clash };
  }

  const booking = await prisma.$transaction(async (tx) => {
    const b = existingBooking
      ? await tx.booking.update({
          where: { id: existingBooking.id },
          data: {
            checkInUtc: params.checkInUtc,
            checkOutUtc: params.checkOutUtc,
            guestName: params.guestName,
            guestEmail: params.guestEmail,
            guestPhone: params.guestPhone,
            note: params.note,
            rentableUnitId: params.rentableUnitId,
            status: BookingStatus.CONFIRMED,
          },
        })
      : await tx.booking.create({
          data: {
            organizationId: params.organizationId,
            rentableUnitId: params.rentableUnitId,
            checkInUtc: params.checkInUtc,
            checkOutUtc: params.checkOutUtc,
            source: params.source,
            status: BookingStatus.CONFIRMED,
            externalProvider: params.externalProvider ?? undefined,
            externalId: params.externalId ?? undefined,
            guestName: params.guestName,
            guestEmail: params.guestEmail,
            guestPhone: params.guestPhone,
            note: params.note,
          },
        });

    await upsertBookingBlock(tx, b.id, params.organizationId, params.rentableUnitId, params.checkInUtc, params.checkOutUtc);

    if (!existingBooking && params.landingOfferIds?.length) {
      await tx.bookingOfferSelection.createMany({
        data: params.landingOfferIds.map((landingOfferId) => ({
          bookingId: b.id,
          landingOfferId,
        })),
      });
    }

    return b;
  });

  const isFresh = !existingBooking;
  if (params.sendCaretakerNotifications && isFresh) {
    await notifyCaretakersBooking(prisma, notify, params.organizationId, booking.id);
  }

  return { ok: true as const, booking };
}

export async function createPendingBooking(
  prisma: PrismaClient,
  params: {
    organizationId: string;
    rentableUnitId: string;
    checkInUtc: Date;
    checkOutUtc: Date;
    landingOfferIds?: string[];
  },
) {
  const footprintIds = await conflictingUnitFootprint(prisma, params.rentableUnitId);
  const clash = await detectAvailabilityConflicts(prisma, {
    organizationId: params.organizationId,
    footprintUnitIds: footprintIds,
    checkInUtc: params.checkInUtc,
    checkOutUtc: params.checkOutUtc,
  });
  if (clash.hasConflict) {
    return { ok: false as const, clash };
  }

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        organizationId: params.organizationId,
        rentableUnitId: params.rentableUnitId,
        source: BookingSource.DIRECT_WEB,
        status: BookingStatus.PENDING,
        checkInUtc: params.checkInUtc,
        checkOutUtc: params.checkOutUtc,
      },
    });

    await upsertBookingBlock(tx, b.id, params.organizationId, params.rentableUnitId, params.checkInUtc, params.checkOutUtc);

    if (params.landingOfferIds?.length) {
      await tx.bookingOfferSelection.createMany({
        data: params.landingOfferIds.map((landingOfferId) => ({
          bookingId: b.id,
          landingOfferId,
        })),
      });
    }

    return b;
  });

  return { ok: true as const, booking };
}

async function notifyCaretakersBooking(
  prisma: PrismaClient,
  notify: NotificationPublisher,
  organizationId: string,
  bookingId: string,
) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { rentableUnit: true, organization: true },
  });

  const caretakers = await prisma.membership.findMany({
    where: { organizationId, role: MembershipRole.CARETAKER },
    include: { user: true },
  });

  await notify.notifyBookingConfirmed({
    organization: booking.organization,
    booking,
    unit: booking.rentableUnit,
    caretakerEmail: caretakers.at(0)?.user.email,
  });
}

export async function confirmPendingBooking(
  prisma: PrismaClient,
  notify: NotificationPublisher,
  bookingId: string,
  organizationSlug: string,
) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, organization: { slug: organizationSlug }, status: BookingStatus.PENDING },
  });
  if (!booking) return null;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });

    await upsertBookingBlock(
      tx,
      bookingId,
      booking.organizationId,
      booking.rentableUnitId,
      booking.checkInUtc,
      booking.checkOutUtc,
    );
  });

  await notifyCaretakersBooking(prisma, notify, booking.organizationId, bookingId);

  return prisma.booking.findUnique({ where: { id: bookingId } });
}
