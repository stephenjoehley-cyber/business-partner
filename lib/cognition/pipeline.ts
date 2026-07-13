import { getBusinessById } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { observe } from './observe';
import { understand } from './understand';
import { prioritise } from './prioritise';
import { recommend } from './recommend';
import { saveMorningBrief } from './repository';
import type { MorningBriefResult } from './types';

/**
 * Runs the full Cognitive Engine cycle for a business — Observe → Understand
 * → Prioritise → Recommend — and persists the result.
 *
 * This function's signature — businessId in, MorningBriefResult persisted —
 * is exactly what Increment 5's Executive Orchestrator will call on a
 * schedule, the same way Increment 2's generateSignalsForBusiness was built
 * to be called by cron instead of a manual trigger. Increment 3/4 expose
 * this manually via a Route Handler.
 *
 * Always returns a MorningBriefResult (never null): a business with no
 * signals gets an honest all-clear tier, never silence and never a
 * fabricated recommendation (Constitution Principle 10, Executive
 * Honesty — DECISIONS.md). Every stage runs unconditionally, including on
 * an empty signal set — understand/prioritise are no-ops on an empty
 * array, and recommend() is what turns "nothing observed" into the
 * all_clear tier, so there is exactly one place that decision is made.
 */
export async function generateMorningBrief(businessId: string): Promise<MorningBriefResult> {
  const business = await getBusinessById(businessId);
  if (!business) {
    throw new Error(`No business found for id: ${businessId}`);
  }

  const allSignals = await getSignalsForBusiness(businessId);
  const observations = observe(allSignals);

  const understood = understand(observations, {
    business,
    goals: business.goals,
    people: business.people,
  });
  const prioritised = prioritise(understood);
  const morningBrief = recommend(prioritised);

  await saveMorningBrief(businessId, morningBrief);
  return morningBrief;
}
