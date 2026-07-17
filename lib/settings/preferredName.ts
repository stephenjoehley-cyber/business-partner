/**
 * Preferred Name lives entirely in Supabase Auth's `user_metadata` (see
 * `app/(auth)/signup/page.tsx` and `app/morning-brief/page.tsx`) — this
 * function is the one shared place that decides what's actually stored,
 * so Settings and Signup can never quietly drift into normalizing it
 * differently.
 *
 * Returns `null` for an empty/whitespace-only value — saving a blank
 * field is how an owner deliberately reverts to the business-name
 * fallback, not an error state (Decision Backlog Q9).
 */
const MAX_PREFERRED_NAME_LENGTH = 60;

export function normalizePreferredName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_PREFERRED_NAME_LENGTH);
}
