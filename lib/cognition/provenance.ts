import type { SnapshotProvenance } from '@/lib/signals/types';

/**
 * Product Audit — F0: Signal Temporality, 22 July 2026 (Founder + CPO).
 *
 * This is deliberately not a Validation *stage* — the audit evaluated that
 * question directly and concluded a separate top-level Cognitive Engine
 * stage isn't warranted yet: F1's extractor (structured CSV) can't produce
 * a signal that "succeeds" while being silently wrong the way OCR/PDF
 * parsing can, so the two questions ("is this trustworthy" / "does this
 * deserve attention") don't yet diverge in a way Qualification can't
 * express on its own. This function is the seam qualify.ts consults for
 * that first question, kept small and separate from grounding.ts (which
 * answers a genuinely different question — does this touch something the
 * owner has declared).
 *
 * Revisit trigger (architectural, not format-specific): if a future
 * acquisition method produces non-binary or materially different
 * evidence-quality states that this single boolean can no longer express
 * coherently — i.e. Qualification would have to start reasoning about
 * *how* untrustworthy something is, not just whether it is — that's the
 * signal to promote this into its own stage. PDF/OCR extraction (F2) is
 * the likely candidate, but the trigger is the condition, not the format.
 */
export function isSnapshotProvenanceTrustworthy(provenance: SnapshotProvenance | undefined): boolean {
  if (!provenance) return false;
  return provenance.structurallyComplete === true;
}
