interface AwarenessLineProps {
  calendarConnected: boolean;
  emailConnected: boolean;
  emailCount: number;
  /**
   * Multi-format CSV Understanding, 22 July 2026 — Founder request to
   * reflect finance in this sentence. Deliberately not modelled the same
   * way as calendarConnected/emailConnected: finance has no OAuth
   * connection to check — it's upload-based. This is true only once the
   * business has at least one finance signal on record, computed by the
   * caller from the same signals list already loaded for the Brief
   * itself, not a new query.
   */
  financeConnected: boolean;
}

/**
 * Extracted as its own function so this logic is directly testable
 * without rendering the component — same pattern as sortGoalsByPriority
 * used to be tested in the now-removed BusinessMemoryReflection.
 *
 * Found live, 20 July 2026, hours after Awareness first shipped: the
 * Founder asked why Awareness couldn't show a single email if it claims
 * to have been watching. Root cause: Awareness previously reported only
 * connection status (true/false), never volume — a real claim with
 * nothing behind it.
 *
 * Widened again the same day, per the Executive Signal Capability &
 * Claims Audit: the original count was a rolling snapshot, not
 * genuinely "since we last spoke" — the wording now matches what the
 * count actually represents (see page.tsx, which compares each email
 * signal's ingestion time against the previous Brief's generatedAt, the
 * same comparison continuity.ts already uses for the same reason).
 *
 * Deliberately never states a conclusion here (e.g. "nothing required
 * your attention") — that would duplicate, and could directly
 * contradict, whatever Executive Intervention shows immediately below
 * it. A count is a plain structural fact, not a judgement about any of
 * the emails it counts.
 */
export function awarenessText(calendarConnected: boolean, emailConnected: boolean, emailCount: number, financeConnected: boolean): string {
  const parts: string[] = [];

  if (emailConnected) {
    parts.push(emailCount > 0 ? `${emailCount} new email${emailCount === 1 ? '' : 's'}` : 'your inbox');
  }
  if (calendarConnected) {
    parts.push('your calendar');
  }
  if (financeConnected) {
    parts.push('finances');
  }

  if (parts.length === 0) {
    return "I'm working from what you've told me so far — connect your calendar or inbox in Settings so I can start watching more.";
  }

  const joined =
    parts.length === 1
      ? parts[0]
      : parts.length === 2
        ? `${parts[0]} and ${parts[1]}`
        : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `Since we last spoke, I've reviewed ${joined}.`;
}

/**
 * Executive Awareness — Founder + CPO product discussion, 20 July 2026,
 * concluding the Executive Intervention Product Inquiry, and confirmed
 * again in the Production Implementation Contract review. Executive
 * Intervention answers "is there anything to act on today" — exactly
 * what Qualification now governs (see lib/cognition/qualify.ts).
 * Executive Awareness answers a different, permanently-relevant
 * question — "has someone competent been paying attention" — and unlike
 * Intervention, it is never gated by Qualification and never absent.
 *
 * The product promise this expresses: "Every morning, before you arrive,
 * I've already been watching." This is that sentence, made real, made
 * verifiable, and — as of the Capability & Claims Audit — made
 * genuinely accurate to what "since we last spoke" actually means.
 */
export function AwarenessLine({ calendarConnected, emailConnected, emailCount, financeConnected }: AwarenessLineProps) {
  return (
    <p className="mb-6 text-sm text-ink-faint">{awarenessText(calendarConnected, emailConnected, emailCount, financeConnected)}</p>
  );
}
