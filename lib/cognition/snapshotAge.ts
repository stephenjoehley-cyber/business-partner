import type { ReportingPeriod } from '@/lib/signals/types';

/**
 * Product Audit — F0: Signal Temporality, 22 July 2026 (Founder + CPO).
 *
 * The Understand-stage seam for snapshot signals. Deliberately narrow: this
 * computes the one fact every snapshot interpreter needs (how stale is the
 * reporting period itself), and nothing about what that number should mean.
 *
 * Founder/CPO decision: no hard staleness expiry, and no universal
 * fresh/aging/historical bands — an aged-debtors export and an annual
 * financial statement age on completely different scales, so those bands
 * are defined per document type when each real extractor is implemented
 * (F1 onward), the same way email's significance-tiered decay curves were
 * defined only once a real domain (email) existed to reason about. This
 * function exists so every future snapshot interpreter measures staleness
 * the same, correct way — from reportingPeriod.end, never occurredAt or
 * acquisition/upload time — without each one reimplementing the date math.
 */
export function daysSinceReportingPeriodEnd(reportingPeriod: ReportingPeriod, now: Date = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((now.getTime() - reportingPeriod.end.getTime()) / msPerDay);
}
