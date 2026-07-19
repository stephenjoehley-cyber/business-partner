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

/**
 * Found live, 18/19 July 2026 — matchGoals alone produces a real false
 * positive: it only checks whether *any current goal* happens to mention
 * a keyword, never whether the signal itself is actually about that
 * keyword. A goal like "Win our first client" contains the word
 * "client," so every single unanswered email was being marked as
 * "touching" that goal — including a WordPress notification about an
 * unrelated job application, which has nothing to do with winning a
 * client. That's not just a scoring quirk; the reasoning text asserted
 * something false to the owner.
 *
 * This checks the signal's own text against the same keyword list first
 * — only if the signal itself is plausibly about one of these keywords
 * do we go on to ask which goals it touches. Still deliberately simple
 * substring matching, not a new capability.
 */
export function matchGoalsForSignal(goals: Goal[], keywords: readonly string[], signalText: string): Goal[] {
  const text = signalText.toLowerCase();
  const signalMentionsAnyKeyword = keywords.some((k) => text.includes(k));
  if (!signalMentionsAnyKeyword) return [];
  return matchGoals(goals, keywords);
}
