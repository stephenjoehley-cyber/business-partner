import type { Goal, Person } from '@prisma/client';

/**
 * Executive Presence Increment 1 — Demonstrating Understanding (per the
 * Executive Presence Audit, 19 July 2026) — "Silence where a calm,
 * restrained sentence could have stood." Tonight surfaced two real
 * incidents (Calendar's day-count, and adding Goals/People in Settings)
 * where Business Partner's understanding had genuinely changed and
 * nothing on the Morning Brief ever said so. This is the smallest
 * correct fix for the Business Memory half of that finding: a single,
 * timeless, truthful sentence, included only when something has
 * genuinely changed since the previous brief.
 *
 * Deliberately not a promise tied to a specific moment ("I'll factor
 * this into tomorrow's reasoning") — per the Founder's explicit
 * correction — because the next relevant signal might not arrive for
 * days. "I'll take this into account in future recommendations" remains
 * true regardless of when that turns out to be.
 *
 * Computed once, deterministically, inside the Cognitive Engine pipeline
 * — this is Recommend-adjacent bookkeeping, not a new interpreter or
 * reasoning capability. No LLM involved, consistent with "the Cognitive
 * Engine decides, the Narrative Layer communicates."
 */
export function buildContinuityNote(
  goals: Goal[],
  people: Person[],
  previousBriefGeneratedAt: Date | null
): string | undefined {
  // No previous brief exists yet — this is the business's first one.
  // Nothing to compare against, and there's nothing to say "since we
  // last spoke" about when there was no last time.
  if (!previousBriefGeneratedAt) return undefined;

  const newGoalCount = goals.filter((g) => g.createdAt > previousBriefGeneratedAt).length;
  const newPersonCount = people.filter((p) => p.createdAt > previousBriefGeneratedAt).length;

  if (newGoalCount === 0 && newPersonCount === 0) return undefined;

  const parts: string[] = [];
  if (newGoalCount > 0) {
    parts.push(newGoalCount === 1 ? 'a new goal' : `${newGoalCount} new goals`);
  }
  if (newPersonCount > 0) {
    parts.push(newPersonCount === 1 ? 'a new contact' : `${newPersonCount} new contacts`);
  }

  const addition = parts.length === 2 ? `${parts[0]} and ${parts[1]}` : parts[0];
  return `Since we last spoke, you've added ${addition}. I'll take this into account in future recommendations.`;
}
