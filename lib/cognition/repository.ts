import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { MorningBriefResult, RecognisedSignal } from './types';
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
        continuityNote: result.continuityNote ?? null,
        recognisedSignals: result.recognisedSignals ?? Prisma.JsonNull,
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
        continuityNote: result.continuityNote ?? null,
        recognisedSignals: result.recognisedSignals ?? Prisma.JsonNull,
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
        continuityNote: null,
        recognisedSignals: Prisma.JsonNull,
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
      continuityNote: row.continuityNote ?? undefined,
      recognisedSignals: (row.recognisedSignals as unknown as RecognisedSignal[] | null) ?? undefined,
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
      continuityNote: row.continuityNote ?? undefined,
      recognisedSignals: (row.recognisedSignals as unknown as RecognisedSignal[] | null) ?? undefined,
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

/**
 * Every MorningBrief ever generated for a business, oldest first — used
 * only by the data-export route (Decision Backlog Q11). Not used by any
 * owner-facing screen; the Morning Brief page only ever needs the latest
 * one (getLatestMorningBrief, above).
 */
export async function getAllMorningBriefsForBusiness(businessId: string): Promise<MorningBriefResult[]> {
  if (isDemoMode()) {
    const latest = getLatestDemoMorningBrief();
    return latest ? [latest] : [];
  }

  const rows = await prisma.morningBrief.findMany({
    where: { businessId },
    orderBy: { generatedAt: 'asc' },
  });
  return rows.map(toResult);
}

/**
 * Whether a MorningBrief already exists for this business within the given
 * day (defaults to today, UTC). This is the Executive Orchestrator's
 * (Increment 7) idempotency check — the application-layer guarantee that
 * the daily executive cycle never produces two briefs for the same
 * business on the same day, per the approved Product Audit and
 * Implementation Plan.
 *
 * Implemented as a query against the existing `generatedAt` column rather
 * than a schema change — no migration required, and a future database-level
 * uniqueness constraint (e.g. a unique index on (businessId, date)) remains
 * a valid hardening option if production requirements ever put this
 * invariant under real pressure. Not needed today.
 */
export async function hasMorningBriefToday(businessId: string, referenceDate: Date = new Date()): Promise<boolean> {
  const startOfDayUtc = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate())
  );
  const startOfNextDayUtc = new Date(startOfDayUtc.getTime() + 24 * 60 * 60 * 1000);

  if (isDemoMode()) {
    const latest = getLatestDemoMorningBrief();
    if (!latest) return false;
    return latest.generatedAt >= startOfDayUtc && latest.generatedAt < startOfNextDayUtc;
  }

  const existing = await prisma.morningBrief.findFirst({
    where: {
      businessId,
      generatedAt: { gte: startOfDayUtc, lt: startOfNextDayUtc },
    },
  });
  return existing !== null;
}
