-- Unit scope for landing offers (null = all units + homepage ticker)
ALTER TABLE "LandingOffer" ADD COLUMN "rentableUnitId" TEXT;

ALTER TABLE "LandingOffer" ADD CONSTRAINT "LandingOffer_rentableUnitId_fkey" FOREIGN KEY ("rentableUnitId") REFERENCES "RentableUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "LandingOffer_organizationId_published_rentableUnitId_idx" ON "LandingOffer"("organizationId", "published", "rentableUnitId");

CREATE TABLE "BookingOfferSelection" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "landingOfferId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingOfferSelection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingOfferSelection_bookingId_landingOfferId_key" ON "BookingOfferSelection"("bookingId", "landingOfferId");

CREATE INDEX "BookingOfferSelection_bookingId_idx" ON "BookingOfferSelection"("bookingId");

ALTER TABLE "BookingOfferSelection" ADD CONSTRAINT "BookingOfferSelection_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingOfferSelection" ADD CONSTRAINT "BookingOfferSelection_landingOfferId_fkey" FOREIGN KEY ("landingOfferId") REFERENCES "LandingOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
