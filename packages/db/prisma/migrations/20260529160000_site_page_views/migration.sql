CREATE TABLE "SitePageView" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "referrerHost" VARCHAR(200),
    "visitorKey" VARCHAR(64),
    "deviceClass" VARCHAR(16),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SitePageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SitePageView_organizationId_createdAt_idx" ON "SitePageView"("organizationId", "createdAt");
CREATE INDEX "SitePageView_organizationId_path_createdAt_idx" ON "SitePageView"("organizationId", "path", "createdAt");

ALTER TABLE "SitePageView" ADD CONSTRAINT "SitePageView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
