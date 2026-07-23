import type { Signal } from '@/lib/signals/types';
import { observe } from '@/lib/cognition/observe';

/**
 * Asset 024 — Done & Due Experience Specification, 23 July 2026.
 *
 * Product Truth resolution (Founder + CPO, 23 July 2026): "Done" reflects
 * completed *cognitive* work — signals genuinely observed and assessed
 * this cycle, that did not qualify for escalation into Due — never
 * completed *operational* work (following up, confirming, contacting),
 * since Business Partner cannot yet take autonomous action. That
 * capability arrives with the Agent Framework; this function's phrasing
 * must never imply it exists already.
 *
 * Deliberately reuses observe() rather than the full observed signal
 * history — Done should reflect what's genuinely current (Observe's
 * existing time-scoping: calendar future-only, email's significance-based
 * relevance), not every signal ever persisted, some of which may be long
 * since irrelevant. No new Cognitive Engine computation — this is
 * presentation-layer only, exactly as Asset 024's engineering notes
 * require.
 */

const DOMAIN_LABELS: Record<string, { singular: string; plural: string }> = {
  email: { singular: 'email', plural: 'emails' },
  calendar: { singular: 'calendar item', plural: 'calendar items' },
  finance: { singular: 'financial item', plural: 'financial items' },
  tasks: { singular: 'task', plural: 'tasks' },
  crm: { singular: 'customer signal', plural: 'customer signals' },
  proposals: { singular: 'proposal', plural: 'proposals' },
};

export function computeDoneItems(signals: Signal[], supportingSignalIds: string[]): string[] {
  const surfaced = new Set(supportingSignalIds);
  const relevant = observe(signals).filter((s) => !surfaced.has(s.id));

  const counts = new Map<string, number>();
  for (const signal of relevant) {
    counts.set(signal.domain, (counts.get(signal.domain) ?? 0) + 1);
  }

  const items: string[] = [];
  for (const [domain, count] of counts) {
    const label = DOMAIN_LABELS[domain] ?? { singular: 'item', plural: 'items' };
    const noun = count === 1 ? label.singular : label.plural;
    items.push(`${count} ${noun} reviewed — nothing required your attention.`);
  }

  return items;
}
