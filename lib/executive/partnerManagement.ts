import { prisma } from '@/lib/prisma';

/**
 * Partner Capability, 23 July 2026 — found necessary live during
 * Founder Acceptance: no way existed to correct a partner's details,
 * renegotiate their revenue share, or remove test records.
 *
 * Revenue share changes are deliberately never a simple overwrite.
 * PartnerRevenueShareTerm exists specifically so a past month's
 * calculation always uses whatever rate was actually in effect then —
 * changing it here closes the current term (effectiveTo = now) and
 * opens a new one, preserving that history rather than undoing the
 * reason that model exists.
 */

export interface UpdatePartnerFields {
  partnerName?: string;
  organisation?: string;
  contactEmail?: string;
  status?: 'active' | 'inactive';
  revenueSharePercent?: number;
}

export class InvalidRevenueShareError extends Error {
  constructor() {
    super('Revenue share must be a number between 0 and 100');
    this.name = 'InvalidRevenueShareError';
  }
}

export class PartnerDeletionBlockedError extends Error {
  constructor() {
    super('This partner has real referred signups and cannot be deleted. Set them to Inactive instead.');
    this.name = 'PartnerDeletionBlockedError';
  }
}

export async function updatePartner(partnerId: string, fields: UpdatePartnerFields): Promise<void> {
  if (fields.revenueSharePercent !== undefined) {
    if (typeof fields.revenueSharePercent !== 'number' || fields.revenueSharePercent < 0 || fields.revenueSharePercent > 100) {
      throw new InvalidRevenueShareError();
    }
    const currentTerm = await prisma.partnerRevenueShareTerm.findFirst({
      where: { partnerId, effectiveTo: null },
    });
    await prisma.$transaction([
      ...(currentTerm
        ? [prisma.partnerRevenueShareTerm.update({ where: { id: currentTerm.id }, data: { effectiveTo: new Date() } })]
        : []),
      prisma.partnerRevenueShareTerm.create({
        data: { partnerId, revenueSharePercent: fields.revenueSharePercent },
      }),
    ]);
  }

  const { revenueSharePercent, ...directFields } = fields;
  if (Object.keys(directFields).length > 0) {
    await prisma.partner.update({ where: { id: partnerId }, data: directFields });
  }
}

/**
 * Delete is only permitted when a partner has zero real referrals —
 * PartnerReferral's own foreign key (ON DELETE RESTRICT) already
 * enforces this at the database level, but this checks explicitly
 * first so the caller gets a clear, specific error rather than a raw
 * database constraint violation. A partner with real referral history
 * should be deactivated (status), never deleted — deleting them would
 * either fail outright or require destroying immutable attribution
 * history, exactly what PartnerReferral's create-only design exists to
 * prevent.
 */
export async function deletePartner(partnerId: string): Promise<void> {
  const referralCount = await prisma.partnerReferral.count({ where: { partnerId } });
  if (referralCount > 0) {
    throw new PartnerDeletionBlockedError();
  }

  await prisma.$transaction([
    prisma.partnerRevenueShareTerm.deleteMany({ where: { partnerId } }),
    prisma.partner.delete({ where: { id: partnerId } }),
  ]);
}
