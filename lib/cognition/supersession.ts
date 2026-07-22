import type { Observation } from './types';
import type { DebtorSignalPayload, CreditorSignalPayload } from '@/lib/signals/types';

/**
 * Product Audit — F1: Aged Debtors/Creditors, 22 July 2026 (Founder + CPO).
 *
 * A real architectural finding made during implementation, not assumed in
 * the audit: `understand()` (understand.ts) calls `interpretSignal` once
 * per signal, with no visibility across signals — `interpreters/registry.ts`
 * dispatches by (domain, type) to a function that only ever sees the one
 * signal it was given. Supersession ("when the same counterparty +
 * invoice reference appears in two different uploads, reason only about
 * the one with the latest reportingPeriod.end" — Audit v2 §12) genuinely
 * cannot live inside a per-signal interpreter under that architecture.
 *
 * This runs as a small pre-filtering step, ahead of the existing
 * per-signal dispatch loop — every other domain and interpreter is
 * completely unaffected; this only ever touches finance snapshot signals,
 * and only when more than one genuinely exists for the same obligation.
 */
export function filterSupersededSignals(observations: Observation[]): Observation[] {
  const financeSnapshots = observations.filter((s) => s.domain === 'finance' && s.temporality === 'snapshot');
  const others = observations.filter((s) => !(s.domain === 'finance' && s.temporality === 'snapshot'));

  const groups = new Map<string, Observation[]>();
  for (const signal of financeSnapshots) {
    const payload = signal.payload as DebtorSignalPayload | CreditorSignalPayload;
    const key = `${payload.role}|${payload.counterpartyName.trim().toLowerCase()}|${payload.invoiceReference.trim().toLowerCase()}`;
    const group = groups.get(key) ?? [];
    group.push(signal);
    groups.set(key, group);
  }

  const survivors: Observation[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      survivors.push(group[0]);
      continue;
    }
    const latest = group.reduce((best, current) => {
      const bestEnd = best.reportingPeriod?.end.getTime() ?? 0;
      const currentEnd = current.reportingPeriod?.end.getTime() ?? 0;
      return currentEnd > bestEnd ? current : best;
    });
    survivors.push(latest);
  }

  return [...others, ...survivors];
}
