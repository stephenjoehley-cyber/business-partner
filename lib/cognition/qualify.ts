import type { BusinessContext } from '@/lib/signals/provider';
import type { EmailSignalPayload, Signal } from '@/lib/signals/types';
import type { Observation } from './types';
import { findMatchedPerson, isOwnerDeclaredGrounded } from './grounding';
import { matchGoalsForSignal } from './interpreters/util';
import { EMAIL_GOAL_KEYWORDS } from './interpreters/email';

/**
 * Executive Intervention Qualification — Product Audit and Implementation
 * Plan, 20 July 2026 (Founder + CPO). Governing principle: "A signal must
 * demonstrate a real consequence of inaction before it earns executive
 * intervention. Signals qualify before they are prioritised."
 *
 * Deliberately three states, not a score. A signal either earns the right
 * to be scored, or it doesn't exist in that day's Brief — this is a gate,
 * not another dimension added to Prioritise, which remains completely
 * unchanged by this stage's existence.
 */
export type QualificationOutcome =
  | { status: 'qualified'; reason: 'owner-declared' | 'world-inherent'; matchedPersonId?: string; matchedGoalId?: string }
  | { status: 'not-yet-assessable' };

export interface QualificationRecord {
  signal: Signal;
  outcome: QualificationOutcome;
}

export interface QualificationResult {
  admitted: Observation[];
  /**
   * Internally-honest record of every signal considered, including what
   * was held back and why — never surfaced to the owner directly (that
   * would violate "externally calm"), but real data toward eventually
   * answering how often email is not-yet-assessable, per the Product
   * Audit's recommendation. Held in memory for this cycle only; not yet
   * persisted — the audit's deliberately smallest honest version.
   */
  log: QualificationRecord[];
}

/**
 * Calendar: always world-inherent. A scheduled meeting's time pressure is
 * a structural fact, independent of whatever Business Memory happens to
 * know about the attendee — confirmed directly: every calendar signal
 * already reached Understand before this stage existed, regardless of
 * whether the attendee was a known Person. This qualification is a no-op
 * in effect; it exists for consistency and auditability, not to change
 * calendar's admitted set.
 *
 * Email: qualifies only if genuinely grounded — a matched Person, or the
 * subject itself touching a stated Goal (matchGoalsForSignal — the same
 * content-aware check that already fixed the false-positive goal-match
 * bug). Everything else resolves to not-yet-assessable, never
 * disqualified: Level 1's metadata-only access cannot positively conclude
 * an ungrounded email doesn't matter, only that Business Partner doesn't
 * yet know. That distinction is deliberate, not an oversight — see the
 * Product Audit.
 */
export function qualify(observations: Observation[], context: BusinessContext): QualificationResult {
  const admitted: Observation[] = [];
  const log: QualificationRecord[] = [];

  for (const signal of observations) {
    if (signal.domain === 'calendar') {
      admitted.push(signal);
      log.push({ signal, outcome: { status: 'qualified', reason: 'world-inherent' } });
      continue;
    }

    if (signal.domain === 'email') {
      const payload = signal.payload as EmailSignalPayload;
      const matchedPerson = findMatchedPerson(signal, context.people);
      const matchedGoals = matchGoalsForSignal(context.goals, EMAIL_GOAL_KEYWORDS, payload.subject);
      const grounded = isOwnerDeclaredGrounded(matchedPerson, matchedGoals.length);

      if (grounded) {
        admitted.push(signal);
        log.push({
          signal,
          outcome: {
            status: 'qualified',
            reason: 'owner-declared',
            matchedPersonId: matchedPerson?.id,
            matchedGoalId: matchedGoals[0]?.id,
          },
        });
      } else {
        log.push({ signal, outcome: { status: 'not-yet-assessable' } });
      }
      continue;
    }

    // Any other domain (not yet live) is admitted unchanged for now —
    // Qualification's per-domain rules are added deliberately, one domain
    // at a time, not assumed for a domain that doesn't have live signals
    // yet to reason about.
    admitted.push(signal);
    log.push({ signal, outcome: { status: 'qualified', reason: 'world-inherent' } });
  }

  return { admitted, log };
}
