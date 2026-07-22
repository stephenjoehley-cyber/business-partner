import type { BusinessContext } from '@/lib/signals/provider';
import type { EmailSignalPayload, Signal, SnapshotProvenance } from '@/lib/signals/types';
import type { Observation } from './types';
import { findMatchedPerson, isOwnerDeclaredGrounded } from './grounding';
import { matchGoalsForSignal } from './interpreters/util';
import { EMAIL_GOAL_KEYWORDS } from './interpreters/email';
import { isSnapshotProvenanceTrustworthy } from './provenance';
import { hasWorldInherentConsequence } from './financeQualificationPolicy';

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

    if (signal.domain === 'finance') {
      // Product Audit — F0: Signal Temporality, 22 July 2026 (Founder +
      // CPO). Three steps, in order, per the audit's corrected sequence:
      // (1) is the extracted representation trustworthy enough to reason
      // over at all, (2) is it owner-grounded OR does it carry a specific
      // world-inherent consequence — either is sufficient, neither is
      // assumed, (3) qualified evidence proceeds to Understand, where
      // freshness/relevance/significance are assessed from
      // reportingPeriod.end (see snapshotAge.ts), never here.
      const provenance = signal.provenance as SnapshotProvenance | undefined;
      if (!isSnapshotProvenanceTrustworthy(provenance)) {
        log.push({ signal, outcome: { status: 'not-yet-assessable' } });
        continue;
      }

      // Goal-matching (as email does via EMAIL_GOAL_KEYWORDS against
      // payload.subject) is deliberately not attempted here — no finance
      // document type has a goal-relevant text field or an approved
      // keyword set yet. Faking it with an unrelated keyword list would
      // be dishonest, not simple. Person-grounding alone is checked; goal
      // grounding for finance is F1 scope, decided per document type.
      const matchedPerson = findMatchedPerson(signal, context.people);
      const groundedByOwner = isOwnerDeclaredGrounded(matchedPerson, 0);
      const worldInherent = hasWorldInherentConsequence(signal);

      if (groundedByOwner || worldInherent) {
        admitted.push(signal);
        log.push({
          signal,
          outcome: {
            status: 'qualified',
            reason: groundedByOwner ? 'owner-declared' : 'world-inherent',
            matchedPersonId: matchedPerson?.id,
          },
        });
      } else {
        log.push({ signal, outcome: { status: 'not-yet-assessable' } });
      }
      continue;
    }

    // Product Audit — F0 correction, 22 July 2026 (Founder + CPO): fail
    // closed, systemically. Any domain without an explicitly approved
    // qualification policy above resolves to not-yet-assessable and is
    // never admitted — this was previously an unconditional admit, which
    // meant a new SignalProvider for any unhandled domain (e.g. finance,
    // before this correction) would have bypassed Qualification entirely
    // the moment it existed. No present or future domain is admitted
    // merely because it lacks a domain-specific branch; each domain earns
    // admission only once its policy is written above, deliberately.
    log.push({ signal, outcome: { status: 'not-yet-assessable' } });
  }

  return { admitted, log };
}
