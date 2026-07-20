interface AwarenessLineProps {
  calendarConnected: boolean;
  emailConnected: boolean;
  emailCount: number;
}

/**
 * Extracted as its own function so this logic is directly testable
 * without rendering the component — same pattern as sortGoalsByPriority
 * in BusinessMemoryReflection.
 *
 * Found live, 20 July 2026, hours after Awareness first shipped: the
 * Founder asked why Awareness couldn't show a single email if it claims
 * to have been watching. Root cause: Awareness previously reported only
 * connection status (true/false), never volume — a real claim with
 * nothing behind it. `emailCount` is a plain structural fact (how many
 * emails are currently in view), not a judgement about any of them —
 * still fully consistent with "never a claim about what was found or
 * concluded," since a count says nothing about which emails, or why any
 * of them do or don't matter. That remains Intervention's job entirely,
 * covered separately below this line.
 *
 * Deliberately never states a conclusion here (e.g. "nothing required
 * your attention") — that would duplicate, and could directly
 * contradict, whatever Intervention shows immediately below it.
 */
export function awarenessText(calendarConnected: boolean, emailConnected: boolean, emailCount: number): string {
  const parts: string[] = [];

  if (emailConnected) {
    parts.push(emailCount > 0 ? `${emailCount} email${emailCount === 1 ? '' : 's'}` : 'your inbox');
  }
  if (calendarConnected) {
    parts.push('your calendar');
  }

  if (parts.length === 0) {
    return "I'm working from what you've told me so far — connect your calendar or inbox in Settings so I can start watching more.";
  }

  const joined = parts.length === 2 ? `${parts[0]} and ${parts[1]}` : parts[0];
  return `I've reviewed ${joined} this morning.`;
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
 * The product promise this expresses: "Every morning, before you arrive,
 * I've already been watching." This is that sentence, made real —
 * and, since 20 July 2026, made verifiable.
 */
export function AwarenessLine({ calendarConnected, emailConnected, emailCount }: AwarenessLineProps) {
  return (
    <p className="mb-6 text-sm text-ink-faint">{awarenessText(calendarConnected, emailConnected, emailCount)}</p>
  );
}
