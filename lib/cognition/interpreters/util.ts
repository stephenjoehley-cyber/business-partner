import type { Goal } from '@prisma/client';

// Re-exported so existing interpreter imports (`from './util'`) are
// unaffected — the implementations now live in `lib/shared/time.ts`, shared
// with the Signal layer and the UI. See that file for why.
export { relativeDayPhrase, pluralDays } from '@/lib/shared/time';

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Matches Goals against a set of domain keywords by simple substring
 * search on Goal.description. Deliberately simple and deterministic — no
 * embeddings, no LLM call — so a v1 owner can always see exactly why a
 * goal was (or wasn't) considered relevant. Revisit only if keyword
 * matching starts producing visibly wrong matches in practice.
 */
export function matchGoals(goals: Goal[], keywords: readonly string[]): Goal[] {
  return goals.filter((g) => {
    const description = g.description.toLowerCase();
    return keywords.some((k) => description.includes(k));
  });
}
