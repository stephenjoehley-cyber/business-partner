/**
 * Multi-format CSV Understanding — Implementation Plan, 22 July 2026
 * (Founder + CPO). Product Audit §3: schema mapping resolution belongs
 * entirely before everything else in the extractor, as a pure pre-step —
 * not a change to anything downstream. Once a mapping is resolved, row
 * parsing, structural completeness, provenance, Qualification, and
 * Understand all continue operating on canonical field meanings exactly
 * as they do today.
 *
 * Deliberately pure — no I/O, no knowledge of ConfirmedColumnMapping's
 * persistence, no knowledge of HTTP or confirmation round trips. The
 * caller supplies any already-confirmed mapping; this module only
 * resolves what it's given.
 */

import { createHash } from 'crypto';

export type MappingConfidence = 'high' | 'medium' | 'low';

export interface FieldMappingResolution {
  canonicalField: string;
  required: boolean;
  rawHeader: string | null;
  confidence: MappingConfidence;
  sampleValues: string[];
}

export const CANONICAL_FIELDS: Record<'aged_debtors' | 'aged_creditors', { required: string[]; optional: string[] }> = {
  aged_debtors: {
    required: ['as at date', 'customer name', 'invoice reference', 'due date', 'amount'],
    optional: ['invoice date', 'currency'],
  },
  aged_creditors: {
    required: ['as at date', 'supplier name', 'invoice reference', 'due date', 'amount'],
    optional: ['invoice date', 'currency'],
  },
};

/**
 * Founder Decision 3 (Product Audit): deliberately narrow, high-confidence
 * only. Expanded from real customer evidence gathered through production
 * usage, not attempted broad industry coverage in V1. Deliberately
 * excludes genuinely ambiguous terms (e.g. a bare "Date," which could
 * mean invoice date, due date, or as-at date) — an ambiguous synonym is
 * worse than no match, since it risks a confident-sounding wrong guess.
 */
const SYNONYMS: Record<string, string[]> = {
  'as at date': ['report date', 'statement date', 'as of date'],
  'customer name': ['client', 'client name', 'account name'],
  'supplier name': ['vendor', 'vendor name'],
  'invoice reference': ['invoice no', 'invoice number', 'reference', 'document number'],
  'due date': ['payment due', 'due'],
  amount: ['amount due', 'balance', 'outstanding amount'],
  currency: ['ccy'],
};

function normalize(header: string): string {
  return header.trim().toLowerCase();
}

function sampleValuesFor(headerIndex: number, sampleRows: string[][]): string[] {
  const values: string[] = [];
  for (const row of sampleRows) {
    const value = row[headerIndex]?.trim();
    if (value) values.push(value);
    if (values.length >= 3) break;
  }
  return values;
}

export function resolveColumnMapping(
  documentType: 'aged_debtors' | 'aged_creditors',
  rawHeaders: string[],
  sampleRows: string[][],
  confirmedMapping?: Record<string, string>
): FieldMappingResolution[] {
  const { required, optional } = CANONICAL_FIELDS[documentType];
  const normalizedHeaders = rawHeaders.map(normalize);

  // Founder/CPO correction, Refinement 2: owner-confirmed understanding
  // always takes precedence over inference. Applied here by simply
  // checking confirmedMapping before the synonym table, never after —
  // a remembered mapping is never second-guessed by a fresh synonym
  // match once it exists.
  const confirmed = confirmedMapping ?? {};

  function resolveField(canonicalField: string, isRequired: boolean): FieldMappingResolution {
    // 1. Exact match against the canonical name itself.
    const exactIdx = normalizedHeaders.indexOf(canonicalField);
    if (exactIdx >= 0) {
      return {
        canonicalField,
        required: isRequired,
        rawHeader: rawHeaders[exactIdx],
        confidence: 'high',
        sampleValues: sampleValuesFor(exactIdx, sampleRows),
      };
    }

    // 2. Confirmed Mapping Memory (Founder Decision 1).
    const confirmedIdx = normalizedHeaders.findIndex((h) => confirmed[h] === canonicalField);
    if (confirmedIdx >= 0) {
      return {
        canonicalField,
        required: isRequired,
        rawHeader: rawHeaders[confirmedIdx],
        confidence: 'high',
        sampleValues: sampleValuesFor(confirmedIdx, sampleRows),
      };
    }

    // 3. Synonym table — collision-defensive: if a header would match
    // synonyms for more than one canonical field, it's ambiguous, not a
    // confident match for either — falls through to unresolved rather
    // than guessing.
    const synonyms = SYNONYMS[canonicalField] ?? [];
    const synonymCandidates = normalizedHeaders
      .map((h, idx) => ({ h, idx }))
      .filter(({ h }) => synonyms.includes(h));

    if (synonymCandidates.length === 1) {
      const { idx } = synonymCandidates[0];
      const claimedByOtherField = Object.entries(SYNONYMS).some(
        ([otherField, otherSynonyms]) => otherField !== canonicalField && otherSynonyms.includes(normalizedHeaders[idx])
      );
      if (!claimedByOtherField) {
        return {
          canonicalField,
          required: isRequired,
          rawHeader: rawHeaders[idx],
          confidence: 'medium',
          sampleValues: sampleValuesFor(idx, sampleRows),
        };
      }
    }

    // 4. Unresolved — a direct question if required, silently omitted if optional.
    return { canonicalField, required: isRequired, rawHeader: null, confidence: 'low', sampleValues: [] };
  }

  return [...required.map((f) => resolveField(f, true)), ...optional.map((f) => resolveField(f, false))];
}

/** True only when every required canonical field resolved with some confidence — the fail-closed rejection condition. */
export function hasNoMeaningfulMapping(resolutions: FieldMappingResolution[]): boolean {
  return resolutions.filter((r) => r.required).every((r) => r.confidence === 'low');
}

export type ColumnMappingQuestion =
  | { kind: 'confirm'; rawHeader: string; canonicalField: string; sampleValues: string[] }
  | { kind: 'select'; canonicalField: string; candidateHeaders: string[] };

/**
 * The questions this file actually needs — Refinement 4: presented
 * together as one coherent review, never a sequence of independent
 * prompts. A medium-confidence resolution asks for a yes/no
 * confirmation; a required field that resolved to nothing asks the
 * owner to pick directly from the file's remaining, unclaimed headers.
 */
export function buildMappingQuestions(rawHeaders: string[], resolutions: FieldMappingResolution[]): ColumnMappingQuestion[] {
  const questions: ColumnMappingQuestion[] = resolutions
    .filter((r) => r.confidence === 'medium' && r.rawHeader)
    .map((r) => ({ kind: 'confirm' as const, rawHeader: r.rawHeader!, canonicalField: r.canonicalField, sampleValues: r.sampleValues }));

  const claimedHeaders = new Set(resolutions.filter((r) => r.rawHeader).map((r) => r.rawHeader));
  const candidateHeaders = rawHeaders.filter((h) => !claimedHeaders.has(h));

  for (const r of resolutions) {
    if (r.required && r.confidence === 'low') {
      questions.push({ kind: 'select', canonicalField: r.canonicalField, candidateHeaders });
    }
  }

  return questions;
}

/**
 * Deterministic identity for "this is the same source format again"
 * (Refinement 1: an internal implementation detail, not a long-term
 * product contract — free to evolve, e.g. incorporating column count or
 * structural patterns, without ConfirmedColumnMapping itself changing
 * shape). V1: a hash of the sorted, normalised header set.
 */
export function computeSourceSignature(rawHeaders: string[]): string {
  const normalized = rawHeaders.map(normalize).sort().join('|');
  return createHash('sha256').update(normalized).digest('hex');
}
