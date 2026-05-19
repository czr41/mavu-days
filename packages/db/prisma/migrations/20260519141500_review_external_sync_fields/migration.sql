-- AlterTable
ALTER TABLE "OrgSiteSettings" ADD COLUMN "googlePlaceId" TEXT;
ALTER TABLE "OrgSiteSettings" ADD COLUMN "airbnbReviewsListingUrl" TEXT;

-- AlterTable
ALTER TABLE "GuestReview" ADD COLUMN "autoSynced" BOOLEAN NOT NULL DEFAULT false;
