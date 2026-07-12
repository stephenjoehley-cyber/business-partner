import type { Signal } from '@/lib/signals/types';
import type { Observation } from './types';

/**
 * Stage 1 — Observe (Asset 013A).
 *
 * "Every observation enters Working Memory. No conclusions are drawn yet.
 * Observation is objective."
 *
 * The only judgement made here is scoping: a calendar signal for a meeting
 * that has already happened is no longer something to prepare for, so it
 * drops out of the working set. This is a fact about time, not a business
 * conclusion — Understand is where meaning gets attached. Email signals are
 * never time-filtered here: an unanswered email doesn't stop being
 * unanswered once the window passes.
 */
export function observe(signals: Signal[], referenceTime: Date = new Date()): Observation[] {
  return signals.filter((signal) => {
    if (signal.domain === 'calendar') {
      return signal.occurredAt.getTime() >= referenceTime.getTime();
    }
    return true;
  });
}
