-- Governed Capability Framework — Founder + CPO, 23 July 2026. A
-- genuinely new, platform-level (not Business-scoped) model — Business
-- Partner's own operational data, not a customer's.

-- CreateTable
CREATE TABLE "GovernedCapability" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "supersedesId" TEXT,

    CONSTRAINT "GovernedCapability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GovernedCapability_domain_key_status_idx" ON "GovernedCapability"("domain", "key", "status");
