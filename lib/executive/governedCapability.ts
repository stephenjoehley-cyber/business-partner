import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

/**
 * Governed Capability Framework — Founder + CPO, 23 July 2026. The
 * control and publication layer through which the Executive Operating
 * Dashboard progressively governs how Business Partner operates
 * itself.
 *
 * Permanent architectural boundary: this module governs publication,
 * versioning, and distribution. It never establishes correctness. A
 * value reaching 'published' means it passed this platform's own
 * approval workflow — nothing more. For legal content specifically
 * (Terms, Privacy, Cookie Policy, whenever those domains arrive), this
 * framework has no opinion on whether the content is legally sound;
 * that responsibility sits entirely outside this system, with the
 * Founder and, where appropriate, legal advisers.
 */

export interface GovernedCapabilityRecord {
  id: string;
  domain: string;
  key: string;
  value: unknown;
  status: 'draft' | 'approved' | 'published' | 'superseded';
  proposedBy: string;
  proposedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  publishedAt: Date | null;
  supersedesId: string | null;
}

function toRecord(row: {
  id: string;
  domain: string;
  key: string;
  value: unknown;
  status: string;
  proposedBy: string;
  proposedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  publishedAt: Date | null;
  supersedesId: string | null;
}): GovernedCapabilityRecord {
  return { ...row, status: row.status as GovernedCapabilityRecord['status'] };
}

export async function proposeCapability(
  domain: string,
  key: string,
  value: unknown,
  proposedBy: string
): Promise<GovernedCapabilityRecord> {
  const row = await prisma.governedCapability.create({
    data: { domain, key, value: value as unknown as Prisma.InputJsonValue, status: 'draft', proposedBy },
  });
  return toRecord(row);
}

export class InvalidCapabilityTransitionError extends Error {
  constructor(fromStatus: string, action: string) {
    super(`Cannot ${action} a capability in status '${fromStatus}'`);
    this.name = 'InvalidCapabilityTransitionError';
  }
}

export async function approveCapability(id: string, approvedBy: string): Promise<GovernedCapabilityRecord> {
  const existing = await prisma.governedCapability.findUniqueOrThrow({ where: { id } });
  if (existing.status !== 'draft') {
    throw new InvalidCapabilityTransitionError(existing.status, 'approve');
  }
  const row = await prisma.governedCapability.update({
    where: { id },
    data: { status: 'approved', approvedBy, approvedAt: new Date() },
  });
  return toRecord(row);
}

/**
 * Publishing supersedes whatever was previously published for this
 * domain+key — the prior row's status becomes 'superseded', never
 * deleted, preserving the full history. Both writes happen in one
 * transaction so a consumer can never observe a moment with either
 * zero or two 'published' rows for the same key.
 */
export async function publishCapability(id: string): Promise<GovernedCapabilityRecord> {
  const existing = await prisma.governedCapability.findUniqueOrThrow({ where: { id } });
  if (existing.status !== 'approved') {
    throw new InvalidCapabilityTransitionError(existing.status, 'publish');
  }

  const [, published] = await prisma.$transaction([
    prisma.governedCapability.updateMany({
      where: { domain: existing.domain, key: existing.key, status: 'published' },
      data: { status: 'superseded' },
    }),
    prisma.governedCapability.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date(), supersedesId: existing.supersedesId },
    }),
  ]);
  return toRecord(published);
}

/**
 * The single source of truth every consumer (website, onboarding,
 * reporting) reads from. Always the latest published version, never a
 * draft or an approved-but-unpublished one — a consumer should never
 * see a change before it has actually gone live.
 */
export async function getPublishedValue(domain: string, key: string): Promise<unknown | undefined> {
  const row = await prisma.governedCapability.findFirst({
    where: { domain, key, status: 'published' },
    orderBy: { publishedAt: 'desc' },
  });
  return row?.value;
}

/** Full history for a key — every version ever proposed, who proposed and approved it, and when it was superseded. */
export async function getCapabilityHistory(domain: string, key: string): Promise<GovernedCapabilityRecord[]> {
  const rows = await prisma.governedCapability.findMany({
    where: { domain, key },
    orderBy: { proposedAt: 'desc' },
  });
  return rows.map(toRecord);
}

/** Every pending (draft or approved-but-not-yet-published) proposal for a domain, for the review/approve UI. */
export async function getPendingCapabilities(domain: string): Promise<GovernedCapabilityRecord[]> {
  const rows = await prisma.governedCapability.findMany({
    where: { domain, status: { in: ['draft', 'approved'] } },
    orderBy: { proposedAt: 'desc' },
  });
  return rows.map(toRecord);
}
