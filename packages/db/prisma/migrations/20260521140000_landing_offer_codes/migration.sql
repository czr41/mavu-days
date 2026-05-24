-- AlterTable
ALTER TABLE "LandingOffer" ADD COLUMN "code" VARCHAR(48);
ALTER TABLE "LandingOffer" ADD COLUMN "detailMarkdown" TEXT;
ALTER TABLE "LandingOffer" ADD COLUMN "validFrom" DATE;
ALTER TABLE "LandingOffer" ADD COLUMN "validTo" DATE;
ALTER TABLE "LandingOffer" ADD COLUMN "showOnHomeTicker" BOOLEAN NOT NULL DEFAULT true;

-- Backfill stable unique codes from existing ids
UPDATE "LandingOffer" SET "code" = ('O' || REPLACE(CAST("id" AS TEXT), '-', '')) WHERE "code" IS NULL;

ALTER TABLE "LandingOffer" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "LandingOffer_organizationId_code_key" ON "LandingOffer"("organizationId", "code");
