import type { Goal } from '@prisma/client';

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

/** "today" / "tomorrow" / "in 3 days" — used in reasoning text, never in raw data. */
export function relativeDayPhrase(from: Date, to: Date): string {
  const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

export function pluralDays(n: number): string {
  return `${n} day${n === 1 ? '' : 's'}`;
}
