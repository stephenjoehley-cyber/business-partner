/**
 * Shared, domain-neutral date-phrasing helpers.
 *
 * These originated in `lib/cognition/interpreters/util.ts` (Increment 3),
 * but "today" / "3 days ago" is not a Cognitive Engine concept — it's a
 * plain-language time convention every layer needs: interpreters (reasoning
 * text), the Signal layer (`lib/signals/describe.ts`, plain-language
 * evidence), and the UI (Executive Presence Specification, Principle 5 —
 * "Executive Time": never raw timestamps, never machine precision).
 * Living here means none of those layers depend on `lib/cognition` just to
 * phrase a date. `lib/cognition/interpreters/util.ts` re-exports these two
 * functions so existing interpreter imports are unaffected.
 */

export function pluralDays(n: number): string {
  return `${n} day${n === 1 ? '' : 's'}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Relative phrasing for a date that may be in the past *or* the future —
 * "today" / "tomorrow" / "in 3 days" / "yesterday" / "3 days ago". Used
 * wherever a signal's `occurredAt` needs human framing (evidence lists,
 * plain-language signal descriptions) without ever exposing a raw
 * timestamp — the Editorial Style Guide's "As of this morning," never
 * "7/13/2026, 8:03:41 AM."
 */
export function relativeDatePhrase(from: Date, to: Date): string {
  const days = Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 1) return `in ${days} days`;
  return `${pluralDays(Math.abs(days))} ago`;
}
