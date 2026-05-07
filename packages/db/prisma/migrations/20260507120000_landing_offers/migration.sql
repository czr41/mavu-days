-- CreateTable
CREATE TABLE "LandingOffer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" VARCHAR(500) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingOffer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LandingOffer_organizationId_published_sortOrder_idx" ON "LandingOffer"("organizationId", "published", "sortOrder");

ALTER TABLE "LandingOffer" ADD CONSTRAINT "LandingOffer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
