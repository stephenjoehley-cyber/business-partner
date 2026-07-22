import { createHash } from 'crypto';
import Papa from 'papaparse';
import type { DocumentSignalExtractor, ExtractionOutcome, OwnerConfirmation } from '@/lib/signals/extractor';
import type { BusinessContext } from '@/lib/signals/provider';
import type { DebtorSignalPayload, CreditorSignalPayload, DraftSignal, RawDocumentInput, SnapshotProvenance } from '@/lib/signals/types';
import type { Person } from '@prisma/client';

/**
 * Product Audit — F1: Aged Debtors/Creditors Structured Extractor, 22 July
 * 2026 (Founder + CPO). Per Audit v2 §7: F1 defines and supports a
 * canonical Business Partner CSV contract, not compatibility with
 * unspecified third-party accounting exports. Header matching is
 * case/whitespace-tolerant; the column *names* themselves are fixed.
 */
const NAME_COLUMN: Record<'aged_debtors' | 'aged_creditors', string> = {
  aged_debtors: 'customer name',
  aged_creditors: 'supplier name',
};

const REQUIRED_COLUMNS = ['as at date', 'invoice reference', 'due date', 'amount'] as const;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

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
        return { status: 'rejected', reason: 'This extractor only accepts CSV input.' };
      }

      const parsed = Papa.parse<string[]>(input.content, { skipEmptyLines: true });
      const rows = parsed.data;
      if (rows.length < 2) {
        return { status: 'rejected', reason: 'The file is empty or contains no data rows.' };
      }

      const headerRow = rows[0].map(normalizeHeader);
      const nameColumn = NAME_COLUMN[documentType];
      const requiredHeaders = [nameColumn, ...REQUIRED_COLUMNS];
      const missingHeaders = requiredHeaders.filter((h) => !headerRow.includes(h));
      if (missingHeaders.length > 0) {
        const label = documentType === 'aged_debtors' ? 'Aged Debtors' : 'Aged Creditors';
        return {
          status: 'rejected',
          reason: `This file doesn't match the ${label} format — missing column(s): ${missingHeaders.join(', ')}.`,
        };
      }

      const col = (name: string) => headerRow.indexOf(name);
      const nameIdx = col(nameColumn);
      const refIdx = col('invoice reference');
      const invDateIdx = col('invoice date'); // optional — -1 if absent, handled below
      const dueDateIdx = col('due date');
      const amountIdx = col('amount');
      const currencyIdx = col('currency'); // optional
      const asAtIdx = col('as at date');

      const dataRows = rows.slice(1);
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
        return { status: 'pending_confirmation', needsCurrency, needsReportingDate };
      }

      // --- Row-level validity + duplicate handling (Audit v2 §4) -------
      const type = documentType === 'aged_debtors' ? 'debtor_overdue' : 'creditor_due';
      const role: 'debtor' | 'creditor' = documentType === 'aged_debtors' ? 'debtor' : 'creditor';

      const validRows = parsedRows.filter((r) => {
        if (!r.counterpartyName || !r.invoiceReference || !r.dueDate || r.amount === undefined) return false;
        const currency = r.currency ?? fileLevelCurrency;
        return Boolean(currency);
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
        }
        // Conflicting duplicates: excluded entirely, not guessed at.
      }

      const excludedRowCount = parsedRows.length - acceptedRows.length;

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

      return {
        status: 'extracted',
        signals,
        totalRowCount: parsedRows.length,
        excludedRowCount,
        reconciliationResult,
        reportingDate: new Date(`${reportingDateIso}T00:00:00.000Z`),
        fileLevelCurrency,
      };
    },
  };
}

export const agedDebtorsExtractor: DocumentSignalExtractor = buildExtractor('aged_debtors');
export const agedCreditorsExtractor: DocumentSignalExtractor = buildExtractor('aged_creditors');
