import { getBusinessById } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { observe } from './observe';
import { qualify } from './qualify';
import { understand } from './understand';
import { prioritise } from './prioritise';
import { recommend } from './recommend';
import { saveMorningBrief, getLatestMorningBrief } from './repository';
import { buildContinuityNote } from './continuity';
import type { MorningBriefResult } from './types';

/**
 * Runs the full Cognitive Engine cycle for a business — Observe → Qualify
 * → Understand → Prioritise → Recommend — and persists the result.
 *
 * Qualify (Product Audit and Implementation Plan, 20 July 2026) is a gate,
 * not a scoring dimension: only signals that have genuinely earned
 * executive intervention (grounded in Business Memory, or carrying
 * structural, world-inherent consequence) proceed to Understand at all.
 * Prioritise and Recommend are completely unchanged by this stage's
 * existence — confirmed directly in the Product Audit — they simply see
 * a smaller, pre-qualified set of signals than before.
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

  // Captured before generating the new brief, deliberately — this is
  // "since we last spoke," not "since a moment ago." See continuity.ts.
  const previousBrief = await getLatestMorningBrief(businessId);

  const allSignals = await getSignalsForBusiness(businessId);
  const observations = observe(allSignals);

  const context = {
    business,
    goals: business.goals,
    people: business.people,
  };

  const { admitted, log } = qualify(observations, context);

  const understood = understand(admitted, context);
  const prioritised = prioritise(understood);
  const morningBrief = recommend(prioritised);

  // Production Implementation Contract, Point 6 (Evidence Chain), 20 July
  // 2026 — every supporting signal other than the winner itself (always
  // supportingSignalIds[0], per recommend.ts's own construction), with
  // its qualification reason attached from the same log entry Qualify
  // already computed. No new selection logic: this enriches exactly the
  // signals recommend.ts already chose to show, rather than picking a
  // different set.
  const recognisedSignals =
    morningBrief.tier === 'all_clear'
      ? undefined
      : morningBrief.supportingSignalIds.slice(1).flatMap((signalId) => {
          const record = log.find((entry) => entry.signal.id === signalId);
          if (!record || record.outcome.status !== 'qualified') return [];
          return [
            {
              signalId,
              reason: record.outcome.reason,
              matchedPersonId: record.outcome.matchedPersonId,
              matchedGoalId: record.outcome.matchedGoalId,
            },
          ];
        });

  // Executive Presence Increment 1 — Demonstrating Understanding (per the
  // Executive Presence Audit, 19 July 2026) — never attached to
  // all_clear. Since the Production Implementation Contract (20 July
  // 2026), all_clear's own message is the only business-understanding-
  // adjacent content the Morning Brief shows at all — Business Memory
  // now owns that responsibility completely, so adding a continuity note
  // there too would duplicate a job that no longer belongs to this page.
  const withContinuity: MorningBriefResult =
    morningBrief.tier === 'all_clear'
      ? morningBrief
      : {
          ...morningBrief,
          continuityNote: buildContinuityNote(business.goals, business.people, previousBrief?.generatedAt ?? null),
          recognisedSignals: recognisedSignals && recognisedSignals.length > 0 ? recognisedSignals : undefined,
        };

  await saveMorningBrief(businessId, withContinuity);
  return withContinuity;
}
