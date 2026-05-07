-- Site alignment: org homepage mode + per-unit marketing listings

CREATE TYPE "OrgHomepageKind" AS ENUM ('LISTING_GRID', 'MATRIX_THREE_SKU');

CREATE TYPE "RentableUnitMatrixRole" AS ENUM ('NONE', 'FULL_FARM', 'VILLA_1BHK', 'VILLA_2BHK');

CREATE TABLE "OrgSiteSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "homepageKind" "OrgHomepageKind" NOT NULL DEFAULT 'LISTING_GRID',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgSiteSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgSiteSettings_organizationId_key" ON "OrgSiteSettings"("organizationId");

ALTER TABLE "OrgSiteSettings" ADD CONSTRAINT "OrgSiteSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RentableUnitListing" (
    "id" TEXT NOT NULL,
    "rentableUnitId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "matrixRole" "RentableUnitMatrixRole" NOT NULL DEFAULT 'NONE',
    "cardTitle" TEXT NOT NULL,
    "cardShort" VARCHAR(4000) NOT NULL,
    "bestFor" JSONB NOT NULL DEFAULT '[]',
    "descriptionMarkdown" TEXT NOT NULL,
    "highlights" JSONB NOT NULL DEFAULT '[]',
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "ctaLabel" TEXT,
    "weekdayPriceMinor" INTEGER,
    "fridayPriceMinor" INTEGER,
    "saturdayPriceMinor" INTEGER,
    "sundayPriceMinor" INTEGER,
    "longWeekendPriceMinor" INTEGER,
    "guestsHint" INTEGER,
    "bedroomsHint" INTEGER,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "detailHeroUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentableUnitListing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RentableUnitListing_rentableUnitId_key" ON "RentableUnitListing"("rentableUnitId");

ALTER TABLE "RentableUnitListing" ADD CONSTRAINT "RentableUnitListing_rentableUnitId_fkey" FOREIGN KEY ("rentableUnitId") REFERENCES "RentableUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
