-- Many-to-many: CMS media asset ↔ rentable units (stay listings share pool photos).

CREATE TABLE "MediaAssetRentableUnit" (
    "mediaAssetId" TEXT NOT NULL,
    "rentableUnitId" TEXT NOT NULL,

    CONSTRAINT "MediaAssetRentableUnit_pkey" PRIMARY KEY ("mediaAssetId","rentableUnitId")
);

CREATE INDEX "MediaAssetRentableUnit_rentableUnitId_idx" ON "MediaAssetRentableUnit"("rentableUnitId");

ALTER TABLE "MediaAssetRentableUnit" ADD CONSTRAINT "MediaAssetRentableUnit_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaAssetRentableUnit" ADD CONSTRAINT "MediaAssetRentableUnit_rentableUnitId_fkey" FOREIGN KEY ("rentableUnitId") REFERENCES "RentableUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
