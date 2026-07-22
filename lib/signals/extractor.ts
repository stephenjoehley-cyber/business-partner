import type { BusinessContext } from './provider';
import type { DraftSignal, RawDocumentInput } from './types';
import type { ColumnMappingQuestion } from './schemaMapping';

/**
 * Product Audit — F1: Aged Debtors/Creditors, 22 July 2026 (Founder + CPO).
 *
 * A sibling contract to SignalProvider (provider.ts), not an implementer
 * of it. SignalProvider.fetchSignals(context, window) is a pull contract —
 * the Orchestrator calls it on a schedule. A document upload is a push
 * event: the owner acts at an arbitrary moment. Forcing that into the pull
 * shape for surface-level consistency was rejected in the audit; instead,
 * both contracts write into the same Signal model via the same
 * persistSignals function — that's the real seam, and it holds without
 * distorting either contract's shape.
 *
 * documentType and acquisitionMethod are deliberately separate concepts
 * (Founder/CPO architectural provisioning) — a future Xero-backed
 * 'aged_debtors' source is a new acquisitionMethod against the same
 * documentType, not a new extractor contract.
 */
export interface DocumentSignalExtractor {
  readonly documentType: 'aged_debtors' | 'aged_creditors';
  readonly acquisitionMethod: 'csv_upload' | 'pdf_upload' | 'api';
  extract(input: RawDocumentInput, context: BusinessContext, confirmation?: OwnerConfirmation): ExtractionOutcome;
}

/**
 * Supplied once an owner has resolved a pending_confirmation outcome
 * (Audit v2 §3, §7 — currency and/or reporting date could not be reliably
 * extracted). All optional: a file might be missing only one.
 *
 * columnMapping and confirmedMemoryMapping (Multi-format CSV
 * Understanding, 22 July 2026) are deliberately kept separate — found
 * live during Founder Acceptance, 22 July 2026: an earlier version
 * merged them into one field before this point, which meant the
 * extractor could no longer tell "the owner just confirmed this" apart
 * from "this was already remembered," and repeated the "I'll remember
 * this" notice on every upload from an already-known source instead of
 * only the first. Both feed the same resolution (Refinement 2: owner-
 * confirmed understanding always takes precedence over inference), but
 * only columnMapping is ever treated as newly worth remembering.
 */
export interface OwnerConfirmation {
  currency?: string;
  reportingDate?: Date;
  /** The owner's fresh answers this specific round — never includes anything already known from Confirmed Mapping Memory. */
  columnMapping?: Record<string, string>;
  /** Everything already confirmed for this business+source, supplied by the caller for resolution purposes only — never treated as "new" by the extractor. */
  confirmedMemoryMapping?: Record<string, string>;
}

/**
 * Reason codes, not owner-facing copy — translated to plain language at
 * the route layer (Section 19 of the approved copy draft), keeping the
 * extractor itself free of presentation concerns, same separation as
 * everywhere else in this codebase.
 */
export type ExcludedRowReason =
  | 'missing_required_field'
  | 'unparseable_amount'
  | 'unparseable_due_date'
  | 'missing_currency'
  | 'conflicting_duplicate';

export interface ExcludedRow {
  rowNumber: number;
  reason: ExcludedRowReason;
}

export type RejectionKind = 'wrong_document_type' | 'empty_file' | 'too_many_rows' | 'ambiguous_reporting_date';

export type ExtractionOutcome =
  | { status: 'rejected'; kind: RejectionKind; reason: string }
  | {
      status: 'pending_confirmation';
      needsCurrency: boolean;
      needsReportingDate: boolean;
      /** Multi-format CSV Understanding — present only when at least one column genuinely needs the owner's input (Refinement 4: asked together, one review). */
      columnMappingQuestions?: ColumnMappingQuestion[];
      /** The signature this file's header set produced — the route needs this to write ConfirmedColumnMapping once the owner answers. */
      sourceSignature?: string;
    }
  | {
      status: 'extracted';
      signals: DraftSignal[];
      totalRowCount: number;
      excludedRowCount: number;
      excludedRows: ExcludedRow[];
      reconciliationResult: 'passed' | 'failed' | 'unavailable';
      reportingDate: Date;
      fileLevelCurrency?: string;
      /** Multi-format CSV Understanding — present whenever any column was resolved via a synonym or memory match rather than an exact canonical name, so the ingestion service knows whether there's a new mapping worth remembering. */
      sourceSignature?: string;
      resolvedColumnMapping?: Record<string, string>;
    };
