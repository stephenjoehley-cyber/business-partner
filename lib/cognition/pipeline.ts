import { getBusinessById } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { observe } from './observe';
import { understand } from './understand';
import { prioritise } from './prioritise';
import { recommend } from './recommend';
import { saveRecommendation } from './repository';
import type { Recommendation } from './types';

/**
 * Runs the full Cognitive Engine cycle for a business — Observe → Understand
 * → Prioritise → Recommend — and persists the result.
 *
 * This function's signature — businessId in, Recommendation persisted (or
 * null) — is exactly what Increment 5's Executive Orchestrator will call on
 * a schedule, the same way Increment 2's generateSignalsForBusiness was
 * built to be called by cron instead of a manual trigger. Increment 3
 * exposes this manually via a Route Handler.
 *
 * Returns null when there are no signals to reason over yet — this is not
 * an error. A business with no signals gets an honest empty state, never a
 * fabricated recommendation (Constitution Principle 10).
 */
export async function generateRecommendation(businessId: string): Promise<Recommendation | null> {
  const business = await getBusinessById(businessId);
  if (!business) {
    throw new Error(`No business found for id: ${businessId}`);
  }

  const allSignals = await getSignalsForBusiness(businessId);
  const observations = observe(allSignals);

  if (observations.length === 0) {
    return null;
  }

  const understood = understand(observations, {
    business,
    goals: business.goals,
    people: business.people,
  });
  const prioritised = prioritise(understood);
  const recommendation = recommend(prioritised);

  if (!recommendation) {
    return null;
  }

  await saveRecommendation(businessId, recommendation);
  return recommendation;
}
