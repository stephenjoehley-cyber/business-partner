import type { BusinessContext } from './provider';
import type { DraftSignal, RawDocumentInput } from './types';

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
 * extracted). Both optional: a file might be missing only one.
 */
export interface OwnerConfirmation {
  currency?: string;
  reportingDate?: Date;
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
  | { status: 'pending_confirmation'; needsCurrency: boolean; needsReportingDate: boolean }
  | {
      status: 'extracted';
      signals: DraftSignal[];
      totalRowCount: number;
      excludedRowCount: number;
      excludedRows: ExcludedRow[];
      reconciliationResult: 'passed' | 'failed' | 'unavailable';
      reportingDate: Date;
      fileLevelCurrency?: string;
    };
