-- CreateEnum
CREATE TYPE "ReviewPlatform" AS ENUM ('AIRBNB', 'GOOGLE', 'BOOKING_COM', 'DIRECT', 'OTHER');

-- CreateTable
CREATE TABLE "GuestReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" "ReviewPlatform" NOT NULL DEFAULT 'OTHER',
    "rating" INTEGER NOT NULL,
    "ratingMax" INTEGER NOT NULL DEFAULT 5,
    "guestDisplayName" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "showOnLanding" BOOLEAN NOT NULL DEFAULT true,
    "pinnedOrder" INTEGER NOT NULL DEFAULT 1000,
    "externalId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuestReview_organizationId_showOnLanding_idx" ON "GuestReview"("organizationId", "showOnLanding");

CREATE INDEX "GuestReview_organizationId_pinnedOrder_rating_idx" ON "GuestReview"("organizationId", "pinnedOrder", "rating");

ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
