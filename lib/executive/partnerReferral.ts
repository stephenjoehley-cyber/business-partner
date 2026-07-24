import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';

/**
 * Partner Capability, 23 July 2026. Called exactly once, at the moment
 * a Business is genuinely created for the first time (never on
 * update) — app/api/onboarding/business/route.ts.
 *
 * Deliberately quiet on failure: an invalid, typo'd, or inactive
 * referral code should never block signup, and never fabricate an
 * attribution that doesn't correspond to a real, active partner —
 * Product Truth applies to internal commercial records as much as
 * customer-facing copy. If no matching active partner exists, this
 * simply does nothing.
 *
 * PartnerReferral is create-only by design (Founder + CPO requirement)
 * — no update or delete function exists anywhere for it, and this
 * function never overwrites an existing row (businessId is unique).
 *
 * Demo mode never touches Postgres — matching every other module that
 * uses prisma directly, this checks isDemoMode() first. Partner
 * referrals are a real-commercial concern with no demo-mode analogue,
 * so this is simply a no-op there rather than a demo-data stub.
 */
export async function resolveReferral(businessId: string, referralCode: string | undefined): Promise<void> {
  if (isDemoMode() || !referralCode) return;

  const partner = await prisma.partner.findUnique({ where: { referralCode } });
  if (!partner || partner.status !== 'active') return;

  try {
    await prisma.partnerReferral.create({
      data: { businessId, partnerId: partner.id, referralCode },
    });
  } catch {
    // businessId is unique — a referral was already recorded for this
    // business. Should never happen given the caller only invokes this
    // on genuine first-time business creation, but referral resolution
    // must never be the thing that breaks onboarding itself.
  }
}
