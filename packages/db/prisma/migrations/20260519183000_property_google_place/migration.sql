-- Per-property Google Place ID for Maps review sync (Google at property scope).
ALTER TABLE "Property" ADD COLUMN "googlePlaceId" TEXT;

-- Copy legacy org-wide Place ID onto each property once (single-org hosts keep working without re-entry).
UPDATE "Property" AS p
SET "googlePlaceId" = trim(both from s."googlePlaceId")
FROM "OrgSiteSettings" AS s
WHERE s."organizationId" = p."organizationId"
  AND s."googlePlaceId" IS NOT NULL
  AND length(trim(both from s."googlePlaceId")) > 6;
