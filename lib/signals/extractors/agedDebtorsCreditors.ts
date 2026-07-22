import { createHash } from 'crypto';
import Papa from 'papaparse';
import type { DocumentSignalExtractor, ExtractionOutcome, OwnerConfirmation, ExcludedRow } from '@/lib/signals/extractor';
import type { BusinessContext } from '@/lib/signals/provider';
import type { DebtorSignalPayload, CreditorSignalPayload, DraftSignal, RawDocumentInput, SnapshotProvenance } from '@/lib/signals/types';
import type { Person } from '@prisma/client';
import { resolveColumnMapping, hasNoMeaningfulMapping, buildMappingQuestions, computeSourceSignature, CANONICAL_FIELDS } from '@/lib/signals/schemaMapping';

/**
 * Product Audit — F1: Aged Debtors/Creditors Structured Extractor, 22 July
 * 2026 (Founder + CPO). Per Audit v2 §7: F1 defines and supports a
 * canonical Business Partner CSV contract, not compatibility with
 * unspecified third-party accounting exports. Header matching is
 * case/whitespace-tolerant; the column *names* themselves are fixed.
 *
 * Multi-format CSV Understanding, 22 July 2026 — the fixed exact-name
 * lookup this file used to do directly is now Schema Mapping
 * Resolution's job (lib/signals/schemaMapping.ts). This file no longer
 * decides what "exact match" means on its own; it asks that module to
 * resolve a mapping, then parses using whatever it resolves to — a
 * canonical CSV upload still resolves every field at 'high' confidence
 * via exact match, so it continues to ask zero questions, unchanged.
 */

/** Founder/CPO decision, F1 Implementation Plan: 5 MB / 10,000 data rows, CSV only. */
const MAX_DATA_ROWS = 10_000;

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

interface ParsedRow {
  rowNumber: number; // 1-indexed data row, matching what an owner sees in the original file
  counterpartyName?: string;
  invoiceReference?: string;
  invoiceDate?: string;
  dueDate?: string; // ISO 8601, if parsed successfully
  amount?: number;
  currency?: string;
  asAtDate?: string; // ISO 8601, if parsed successfully
}

/** Strict ISO 8601 (YYYY-MM-DD) only — the canonical contract's own format, not a best-effort parse of arbitrary date strings. */
function parseIsoDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  const d = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : trimmed;
}

function parseAmount(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/,/g, '');
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * Customer/supplier resolution against Business Memory (Audit v2 §10) —
 * conservative, exact-or-near-exact match only, filtered to the relevant
 * relationship type. An ambiguous or unmatched name resolves to
 * `undefined`, never a guess — a wrong debt attribution is a real harm,
 * not a scoring nuance. Deliberately simpler than a fuzzy-matching
 * library: this is the same "simple, deterministic, owner-legible"
 * discipline as matchGoals (interpreters/util.ts) — no embeddings, no
 * partial-credit scoring.
 */
function resolveCounterparty(counterpartyName: string, people: Person[], documentType: 'aged_debtors' | 'aged_creditors'): Person | undefined {
  const relevantRelationships = documentType === 'aged_debtors' ? ['customer', 'prospect'] : ['supplier'];
  const candidates = people.filter((p) => relevantRelationships.includes(p.relationship));
  const normalized = normalizeName(counterpartyName);
  const matches = candidates.filter((p) => normalizeName(p.name) === normalized);
  return matches.length === 1 ? matches[0] : undefined;
}

function externalRefFor(businessId: string, documentType: string, counterpartyName: string, invoiceReference: string, asAtDate: string): string {
  const key = `${businessId}|${documentType}|${normalizeName(counterpartyName)}|${invoiceReference.trim().toLowerCase()}|${asAtDate}`;
  return createHash('sha256').update(key).digest('hex');
}

function buildExtractor(documentType: 'aged_debtors' | 'aged_creditors'): DocumentSignalExtractor {
  return {
    documentType,
    acquisitionMethod: 'csv_upload',

    extract(input: RawDocumentInput, context: BusinessContext, confirmation?: OwnerConfirmation): ExtractionOutcome {
      if (input.format !== 'csv') {
        // Defensive only — the Signal Ingestion Service routes by
        // acquisitionMethod, so this extractor is never actually invoked
        // with a non-csv input. Not a real code path in F1.
        return { status: 'rejected', kind: 'wrong_document_type', reason: 'This extractor only accepts CSV input.' };
      }

      const parsed = Papa.parse<string[]>(input.content, { skipEmptyLines: true });
      const rows = parsed.data;
      if (rows.length < 2) {
        return { status: 'rejected', kind: 'empty_file', reason: 'The file is empty or contains no data rows.' };
      }
      if (rows.length - 1 > MAX_DATA_ROWS) {
        return { status: 'rejected', kind: 'too_many_rows', reason: `This file has more than ${MAX_DATA_ROWS.toLocaleString()} rows, which is more than can be read right now.` };
      }

      const rawHeaders = rows[0];
      const dataRows = rows.slice(1);
      const sourceSignature = computeSourceSignature(rawHeaders);

      // --- Schema Mapping Resolution (Multi-format CSV Understanding) ---
      // Every canonical CSV upload resolves every field at 'high'
      // confidence via exact match here, unchanged from F1 — this is a
      // pre-step, not a replacement of anything downstream.
      const knownMapping = { ...confirmation?.confirmedMemoryMapping, ...confirmation?.columnMapping };
      const resolutions = resolveColumnMapping(documentType, rawHeaders, dataRows.slice(0, 3), knownMapping);

      if (hasNoMeaningfulMapping(resolutions)) {
        const label = documentType === 'aged_debtors' ? 'Aged Debtors' : 'Aged Creditors';
        return {
          status: 'rejected',
          kind: 'wrong_document_type',
          reason: `This file doesn't match the ${label} format — I couldn't recognise any of the columns I'd expect.`,
        };
      }

      const mappingQuestions = buildMappingQuestions(rawHeaders, resolutions);
      if (mappingQuestions.length > 0) {
        // Two-round simplification, disclosed: currency/reporting-date
        // needs can only be assessed once every column's meaning is
        // settled, so a file needing both mapping *and* currency
        // clarification asks in two rounds, not one combined round.
        // Known, named limitation — not silently accepted as ideal.
        return {
          status: 'pending_confirmation',
          needsCurrency: false,
          needsReportingDate: false,
          columnMappingQuestions: mappingQuestions,
          sourceSignature,
        };
      }

      const colIndex = (canonicalField: string): number => {
        const resolution = resolutions.find((r) => r.canonicalField === canonicalField);
        return resolution?.rawHeader ? rawHeaders.indexOf(resolution.rawHeader) : -1;
      };

      const { required } = CANONICAL_FIELDS[documentType];
      const nameColumn = required[1]; // 'customer name' | 'supplier name' — always index 1, see CANONICAL_FIELDS
      const nameIdx = colIndex(nameColumn);
      const refIdx = colIndex('invoice reference');
      const invDateIdx = colIndex('invoice date'); // optional — -1 if absent, handled below
      const dueDateIdx = colIndex('due date');
      const amountIdx = colIndex('amount');
      const currencyIdx = colIndex('currency'); // optional
      const asAtIdx = colIndex('as at date');

      const parsedRows: ParsedRow[] = dataRows.map((cells, i) => ({
        rowNumber: i + 1,
        counterpartyName: cells[nameIdx]?.trim() || undefined,
        invoiceReference: cells[refIdx]?.trim() || undefined,
        invoiceDate: invDateIdx >= 0 ? parseIsoDate(cells[invDateIdx]) : undefined,
        dueDate: parseIsoDate(cells[dueDateIdx]),
        amount: parseAmount(cells[amountIdx]),
        currency: currencyIdx >= 0 ? cells[currencyIdx]?.trim().toUpperCase() || undefined : undefined,
        asAtDate: parseIsoDate(cells[asAtIdx]),
      }));

      // --- Reporting date resolution (Audit v2 §7) --------------------
      const distinctAsAtDates = [...new Set(parsedRows.map((r) => r.asAtDate).filter(Boolean))] as string[];
      let reportingDateIso: string | undefined;
      if (distinctAsAtDates.length > 1) {
        return {
          status: 'rejected',
          kind: 'ambiguous_reporting_date',
          reason: 'The "As At Date" column contains more than one date — this looks like more than one export combined into a single file.',
        };
      } else if (distinctAsAtDates.length === 1) {
        reportingDateIso = distinctAsAtDates[0];
      } else if (confirmation?.reportingDate) {
        reportingDateIso = confirmation.reportingDate.toISOString().slice(0, 10);
      }

      // --- Currency resolution (Audit v2 §3) ---------------------------
      const rowsWithCurrency = parsedRows.filter((r) => r.currency).length;
      const allRowsHaveCurrency = rowsWithCurrency === parsedRows.length;
      const noRowsHaveCurrency = rowsWithCurrency === 0;
      let fileLevelCurrency: string | undefined;
      if (noRowsHaveCurrency) {
        fileLevelCurrency = confirmation?.currency?.trim().toUpperCase();
      }
      // Mixed (some rows have currency, some don't): no file-level
      // fallback is applied — rows missing currency in this case are
      // individually malformed (Audit v2 §3: "mixed-currency files must
      // identify currency per row").

      const needsReportingDate = !reportingDateIso;
      const needsCurrency = noRowsHaveCurrency && !fileLevelCurrency;
      if (needsReportingDate || needsCurrency) {
        return { status: 'pending_confirmation', needsCurrency, needsReportingDate, sourceSignature };
      }

      // --- Row-level validity + duplicate handling (Audit v2 §4) -------
      const type = documentType === 'aged_debtors' ? 'debtor_overdue' : 'creditor_due';
      const role: 'debtor' | 'creditor' = documentType === 'aged_debtors' ? 'debtor' : 'creditor';

      const excludedRows: ExcludedRow[] = [];
      const validRows = parsedRows.filter((r) => {
        if (!r.counterpartyName || !r.invoiceReference) {
          excludedRows.push({ rowNumber: r.rowNumber, reason: 'missing_required_field' });
          return false;
        }
        if (r.amount === undefined) {
          excludedRows.push({ rowNumber: r.rowNumber, reason: 'unparseable_amount' });
          return false;
        }
        if (!r.dueDate) {
          excludedRows.push({ rowNumber: r.rowNumber, reason: 'unparseable_due_date' });
          return false;
        }
        const currency = r.currency ?? fileLevelCurrency;
        if (!currency) {
          excludedRows.push({ rowNumber: r.rowNumber, reason: 'missing_currency' });
          return false;
        }
        return true;
      });

      const groups = new Map<string, ParsedRow[]>();
      for (const row of validRows) {
        const key = `${normalizeName(row.counterpartyName!)}|${row.invoiceReference!.trim().toLowerCase()}`;
        const group = groups.get(key) ?? [];
        group.push(row);
        groups.set(key, group);
      }

      const acceptedRows: ParsedRow[] = [];
      for (const group of groups.values()) {
        if (group.length === 1) {
          acceptedRows.push(group[0]);
          continue;
        }
        const allIdentical = group.every((r) => r.amount === group[0].amount && r.dueDate === group[0].dueDate);
        if (allIdentical) {
          acceptedRows.push(group[0]); // silent dedupe — harmless export artefact
        } else {
          // Conflicting duplicates: excluded entirely, not guessed at.
          for (const row of group) {
            excludedRows.push({ rowNumber: row.rowNumber, reason: 'conflicting_duplicate' });
          }
        }
      }

      const excludedRowCount = excludedRows.length;

      // --- Reconciliation (Audit v2 §5) ---------------------------------
      // The canonical CSV contract has no stated-total field to reconcile
      // against — honestly 'unavailable', not a fabricated pass. If a
      // future version of the contract adds one, this becomes a real
      // 'passed' | 'failed' check without changing anything downstream.
      const reconciliationResult: 'passed' | 'failed' | 'unavailable' = 'unavailable';

      const signals: DraftSignal[] = acceptedRows.map((row) => {
        const currency = row.currency ?? fileLevelCurrency!;
        const matchedPerson = resolveCounterparty(row.counterpartyName!, context.people, documentType);
        const provenance: SnapshotProvenance = {
          extractionMethod: 'structured_export',
          sourceDocumentType: documentType,
          structurallyComplete: true,
        };
        const payload: DebtorSignalPayload | CreditorSignalPayload = {
          role,
          counterpartyName: row.counterpartyName!,
          invoiceReference: row.invoiceReference!,
          amount: row.amount!,
          currency,
          dueDate: row.dueDate!,
          invoiceDate: row.invoiceDate,
        } as DebtorSignalPayload | CreditorSignalPayload;

        return {
          domain: 'finance',
          type,
          occurredAt: new Date(`${reportingDateIso}T00:00:00.000Z`),
          relatedEntities: { personId: matchedPerson?.id },
          payload,
          sourceProviderId: 'csv_upload',
          externalRef: externalRefFor(context.business.id, documentType, row.counterpartyName!, row.invoiceReference!, reportingDateIso!),
          confidence: 1.0,
          temporality: 'snapshot',
          reportingPeriod: { start: new Date(`${reportingDateIso}T00:00:00.000Z`), end: new Date(`${reportingDateIso}T00:00:00.000Z`) },
          provenance,
          sourceRowNumber: row.rowNumber,
        };
      });

      // Only worth remembering (Confirmed Mapping Memory, Founder
      // Decision 1) when at least one field was resolved via something
      // other than an exact canonical match — an all-exact-match file
      // has nothing new to remember.
      // Found live during Founder Acceptance, 22 July 2026: checking
      // against confirmation.columnMapping here used to catch memory
      // that had already been merged in upstream, causing the "I'll
      // remember this" notice to repeat on every upload from an
      // already-known source. Now checks only the owner's genuinely
      // fresh answer this round — confirmedMemoryMapping is never
      // treated as new, no matter what confidence it resolves at.
      const newlyResolvedMapping: Record<string, string> = {};
      for (const r of resolutions) {
        if (r.rawHeader && (r.confidence === 'medium' || confirmation?.columnMapping?.[r.rawHeader.trim().toLowerCase()])) {
          newlyResolvedMapping[r.rawHeader.trim().toLowerCase()] = r.canonicalField;
        }
      }

      return {
        status: 'extracted',
        signals,
        totalRowCount: parsedRows.length,
        excludedRowCount,
        excludedRows,
        reconciliationResult,
        reportingDate: new Date(`${reportingDateIso}T00:00:00.000Z`),
        fileLevelCurrency,
        sourceSignature,
        resolvedColumnMapping: Object.keys(newlyResolvedMapping).length > 0 ? newlyResolvedMapping : undefined,
      };
    },
  };
}

export const agedDebtorsExtractor: DocumentSignalExtractor = buildExtractor('aged_debtors');
export const agedCreditorsExtractor: DocumentSignalExtractor = buildExtractor('aged_creditors');
