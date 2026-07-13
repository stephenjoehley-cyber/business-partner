import { generateSignalsForBusiness } from '@/lib/signals/pipeline';
import { generateMorningBrief } from '@/lib/cognition/pipeline';
import { hasMorningBriefToday } from '@/lib/cognition/repository';
import type { MorningBriefResult } from '@/lib/cognition/types';

/**
 * The Executive Orchestrator — Increment 7.
 *
 * This function represents the daily executive cycle for a business.
 * Every caller — whether onboarding, scheduled execution, testing, or
 * future triggers — must invoke this function rather than creating
 * alternative paths. Future Calendar integration, Gmail integration, and
 * any later event-driven trigger should all converge on this same
 * executive cycle rather than introducing parallel reasoning paths.
 *
 * This is not a scheduling utility. It is the operational mechanism by
 * which Business Partner fulfils its promise of arriving prepared each
 * day (SaaS Operating Model v1, §9) — the owner should never have to ask
 * Business Partner to think. Concretely: Observe (generateSignalsForBusiness)
 * → Cognitive Engine (generateMorningBrief) → persisted MorningBrief,
 * exactly the pipeline described in the Product Audit and Implementation
 * Plan, wrapped only with the idempotency and failure-isolation behaviour
 * neither existing pipeline needed to have on its own.
 *
 * Idempotency: if a MorningBrief already exists for this business today,
 * this function does nothing and returns `{ ran: false }` — the
 * application-layer guarantee that a business never receives two briefs
 * on the same day, per the approved Founder decision. (A future
 * database-level uniqueness constraint remains a valid hardening option
 * if production requirements ever put this invariant under real pressure;
 * not needed today.)
 *
 * Failure isolation: any error from either pipeline is caught here, not
 * re-thrown. This is what makes it safe to call this function in a loop
 * over every business (the scheduler route does exactly that) without one
 * business's failure preventing every other business's cycle from
 * completing. A caught failure is not a fabricated brief — no MorningBrief
 * is persisted for this business today, and it will be retried on the next
 * scheduled run, or the next time this function is called for it.
 */
export interface DailyCycleOutcome {
  ran: boolean;
  result?: MorningBriefResult;
  error?: string;
}

export async function runDailyCycleForBusiness(businessId: string): Promise<DailyCycleOutcome> {
  const alreadyRanToday = await hasMorningBriefToday(businessId);
  if (alreadyRanToday) {
    return { ran: false };
  }

  try {
    await generateSignalsForBusiness(businessId);
    const result = await generateMorningBrief(businessId);
    return { ran: true, result };
  } catch (error) {
    return {
      ran: false,
      error: error instanceof Error ? error.message : 'Unknown error during the daily executive cycle.',
    };
  }
}
