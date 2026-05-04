-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'CARETAKER', 'STAFF_BLOCK');

-- CreateEnum
CREATE TYPE "RentableUnitKind" AS ENUM ('WHOLE_HOME', 'ROOM', 'COTTAGE', 'DORM_BED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('DIRECT_WEB', 'PLATFORM', 'MANUAL');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AvailabilityBlockReason" AS ENUM ('BOOKING', 'PERSONAL_HOLD', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'CARETAKER',
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentableUnit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "parentRentableUnitId" TEXT,
    "kind" "RentableUnitKind" NOT NULL DEFAULT 'WHOLE_HOME',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "compoundPolicyJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentableUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingLink" (
    "id" TEXT NOT NULL,
    "rentableUnitId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "inboundIcalUrl" TEXT,
    "outboundFeedSlug" TEXT NOT NULL,
    "externalLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "rentableUnitId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "source" "BookingSource" NOT NULL DEFAULT 'PLATFORM',
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "externalProvider" TEXT,
    "externalId" TEXT,
    "checkInUtc" TIMESTAMP(3) NOT NULL,
    "checkOutUtc" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT DEFAULT 'Asia/Kolkata',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityBlock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "rentableUnitId" TEXT NOT NULL,
    "startsAtUtc" TIMESTAMP(3) NOT NULL,
    "endsAtUtc" TIMESTAMP(3) NOT NULL,
    "reason" "AvailabilityBlockReason" NOT NULL,
    "bookingId" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "receiptUrl" TEXT,
    "merchant" TEXT,
    "bookingId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_organizationId_slug_key" ON "Property"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "RentableUnit_propertyId_slug_key" ON "RentableUnit"("propertyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ListingLink_outboundFeedSlug_key" ON "ListingLink"("outboundFeedSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ListingLink_rentableUnitId_channel_key" ON "ListingLink"("rentableUnitId", "channel");

-- CreateIndex
CREATE INDEX "Booking_organizationId_checkInUtc_checkOutUtc_idx" ON "Booking"("organizationId", "checkInUtc", "checkOutUtc");

-- CreateIndex
CREATE INDEX "Booking_externalProvider_externalId_idx" ON "Booking"("externalProvider", "externalId");

-- CreateIndex
CREATE INDEX "AvailabilityBlock_organizationId_rentableUnitId_startsAtUtc_idx" ON "AvailabilityBlock"("organizationId", "rentableUnitId", "startsAtUtc", "endsAtUtc");

-- CreateIndex
CREATE INDEX "Expense_organizationId_createdAt_idx" ON "Expense"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentableUnit" ADD CONSTRAINT "RentableUnit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentableUnit" ADD CONSTRAINT "RentableUnit_parentRentableUnitId_fkey" FOREIGN KEY ("parentRentableUnitId") REFERENCES "RentableUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingLink" ADD CONSTRAINT "ListingLink_rentableUnitId_fkey" FOREIGN KEY ("rentableUnitId") REFERENCES "RentableUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_rentableUnitId_fkey" FOREIGN KEY ("rentableUnitId") REFERENCES "RentableUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_rentableUnitId_fkey" FOREIGN KEY ("rentableUnitId") REFERENCES "RentableUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
