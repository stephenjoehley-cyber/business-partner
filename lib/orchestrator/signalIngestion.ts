import { createHash } from 'crypto';
import Papa from 'papaparse';
import { agedDebtorsExtractor, agedCreditorsExtractor } from '@/lib/signals/extractors/agedDebtorsCreditors';
import type { DocumentSignalExtractor, OwnerConfirmation, ExcludedRow, RejectionKind } from '@/lib/signals/extractor';
import { computeSourceSignature, type ColumnMappingQuestion } from '@/lib/signals/schemaMapping';
import type { RawDocumentInput } from '@/lib/signals/types';
import { persistSignals } from '@/lib/signals/repository';
import {
  createSignalSource,
  findSignalSourceByChecksum,
  updateSignalSource,
  type SignalSourceRecord,
} from '@/lib/signals/sourceRepository';
import {
  findConfirmedColumnMapping,
  upsertConfirmedColumnMapping,
  ConfirmedMappingConflictError,
} from '@/lib/signals/confirmedColumnMappingRepository';
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
  | {
      status: 'pending_confirmation';
      sourceId: string;
      needsCurrency: boolean;
      needsReportingDate: boolean;
      columnMappingQuestions?: ColumnMappingQuestion[];
    }
  | { status: 'completed'; source: SignalSourceRecord; excludedRows: ExcludedRow[]; qualifiedCount: number; mappingRemembered: boolean };

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
  // work happens. Only a genuinely *completed* prior upload counts as a
  // real duplicate. A rejected attempt produced no understanding at all —
  // treating it the same as a completed one would permanently block a
  // retry of the same file under a corrected document-type selection,
  // which is exactly the real defect found live, 22 July 2026 (Founder
  // Acceptance Test): a first attempt rejected for the wrong document
  // type, followed by a correct retry that was wrongly told "I've
  // already got this one" and never actually re-evaluated.
  const existing = await findSignalSourceByChecksum(businessId, checksum);
  if (existing?.status === 'completed') {
    return { status: 'duplicate', source: existing };
  }

  const extractor = EXTRACTORS[documentType];
  const context = { business, goals: business.goals, people: business.people };
  const input: RawDocumentInput = { format: 'csv', content: file.content };

  // Multi-format CSV Understanding, 22 July 2026 (Founder Decision 1 —
  // Confirmed Mapping Memory). A cheap header-only peek (Papa's preview
  // option limits parsing regardless of file size) so any previously
  // confirmed mapping for this exact header set can be found before
  // extraction runs — the extractor itself never touches the database;
  // this is the one place that lookup happens.
  //
  // Found live during Founder Acceptance, 22 July 2026: memory and the
  // owner's fresh answer must stay in two separate fields all the way
  // to the extractor, never merged here. An earlier version merged them
  // into one columnMapping before this point, which made the extractor
  // unable to tell "the owner just confirmed this" apart from "this was
  // already remembered" — the "I'll remember this" notice repeated on
  // every upload from an already-known source instead of only the first.
  const headerPeek = Papa.parse<string[]>(input.content, { skipEmptyLines: true, preview: 1 }).data[0];
  const peekedSignature = headerPeek?.length ? computeSourceSignature(headerPeek) : undefined;
  const confirmedMemory = peekedSignature ? await findConfirmedColumnMapping(businessId, documentType, peekedSignature) : undefined;
  const mergedConfirmation: OwnerConfirmation | undefined =
    confirmation || confirmedMemory
      ? { ...confirmation, confirmedMemoryMapping: confirmedMemory?.columnMapping }
      : undefined;

  const outcome = extractor.extract(input, context, mergedConfirmation);

  // Every branch below reuses (updates) an existing rejected/pending
  // record for this checksum rather than creating a second one —
  // required regardless of the prior status, since the
  // (businessId, checksum) uniqueness constraint doesn't care why the
  // earlier row exists. Always writes the *current* attempt's
  // documentType/filename, since a retry may correct exactly those.
  async function upsertSource(data: Omit<Parameters<typeof createSignalSource>[0], 'businessId'>) {
    if (existing) {
      return (await updateSignalSource(existing.id, data)) ?? { id: existing.id, businessId, createdAt: existing.createdAt, ...data };
    }
    return createSignalSource({ businessId, ...data });
  }

  if (outcome.status === 'rejected') {
    await upsertSource({
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
    const source = await upsertSource({
      documentType,
      acquisitionMethod: extractor.acquisitionMethod,
      originalFilename: file.filename,
      checksum,
      totalRowCount: 0,
      processedRowCount: 0,
      excludedRowCount: 0,
      reconciliationResult: 'unavailable',
      status: 'pending_confirmation',
    });
    return {
      status: 'pending_confirmation',
      sourceId: source.id,
      needsCurrency: outcome.needsCurrency,
      needsReportingDate: outcome.needsReportingDate,
      columnMappingQuestions: outcome.columnMappingQuestions,
    };
  }

  // status === 'extracted'
  const source = await upsertSource({
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
  });

  const signalsWithSource = outcome.signals.map((s) => ({ ...s, sourceId: source.id }));
  const persisted = await persistSignals(businessId, signalsWithSource);

  const completed = await updateSignalSource(source.id, { status: 'completed' });

  // Confirmed Mapping Memory write (Founder Decision 1). Refinement 2:
  // never silently overwrite. A genuine conflict here would mean this
  // exact header set was previously confirmed to mean something
  // different — a real, rare edge case. The extraction the owner just
  // completed still stands (it used this round's answers, which are
  // authoritative for this upload); the conflicting memory write is
  // simply skipped rather than silently applied, so a future upload of
  // this same source is asked fresh rather than inheriting a resolved
  // disagreement neither the code nor the owner actually settled.
  let mappingRemembered = false;
  if (outcome.resolvedColumnMapping && outcome.sourceSignature) {
    try {
      await upsertConfirmedColumnMapping(businessId, documentType, outcome.sourceSignature, outcome.resolvedColumnMapping);
      mappingRemembered = true;
    } catch (err) {
      if (!(err instanceof ConfirmedMappingConflictError)) throw err;
    }
  }

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
    mappingRemembered,
  };
}
