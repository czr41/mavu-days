-- Airbnb marketing + per-stay gallery (URL list); scraped photos stored as HTTPS URLs only.
ALTER TABLE "RentableUnitListing" ADD COLUMN "airbnbProfileLabel" TEXT,
ADD COLUMN "airbnbListingUrl" TEXT,
ADD COLUMN "galleryImageUrls" JSONB NOT NULL DEFAULT '[]';
