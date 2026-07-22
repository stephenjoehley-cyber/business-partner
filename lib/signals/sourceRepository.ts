import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';
import {
  createDemoSignalSource,
  findDemoSignalSourceByChecksum,
  updateDemoSignalSource,
  getDemoSignalSource,
  listDemoSignalSourcesForBusiness,
} from '@/lib/demo/store';

/**
 * Product Audit — F1: Aged Debtors/Creditors, 22 July 2026 (Founder + CPO).
 *
 * The one place SignalSource persistence happens — same "one module owns
 * persistence" principle as lib/signals/repository.ts and
 * lib/cognition/repository.ts, extended to this new model rather than
 * scattered across the Signal Ingestion Service and route handlers.
 */

export interface SignalSourceInput {
  businessId: string;
  documentType: string;
  acquisitionMethod: string;
  originalFilename: string;
  checksum: string;
  reportingDate?: Date;
  fileLevelCurrency?: string;
  externalSourceRef?: string;
  totalRowCount: number;
  processedRowCount: number;
  excludedRowCount: number;
  reconciliationResult: string;
  status: string;
}

export interface SignalSourceRecord extends SignalSourceInput {
  id: string;
  createdAt: Date;
}

export async function createSignalSource(input: SignalSourceInput): Promise<SignalSourceRecord> {
  if (isDemoMode()) {
    return createDemoSignalSource(input);
  }
  const row = await prisma.signalSource.create({ data: input });
  return row as SignalSourceRecord;
}

/**
 * File-level idempotency (Founder/CPO, F1 audit v2 §6): a byte-identical
 * re-upload is detected here, before any extraction work happens, via the
 * (businessId, checksum) unique constraint — checking first rather than
 * relying on the constraint to reject a duplicate insert, so the Ingestion
 * Service can return the existing summary cleanly rather than handling a
 * database error as its control flow.
 */
export async function findSignalSourceByChecksum(
  businessId: string,
  checksum: string
): Promise<SignalSourceRecord | undefined> {
  if (isDemoMode()) {
    return findDemoSignalSourceByChecksum(businessId, checksum);
  }
  const row = await prisma.signalSource.findUnique({
    where: { businessId_checksum: { businessId, checksum } },
  });
  return (row as SignalSourceRecord) ?? undefined;
}

export async function updateSignalSource(
  id: string,
  updates: Partial<Omit<SignalSourceInput, 'businessId'>>
): Promise<SignalSourceRecord | undefined> {
  if (isDemoMode()) {
    return updateDemoSignalSource(id, updates);
  }
  const row = await prisma.signalSource.update({ where: { id }, data: updates });
  return row as SignalSourceRecord;
}

export async function getSignalSource(id: string): Promise<SignalSourceRecord | undefined> {
  if (isDemoMode()) {
    return getDemoSignalSource(id);
  }
  const row = await prisma.signalSource.findUnique({ where: { id } });
  return (row as SignalSourceRecord) ?? undefined;
}

/** Backs the upload history list (Audit v2 §15). */
export async function listSignalSourcesForBusiness(businessId: string): Promise<SignalSourceRecord[]> {
  if (isDemoMode()) {
    return listDemoSignalSourcesForBusiness(businessId);
  }
  const rows = await prisma.signalSource.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
  });
  return rows as SignalSourceRecord[];
}
