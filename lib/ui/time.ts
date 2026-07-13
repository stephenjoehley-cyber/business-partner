/** "Good morning" / "Good afternoon" / "Good evening" by local hour. Deliberately simple — this is a greeting, not a Cognitive Engine judgement. */
export function greetingForTime(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** True when two dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Human, executive-register phrasing of when something was generated —
 * "As of this morning" / "As of yesterday" — never a raw machine
 * timestamp in the primary view (Executive Presence Specification,
 * Principle 5, "Executive Time": "never display seconds," "never display
 * machine precision," "never display unnecessary timestamps"). Full
 * precision remains available to an owner who wants it via the caller's
 * `title` attribute — Progressive Trust (Principle 7): evidence is never
 * hidden when requested, only not forced into the primary view.
 */
export function asOfPhrase(generatedAt: Date, now: Date = new Date()): string {
  if (isSameDay(generatedAt, now)) {
    return `As of ${greetingForTime(generatedAt).replace('Good ', 'this ')}`;
  }

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOfDay(now).getTime() - startOfDay(generatedAt).getTime()) / 86_400_000);

  if (days === 1) return 'As of yesterday';
  if (days > 1 && days < 7) return `As of ${days} days ago`;
  return `As of ${generatedAt.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
}
