interface AwarenessLineProps {
  calendarConnected: boolean;
  emailConnected: boolean;
}

/** Extracted as its own function so this logic is directly testable without rendering the component — same pattern as sortGoalsByPriority in BusinessMemoryReflection. */
export function awarenessText(calendarConnected: boolean, emailConnected: boolean): string {
  const watching =
    calendarConnected && emailConnected
      ? 'your calendar and inbox'
      : calendarConnected
        ? 'your calendar'
        : emailConnected
          ? 'your inbox'
          : null;

  return watching
    ? `I've already been watching ${watching} this morning.`
    : "I'm working from what you've told me so far — connect your calendar or inbox in Settings so I can start watching more.";
}

/**
 * Executive Awareness — Founder + CPO product discussion, 20 July 2026,
 * concluding the Executive Intervention Product Inquiry. "The Morning
 * Brief has been asking one component to do two jobs": Executive
 * Intervention answers "is there anything to act on today" — exactly
 * what Qualification now governs (see lib/cognition/qualify.ts).
 * Executive Awareness answers a different, permanently-relevant
 * question — "has someone competent been paying attention" — and unlike
 * Intervention, it is never gated by Qualification and never absent.
 *
 * Deliberately distinct from BusinessMemoryReflection, which remains the
 * richer, one-time "getting to know your business" moment shown only
 * alongside all_clear. This is the lighter, permanent layer present on
 * every tier — confident_recommendation and low_confidence_insight
 * included, where nothing equivalent existed before.
 *
 * States a plain, honest fact about what's actually connected — never a
 * claim about what was found or concluded from it (that's Intervention's
 * job, below this line). If nothing is connected yet, says so plainly
 * rather than omitting the line or overstating what's being watched.
 *
 * The product promise this expresses: "Every morning, before you arrive,
 * I've already been watching." This is that sentence, made real.
 */
export function AwarenessLine({ calendarConnected, emailConnected }: AwarenessLineProps) {
  return <p className="mb-6 text-sm text-ink-faint">{awarenessText(calendarConnected, emailConnected)}</p>;
}
