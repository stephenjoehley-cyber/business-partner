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

function interpretEmail(signal: Signal, context: BusinessContext): InterpretedSignal {
  const payload = signal.payload as EmailSignalPayload;
  const personId = signal.relatedEntities.personId;
  const person = personId ? context.people.find((p) => p.id === personId) : undefined;
  const isKnown = Boolean(person);
  const daysSince = payload.daysSinceReceived;
  const who = person?.name ?? payload.fromName;

  // Urgency climbs with days waiting, saturating at 5 days — a week-old
  // unanswered email is already as urgent as it's going to get for scoring
  // purposes, even though it keeps getting worse in reality.
  const urgency = clamp01(daysSince / 5);

  // A known customer or prospect matters more than an unidentified sender —
  // relationship risk is concrete for someone already on file.
  const businessImpact = isKnown ? 0.75 : 0.5;

  const matchedGoals = matchGoalsForSignal(context.goals, EMAIL_GOAL_KEYWORDS, payload.subject);
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
