-- AlterTable ListingLink sync metadata
ALTER TABLE "ListingLink" ADD COLUMN "lastIcalFetchedAt" TIMESTAMP(3);
ALTER TABLE "ListingLink" ADD COLUMN "lastIcalFetchError" TEXT;

-- Invite
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'CARETAKER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");
CREATE INDEX "Invite_organizationId_email_idx" ON "Invite"("organizationId", "email");

ALTER TABLE "Invite" ADD CONSTRAINT "Invite_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Alerts & CMS
CREATE TABLE "ConflictAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "summary" TEXT NOT NULL,
    "detailJson" JSONB,
    "rentableUnitId" TEXT,
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConflictAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConflictAlert_organizationId_dismissedAt_createdAt_idx"
  ON "ConflictAlert"("organizationId", "dismissedAt", "createdAt");

ALTER TABLE "ConflictAlert" ADD CONSTRAINT "ConflictAlert_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SiteSection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteSection_organizationId_key_key" ON "SiteSection"("organizationId", "key");

ALTER TABLE "SiteSection" ADD CONSTRAINT "SiteSection_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaAsset_organizationId_key_key" ON "MediaAsset"("organizationId", "key");

ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
