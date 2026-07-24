-- Partner Capability — Founder + CPO, 23 July 2026. Business Partner
-- operating one of its own primary launch channels (publisher and
-- professional partnerships) in the same AI-first manner customers are
-- asked to operate their own businesses.

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "partnerName" TEXT NOT NULL,
    "organisation" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dateJoined" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3),

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRevenueShareTerm" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "revenueSharePercent" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "PartnerRevenueShareTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerReferral" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partner_authUserId_key" ON "Partner"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_referralCode_key" ON "Partner"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerReferral_businessId_key" ON "PartnerReferral"("businessId");

-- AddForeignKey
ALTER TABLE "PartnerRevenueShareTerm" ADD CONSTRAINT "PartnerRevenueShareTerm_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerReferral" ADD CONSTRAINT "PartnerReferral_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerReferral" ADD CONSTRAINT "PartnerReferral_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
