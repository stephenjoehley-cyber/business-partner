import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { isDemoMode } from '@/lib/demo/config';
import { findDemoConfirmedColumnMapping, upsertDemoConfirmedColumnMapping } from '@/lib/demo/store';
import { hasConflictingMapping } from '@/lib/signals/schemaMapping';

/**
 * Multi-format CSV Understanding, 22 July 2026 (Founder Decision 1 —
 * Confirmed Mapping Memory). Same "one module owns persistence"
 * principle as lib/signals/sourceRepository.ts, extended to this model.
 *
 * Refinement 2 is enforced here, at the one place a write actually
 * happens: hasConflictingMapping is checked before every write, and a
 * genuine conflict throws rather than silently overwriting — the
 * Signal Ingestion Service (caller) is responsible for catching that
 * and turning it into a fresh confirmation round with the owner, never
 * for calling this function expecting it to resolve the conflict itself.
 */

export class ConfirmedMappingConflictError extends Error {
  constructor(public readonly conflictingHeaders: string[]) {
    super(`Confirmed mapping conflict for headers: ${conflictingHeaders.join(', ')}`);
    this.name = 'ConfirmedMappingConflictError';
  }
}

export interface ConfirmedColumnMappingRecord {
  id: string;
  businessId: string;
  documentType: string;
  sourceSignature: string;
  columnMapping: Record<string, string>;
  confirmedAt: Date;
  updatedAt: Date;
}

export async function findConfirmedColumnMapping(
  businessId: string,
  documentType: string,
  sourceSignature: string
): Promise<ConfirmedColumnMappingRecord | undefined> {
  if (isDemoMode()) {
    return findDemoConfirmedColumnMapping(businessId, documentType, sourceSignature);
  }
  const row = await prisma.confirmedColumnMapping.findUnique({
    where: { businessId_documentType_sourceSignature: { businessId, documentType, sourceSignature } },
  });
  if (!row) return undefined;
  return { ...row, columnMapping: row.columnMapping as unknown as Record<string, string> };
}

/**
 * Extends (or creates) the confirmed mapping for this business,
 * document type, and source signature with newMappingEntries. Throws
 * ConfirmedMappingConflictError if any entry disagrees with what's
 * already stored — never silently overwrites (Refinement 2).
 */
export async function upsertConfirmedColumnMapping(
  businessId: string,
  documentType: string,
  sourceSignature: string,
  newMappingEntries: Record<string, string>
): Promise<ConfirmedColumnMappingRecord> {
  const existing = await findConfirmedColumnMapping(businessId, documentType, sourceSignature);

  if (existing && hasConflictingMapping(existing.columnMapping, newMappingEntries)) {
    const conflictingHeaders = Object.keys(newMappingEntries).filter(
      (h) => existing.columnMapping[h] !== undefined && existing.columnMapping[h] !== newMappingEntries[h]
    );
    throw new ConfirmedMappingConflictError(conflictingHeaders);
  }

  if (isDemoMode()) {
    return upsertDemoConfirmedColumnMapping(businessId, documentType, sourceSignature, newMappingEntries);
  }

  const mergedMapping = { ...(existing?.columnMapping ?? {}), ...newMappingEntries };
  const row = await prisma.confirmedColumnMapping.upsert({
    where: { businessId_documentType_sourceSignature: { businessId, documentType, sourceSignature } },
    update: { columnMapping: mergedMapping as unknown as Prisma.InputJsonValue },
    create: { businessId, documentType, sourceSignature, columnMapping: mergedMapping as unknown as Prisma.InputJsonValue },
  });
  return { ...row, columnMapping: row.columnMapping as unknown as Record<string, string> };
}
