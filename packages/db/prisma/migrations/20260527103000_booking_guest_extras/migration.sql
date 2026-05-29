-- Guest extras: pets flag, ID proof attachments JSON, WhatsApp reminder timestamp.
ALTER TABLE "Booking" ADD COLUMN "travellingWithPets" BOOLEAN;
ALTER TABLE "Booking" ADD COLUMN "idProofDocuments" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Booking" ADD COLUMN "guestIdReminderSentAt" TIMESTAMP(3);
