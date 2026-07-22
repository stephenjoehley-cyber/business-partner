import { createHash } from 'crypto';
import { agedDebtorsExtractor, agedCreditorsExtractor } from '@/lib/signals/extractors/agedDebtorsCreditors';
import type { DocumentSignalExtractor, OwnerConfirmation, ExcludedRow, RejectionKind } from '@/lib/signals/extractor';
import type { RawDocumentInput } from '@/lib/signals/types';
import { persistSignals } from '@/lib/signals/repository';
import {
  createSignalSource,
  findSignalSourceByChecksum,
  updateSignalSource,
  type SignalSourceRecord,
} from '@/lib/signals/sourceRepository';
import { getBusinessById } from '@/lib/brain/repository';
import { qualify } from '@/lib/cognition/qualify';

/**
 * Product Audit — F1: Aged Debtors/Creditors, 22 July 2026 (Founder + CPO
 * architectural amendment). The one place a push-acquired signal is
 * coordinated — the direct sibling of dailyCycle.ts for the pull path.
 *
 * The upload API route must not become a second orchestration path: it
 * authenticates and accepts input, nothing more. This function owns
 * extraction, confirmation-gating, persistence, and SignalSource
 * lifecycle — the route calls this and nothing else.
 */

const EXTRACTORS: Record<'aged_debtors' | 'aged_creditors', DocumentSignalExtractor> = {
  aged_debtors: agedDebtorsExtractor,
  aged_creditors: agedCreditorsExtractor,
};

export type IngestionResult =
  | { status: 'duplicate'; source: SignalSourceRecord }
  | { status: 'rejected'; kind: RejectionKind; reason: string }
  | { status: 'pending_confirmation'; sourceId: string; needsCurrency: boolean; needsReportingDate: boolean }
  | { status: 'completed'; source: SignalSourceRecord; excludedRows: ExcludedRow[]; qualifiedCount: number };

export async function ingestDocument(
  businessId: string,
  documentType: 'aged_debtors' | 'aged_creditors',
  file: { filename: string; content: string },
  confirmation?: OwnerConfirmation
): Promise<IngestionResult> {
  const business = await getBusinessById(businessId);
  if (!business) {
    throw new Error(`No business found for id: ${businessId}`);
  }

  const checksum = createHash('sha256').update(file.content).digest('hex');

  // File-level idempotency (Audit v2 §6) — checked before any extraction
  // work happens.
  const existing = await findSignalSourceByChecksum(businessId, checksum);
  if (existing && existing.status !== 'pending_confirmation') {
    return { status: 'duplicate', source: existing };
  }

  const extractor = EXTRACTORS[documentType];
  const context = { business, goals: business.goals, people: business.people };
  const input: RawDocumentInput = { format: 'csv', content: file.content };
  const outcome = extractor.extract(input, context, confirmation);

  if (outcome.status === 'rejected') {
    await createSignalSource({
      businessId,
      documentType,
      acquisitionMethod: extractor.acquisitionMethod,
      originalFilename: file.filename,
      checksum,
      totalRowCount: 0,
      processedRowCount: 0,
      excludedRowCount: 0,
      reconciliationResult: 'unavailable',
      status: 'rejected',
    });
    return { status: 'rejected', kind: outcome.kind, reason: outcome.reason };
  }

  if (outcome.status === 'pending_confirmation') {
    // Reuse the existing pending record on a follow-up confirmation call,
    // rather than creating a second one for the same checksum.
    const source =
      existing ??
      (await createSignalSource({
        businessId,
        documentType,
        acquisitionMethod: extractor.acquisitionMethod,
        originalFilename: file.filename,
        checksum,
        totalRowCount: 0,
        processedRowCount: 0,
        excludedRowCount: 0,
        reconciliationResult: 'unavailable',
        status: 'pending_confirmation',
      }));
    return {
      status: 'pending_confirmation',
      sourceId: source.id,
      needsCurrency: outcome.needsCurrency,
      needsReportingDate: outcome.needsReportingDate,
    };
  }

  // status === 'extracted'. Reuse the existing pending SignalSource on a
  // confirmation follow-up, rather than creating a second row for the
  // same checksum — creating here would violate the very
  // (businessId, checksum) uniqueness the schema defines for idempotency.
  const sourceData = {
    businessId,
    documentType,
    acquisitionMethod: extractor.acquisitionMethod,
    originalFilename: file.filename,
    checksum,
    reportingDate: outcome.reportingDate,
    fileLevelCurrency: outcome.fileLevelCurrency,
    totalRowCount: outcome.totalRowCount,
    processedRowCount: outcome.signals.length,
    excludedRowCount: outcome.excludedRowCount,
    reconciliationResult: outcome.reconciliationResult,
    status: 'processing',
  };
  const source = existing
    ? ((await updateSignalSource(existing.id, sourceData)) ?? { id: existing.id, ...sourceData, createdAt: existing.createdAt })
    : await createSignalSource(sourceData);

  const signalsWithSource = outcome.signals.map((s) => ({ ...s, sourceId: source.id }));
  const persisted = await persistSignals(businessId, signalsWithSource);

  const completed = await updateSignalSource(source.id, { status: 'completed' });

  // "A few of these are worth your attention" vs "Nothing here needs you
  // right now" (approved copy, Section 6) requires knowing how many of
  // these signals actually qualify — not just how many were written.
  // Reuses the real Qualification Gate directly, the same admission
  // logic the next Morning Brief cycle will apply, rather than
  // duplicating or approximating it here.
  const { admitted } = qualify(persisted, context);

  return {
    status: 'completed',
    source: completed ?? { ...source, status: 'completed' },
    excludedRows: outcome.excludedRows,
    qualifiedCount: admitted.length,
  };
}
