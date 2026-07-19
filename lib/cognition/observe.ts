import type { Signal } from '@/lib/signals/types';
import type { Observation } from './types';

/**
 * Product decision, 19 July 2026 (Founder + CPO): "Executive attention is
 * not preserved by age alone. A signal's persistence must be proportional
 * to its business significance." This superseded a flat 14-day cutoff
 * (added 17 July, after a 165-day-old email kept resurfacing) that
 * excluded every email past a fixed age regardless of whether it
 * genuinely mattered — the same plateau-then-cliff shape now recognised
 * as never having been a deliberate product decision.
 *
 * The real judgment now lives entirely in the email interpreter's
 * significance-based decay curves (lib/cognition/interpreters/email.ts),
 * re-evaluated fresh on every single generation — a low-significance
 * email's urgency naturally decays toward zero and stops competing for
 * attention, without needing Observe to exclude it outright. Observe
 * doesn't know significance (that's computed downstream, in Understand)
 * so it has no business making that call.
 *
 * This constant is now purely a technical safety net — bounding how much
 * historical data gets re-interpreted on every cycle as signal volume
 * grows — not a judgment about relevance. Deliberately generous.
 */
const EMAIL_HISTORY_SAFETY_NET_DAYS = 90;

/**
 * Stage 1 — Observe (Asset 013A).
 *
 * "Every observation enters Working Memory. No conclusions are drawn yet.
 * Observation is objective."
 *
 * The only judgement made here is scoping: a calendar signal for a meeting
 * that has already happened is no longer something to prepare for, so it
 * drops out of the working set. An email signal older than
 * EMAIL_HISTORY_SAFETY_NET_DAYS is scoped out purely as a technical bound,
 * not a relevance judgment — see the comment above. Understand is where
 * real meaning gets attached to whatever remains.
 */
export function observe(signals: Signal[], referenceTime: Date = new Date()): Observation[] {
  return signals.filter((signal) => {
    if (signal.domain === 'calendar') {
      return signal.occurredAt.getTime() >= referenceTime.getTime();
    }
    if (signal.domain === 'email') {
      const daysSince = (referenceTime.getTime() - signal.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= EMAIL_HISTORY_SAFETY_NET_DAYS;
    }
    return true;
  });
}
