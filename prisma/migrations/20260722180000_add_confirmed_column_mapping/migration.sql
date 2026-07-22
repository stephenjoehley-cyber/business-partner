-- Multi-format CSV Understanding — Implementation Plan, 22 July 2026
-- (Founder + CPO). Additive only. Confirmed Mapping Memory (Founder
-- Decision 1) — durable per (business, documentType, sourceSignature).

-- CreateTable
CREATE TABLE "ConfirmedColumnMapping" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "sourceSignature" TEXT NOT NULL,
    "columnMapping" JSONB NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfirmedColumnMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfirmedColumnMapping_businessId_documentType_sourceSigna_key" ON "ConfirmedColumnMapping"("businessId", "documentType", "sourceSignature");

-- AddForeignKey
ALTER TABLE "ConfirmedColumnMapping" ADD CONSTRAINT "ConfirmedColumnMapping_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
