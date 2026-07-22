-- Product Audit — F1: Aged Debtors/Creditors Structured Extractor, 22 July
-- 2026 (Founder + CPO). Additive only. No existing Signal row is affected —
-- sourceId and sourceRowNumber are nullable, populated only by future
-- DocumentSignalExtractor-produced snapshot signals.

-- CreateTable
CREATE TABLE "SignalSource" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "acquisitionMethod" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "reportingDate" TIMESTAMP(3),
    "fileLevelCurrency" TEXT,
    "externalSourceRef" TEXT,
    "totalRowCount" INTEGER NOT NULL,
    "processedRowCount" INTEGER NOT NULL,
    "excludedRowCount" INTEGER NOT NULL,
    "reconciliationResult" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignalSource_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Signal" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "Signal" ADD COLUMN "sourceRowNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "SignalSource_businessId_checksum_key" ON "SignalSource"("businessId", "checksum");

-- AddForeignKey
ALTER TABLE "SignalSource" ADD CONSTRAINT "SignalSource_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SignalSource"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
