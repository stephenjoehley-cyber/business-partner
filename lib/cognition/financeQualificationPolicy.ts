import type { Signal } from '@/lib/signals/types';

/**
 * Product Audit — F0: Signal Temporality, 22 July 2026 (Founder + CPO).
 *
 * Founder/CPO correction: snapshot qualification must not require
 * owner-declared grounding in every case — some financial facts carry
 * world-inherent consequences independently of whether the owner has told
 * Business Partner anything about them. But *which* facts, and under what
 * specific rule (e.g. what threshold makes an overdue invoice
 * world-inherent) is a per-document-type decision — the same reasoning the
 * Founder/CPO applied to staleness bands (see snapshotAge.ts): deferred to
 * F1, when the first real extractor and a real document type exist to
 * reason about, not invented generically here.
 *
 * This function is the seam qualify.ts calls. It returns false for every
 * signal in F0 — correct and honest, not a placeholder bug: no
 * world-inherent-consequence rule has been approved yet for any finance
 * document type. F1 populates this per document type (signal.type or
 * payload.provenance.sourceDocumentType), the same way
 * lib/cognition/interpreters/registry.ts is populated per signal type
 * rather than guessed at up front.
 */
export function hasWorldInherentConsequence(signal: Signal): boolean {
  void signal;
  return false;
}
