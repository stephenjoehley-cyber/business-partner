import { prisma } from '@/lib/prisma';
import type { MorningBriefResult } from './types';
import { isDemoMode } from '@/lib/demo/config';
import { getLatestDemoMorningBrief, saveDemoMorningBrief } from '@/lib/demo/store';

/**
 * The only module that touches MorningBrief persistence directly — same
 * pattern as lib/brain/repository.ts and lib/signals/repository.ts.
 *
 * Persistence and the domain model stay in sync via one mapping pair
 * (toRow / toResult) rather than callers reading raw Prisma fields
 * directly — the discriminated union's tier boundaries (e.g. "only
 * confident_recommendation has recommendedAction") are enforced here once,
 * not re-derived at every call site.
 *
 * Increment 5 (Demo Mode): `saveMorningBrief`/`getLatestMorningBrief`
 * delegate to `lib/demo/store.ts` when active. The demo store holds the
 * already-typed `MorningBriefResult` directly — there's no Prisma row to
 * map to or from, so `toRow`/`toResult` simply aren't part of that path.
 * They remain the single source of truth for the real persistence shape.
 */

type MorningBriefRow = Awaited<ReturnType<typeof prisma.morningBrief.create>>;

function toRow(businessId: string, result: MorningBriefResult) {
  const base = {
    businessId,
    generatedAt: result.generatedAt,
    tier: result.tier,
  };

  switch (result.tier) {
    case 'confident_recommendation':
      return {
        ...base,
        recommendation: result.executiveSummary,
        reasoning: result.reasoning,
        recommendedAction: result.recommendedAction,
        confidence: result.confidence,
        supportingSignalIds: result.supportingSignalIds,
        message: null,
      };
    case 'low_confidence_insight':
      return {
        ...base,
        recommendation: result.executiveSummary,
        reasoning: result.reasoning,
        recommendedAction: null,
        confidence: result.confidence,
        supportingSignalIds: result.supportingSignalIds,
        message: null,
      };
    case 'all_clear':
      return {
        ...base,
        recommendation: null,
        reasoning: null,
        recommendedAction: null,
        confidence: null,
        supportingSignalIds: [],
        message: result.message,
      };
  }
}

/**
 * Reconstructs the typed MorningBriefResult from a persisted row. Throws on
 * a corrupt row (unknown tier, or a tier missing the fields it requires)
 * rather than silently returning something the UI might misrender —
 * corruption here means a bug, not a legitimate empty state.
 */
export function toResult(row: MorningBriefRow): MorningBriefResult {
  const generatedAt = row.generatedAt;

  if (row.tier === 'confident_recommendation') {
    if (row.recommendation == null || row.reasoning == null || row.recommendedAction == null || row.confidence == null) {
      throw new Error(`Corrupt MorningBrief row ${row.id}: confident_recommendation missing required fields.`);
    }
    return {
      tier: 'confident_recommendation',
      executiveSummary: row.recommendation,
      reasoning: row.reasoning,
      recommendedAction: row.recommendedAction,
      confidence: row.confidence,
      supportingSignalIds: row.supportingSignalIds,
      generatedAt,
    };
  }

  if (row.tier === 'low_confidence_insight') {
    if (row.recommendation == null || row.reasoning == null || row.confidence == null) {
      throw new Error(`Corrupt MorningBrief row ${row.id}: low_confidence_insight missing required fields.`);
    }
    return {
      tier: 'low_confidence_insight',
      executiveSummary: row.recommendation,
      reasoning: row.reasoning,
      confidence: row.confidence,
      supportingSignalIds: row.supportingSignalIds,
      generatedAt,
    };
  }

  if (row.tier === 'all_clear') {
    if (row.message == null) {
      throw new Error(`Corrupt MorningBrief row ${row.id}: all_clear missing message.`);
    }
    return { tier: 'all_clear', message: row.message, generatedAt };
  }

  throw new Error(`Corrupt MorningBrief row ${row.id}: unknown tier "${row.tier}".`);
}

export async function saveMorningBrief(businessId: string, result: MorningBriefResult) {
  if (isDemoMode()) {
    saveDemoMorningBrief(result);
    return result;
  }
  return prisma.morningBrief.create({ data: toRow(businessId, result) });
}

/** Most recent MorningBrief for a business, typed back into MorningBriefResult, or null if none has been generated yet. */
export async function getLatestMorningBrief(businessId: string): Promise<MorningBriefResult | null> {
  if (isDemoMode()) return getLatestDemoMorningBrief();

  const row = await prisma.morningBrief.findFirst({
    where: { businessId },
    orderBy: { generatedAt: 'desc' },
  });
  return row ? toResult(row) : null;
}
