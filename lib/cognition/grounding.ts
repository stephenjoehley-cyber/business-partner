import type { Person } from '@prisma/client';
import type { BusinessContext } from '@/lib/signals/provider';
import type { Signal } from '@/lib/signals/types';

/**
 * Executive Intervention Qualification — Product Audit and Implementation
 * Plan, 20 July 2026. The Founder's own architectural question ("does
 * Qualify need interpretation to already exist?") surfaced a real,
 * previously-implicit distinction: the interpreters were bundling two
 * genuinely different activities — a simple grounding *lookup* (is this
 * signal's sender a known Person? Confirmed directly: identical code
 * existed, duplicated, in both email.ts and calendar.ts) and genuine
 * *scoring/narrative interpretation* (how much does that fact matter, and
 * how should it be phrased). Qualification only ever needs the lookup.
 *
 * Extracted here so both `qualify.ts` (an admit/reject decision) and the
 * interpreters (scoring, for whatever was already admitted) call the same
 * function, rather than either duplicating or reaching into the other's
 * logic — the same pattern already established for `matchGoalsForSignal`.
 */
export function findMatchedPerson(signal: Signal, people: Person[]): Person | undefined {
  const personId = signal.relatedEntities.personId;
  return personId ? people.find((p) => p.id === personId) : undefined;
}

/**
 * Whether a signal is grounded in something Business Partner genuinely
 * knows — a known Person, or a stated Goal the signal's own content
 * touches (see matchGoalsForSignal). Deliberately does not attempt any
 * world-inherent (structural, Business-Memory-independent) grounding —
 * that is domain-specific and decided in qualify.ts per domain, not here.
 */
export function isOwnerDeclaredGrounded(matchedPerson: Person | undefined, matchedGoalCount: number): boolean {
  return Boolean(matchedPerson) || matchedGoalCount > 0;
}
