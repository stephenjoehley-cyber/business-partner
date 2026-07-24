-- Financial Evidence History — Founder + CPO, 23 July 2026. Durable
-- persistence of per-row exclusion reasons, deferred at F1's own
-- completion.

-- CreateTable
CREATE TABLE "ExcludedRowRecord" (
    "id" TEXT NOT NULL,
    "signalSourceId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "ExcludedRowRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExcludedRowRecord_signalSourceId_idx" ON "ExcludedRowRecord"("signalSourceId");

-- AddForeignKey
ALTER TABLE "ExcludedRowRecord" ADD CONSTRAINT "ExcludedRowRecord_signalSourceId_fkey" FOREIGN KEY ("signalSourceId") REFERENCES "SignalSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
