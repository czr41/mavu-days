-- CreateEnum
CREATE TYPE "GalleryCategory" AS ENUM ('ROOM', 'OUTDOOR', 'PORCH', 'VIEW', 'OTHER');

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN "galleryCategory" "GalleryCategory";
