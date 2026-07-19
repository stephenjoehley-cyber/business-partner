import type { BusinessContext } from '@/lib/signals/provider';
import type { EmailSignalPayload, Signal } from '@/lib/signals/types';
import type { InterpretedSignal, SignalInterpreter } from './types';
import { clamp01, matchGoalsForSignal, pluralDays } from './util';

/**
 * Goals mentioning any of these are treated as strategically connected to
 * an unanswered email — e.g. "improve customer response times" or "protect
 * key client relationships". Deliberately small and literal (see
 * matchGoals) rather than an LLM-scored relevance judgement.
 */
const EMAIL_GOAL_KEYWORDS = [
  'customer',
  'client',
  'relationship',
  'retention',
  'response',
  'reply',
  'communication',
  'service',
] as const;

/**
 * Product decision, 19 July 2026 (Founder + CPO, following a real Morning
 * Brief where a low-value 7-day-old WordPress notification kept winning
 * over genuinely relevant signals): "Executive attention is not preserved
 * by age alone. A signal's persistence must be proportional to its
 * business significance." Every Morning Brief is a fresh executive
 * assessment of the business as it exists today — persistence is earned
 * each morning, never assumed.
 *
 * Previously, every email shared one urgency curve (rise for 5 days, hold
 * at maximum indefinitely, then a hard cutoff at day 14 removed it
 * entirely) — a plateau-then-cliff shape nobody had actually decided on,
 * applied identically regardless of whether the email mattered at all.
 * Replaced with three decay curves, selected by significance — reusing
 * the same isKnown/matchedGoals signals already computed below, not a
 * new concept:
 *
 *   high   (known relationship AND touches a stated goal) — rises over 5
 *          days, then holds, never decaying. "Genuinely important
 *          unresolved commitments may persist substantially longer."
 *   medium (known OR goal-touching, not both) — rises over 5 days, then
 *          decays gradually back to zero over the following 15 days.
 *          "Medium-significance business correspondence should decay
 *          more gradually."
 *   low    (neither) — rises quickly over 2 days, then decays fast,
 *          reaching zero by day 7. "Low-significance operational noise
 *          should decay quickly... should become less important every
 *          morning until it quietly disappears."
 *
 * Deliberately still simple, deterministic piecewise-linear curves — no
 * new capability, the same engineering discipline as everything else in
 * this interpreter. Recomputed fresh on every single generation; nothing
 * here is cached or persisted as "already decided."
 */
type Significance = 'high' | 'medium' | 'low';

function significanceFor(isKnown: boolean, hasGoalMatch: boolean): Significance {
  if (isKnown && hasGoalMatch) return 'high';
  if (isKnown || hasGoalMatch) return 'medium';
  return 'low';
}

function urgencyForSignificance(significance: Significance, daysSince: number): number {
  switch (significance) {
    case 'high':
      // Rises over 5 days, then holds — never decays.
      return clamp01(daysSince / 5);
    case 'medium':
      // Rises over 5 days, then decays to zero over the following 15.
      if (daysSince <= 5) return clamp01(daysSince / 5);
      return clamp01(1 - (daysSince - 5) / 15);
    case 'low':
      // Rises over 2 days, then decays to zero by day 7.
      if (daysSince <= 2) return clamp01(daysSince / 2);
      return clamp01(1 - (daysSince - 2) / 5);
  }
}

function interpretEmail(signal: Signal, context: BusinessContext): InterpretedSignal {
  const payload = signal.payload as EmailSignalPayload;
  const personId = signal.relatedEntities.personId;
  const person = personId ? context.people.find((p) => p.id === personId) : undefined;
  const isKnown = Boolean(person);
  const daysSince = payload.daysSinceReceived;
  const who = person?.name ?? payload.fromName;

  const matchedGoals = matchGoalsForSignal(context.goals, EMAIL_GOAL_KEYWORDS, payload.subject);
  const significance = significanceFor(isKnown, matchedGoals.length > 0);
  const urgency = urgencyForSignificance(significance, daysSince);

  // A known customer or prospect matters more than an unidentified sender —
  // relationship risk is concrete for someone already on file.
  const businessImpact = isKnown ? 0.75 : 0.5;

  const strategicImportance = matchedGoals.length > 0 ? 0.7 : 0.4;

  // Less certain this specific message matters if we don't recognise the
  // sender — could be a low-value cold enquiry rather than a relationship
  // to protect.
  const confidence = isKnown ? 0.9 : 0.75;

  const summary =
    daysSince >= 2
      ? `An email from ${who} has gone unanswered for ${pluralDays(daysSince)}.`
      : `An email from ${who} is waiting on a reply.`;

  const reasoningParts: string[] = [
    `"${payload.subject}" was received ${pluralDays(daysSince)} ago and still requires a reply.`,
    isKnown
      ? `${who} is a known ${person!.relationship} — an unanswered message from someone on file carries more relationship risk than a generic enquiry.`
      : `${who} is not yet on file as a known contact, so this is treated as a new enquiry rather than an existing relationship.`,
  ];
  if (matchedGoals.length > 0) {
    reasoningParts.push(`This also touches a stated goal: "${matchedGoals[0].description}".`);
  }

  return {
    insight: {
      summary,
      relatedPersonName: person?.name,
      isKnownRelationship: isKnown,
      relatedGoalDescriptions: matchedGoals.map((g) => g.description),
    },
    dimensions: {
      businessImpact,
      urgency,
      strategicImportance,
      confidence,
      ownerPreference: 0.5,
    },
    reasoning: reasoningParts.join(' '),
    recommendedAction: `Reply to ${who} about "${payload.subject}".`,
  };
}

export const emailAwaitingReplyInterpreter: SignalInterpreter = {
  domain: 'email',
  type: 'email_awaiting_reply',
  interpret: interpretEmail,
};

export const emailAwaitingReplyOverdueInterpreter: SignalInterpreter = {
  domain: 'email',
  type: 'email_awaiting_reply_overdue',
  interpret: interpretEmail,
};
