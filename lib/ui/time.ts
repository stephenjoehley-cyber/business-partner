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
