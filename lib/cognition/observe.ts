import type { Signal } from '@/lib/signals/types';
import type { Observation } from './types';

/**
 * A real, honest structural fact ("you never replied") stops being useful
 * once it's old enough — confirmed live, 17 July 2026, at real-world
 * volume (~100 emails/day): a 165-day-old unanswered thread kept
 * resurfacing as the Morning Brief's top pick, because this function
 * previously never time-filtered email at all (the comment below used to
 * say "an unanswered email doesn't stop being unanswered once the window
 * passes" — true, but not useful). generateMorningBrief reads every
 * signal ever persisted for the business, every single time, so a
 * one-time fetch-time cutoff in GoogleGmailProvider (also 14 days, see
 * DECISIONS.md) only stops new stale signals from being created — it does
 * nothing for ones already sitting in the database from before that fix
 * existed, or from any other source. This is the actual place that
 * guarantee needs to live, since it's the one place every signal, from
 * any point in history, passes through before being reasoned over.
 */
const EMAIL_STALENESS_CUTOFF_DAYS = 14;

/**
 * Stage 1 — Observe (Asset 013A).
 *
 * "Every observation enters Working Memory. No conclusions are drawn yet.
 * Observation is objective."
 *
 * The only judgement made here is scoping: a calendar signal for a meeting
 * that has already happened is no longer something to prepare for, so it
 * drops out of the working set. An email signal older than
 * EMAIL_STALENESS_CUTOFF_DAYS is scoped out the same way — this is a fact
 * about time and real-world volume, not a business conclusion; Understand
 * is where meaning gets attached to whatever remains.
 */
export function observe(signals: Signal[], referenceTime: Date = new Date()): Observation[] {
  return signals.filter((signal) => {
    if (signal.domain === 'calendar') {
      return signal.occurredAt.getTime() >= referenceTime.getTime();
    }
    if (signal.domain === 'email') {
      const daysSince = (referenceTime.getTime() - signal.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= EMAIL_STALENESS_CUTOFF_DAYS;
    }
    return true;
  });
}
