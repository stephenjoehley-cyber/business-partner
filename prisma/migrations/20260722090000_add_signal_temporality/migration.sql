-- Product Audit — F0: Signal Temporality, 22 July 2026 (Founder + CPO).
-- Additive only. Existing rows get temporality = 'continuous' (the default),
-- which preserves their current behaviour in qualify.ts and understand.ts
-- exactly. reportingPeriodStart/End and provenance are nullable and only
-- populated by snapshot-producing extractors (none exist yet).

ALTER TABLE "Signal" ADD COLUMN "temporality" TEXT NOT NULL DEFAULT 'continuous';
ALTER TABLE "Signal" ADD COLUMN "reportingPeriodStart" TIMESTAMP(3);
ALTER TABLE "Signal" ADD COLUMN "reportingPeriodEnd" TIMESTAMP(3);
ALTER TABLE "Signal" ADD COLUMN "provenance" JSONB;
