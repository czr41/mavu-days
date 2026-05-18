-- Optional per-person extra guest fee (same currency units as nightly rates).
ALTER TABLE "RentableUnitListing" ADD COLUMN "extraGuestPriceMinor" INTEGER;
