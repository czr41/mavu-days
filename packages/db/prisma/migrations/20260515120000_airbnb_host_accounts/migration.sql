-- CreateTable
CREATE TABLE "AirbnbHostAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirbnbHostAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AirbnbHostAccount_organizationId_idx" ON "AirbnbHostAccount"("organizationId");

-- AddForeignKey
ALTER TABLE "AirbnbHostAccount" ADD CONSTRAINT "AirbnbHostAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ListingLink" ADD COLUMN "airbnbHostAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "ListingLink" ADD CONSTRAINT "ListingLink_airbnbHostAccountId_fkey" FOREIGN KEY ("airbnbHostAccountId") REFERENCES "AirbnbHostAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropIndex (allow multiple channel links per unit, e.g. several Airbnb iCals)
DROP INDEX IF EXISTS "ListingLink_rentableUnitId_channel_key";
