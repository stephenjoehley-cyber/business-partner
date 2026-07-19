import type { BusinessContext } from '@/lib/signals/provider';
import type { CalendarSignalPayload, Signal } from '@/lib/signals/types';
import type { InterpretedSignal, SignalInterpreter } from './types';
import { clamp01, matchGoalsForSignal, relativeDayPhrase } from './util';

const CALENDAR_GOAL_KEYWORDS = [
  'sales',
  'growth',
  'new customer',
  'pipeline',
  'conversion',
  'revenue',
  'acquisition',
] as const;

function interpretMeetingUpcoming(signal: Signal, context: BusinessContext): InterpretedSignal {
  const payload = signal.payload as CalendarSignalPayload;
  const personId = signal.relatedEntities.personId;
  const person = personId ? context.people.find((p) => p.id === personId) : undefined;
  const isKnown = Boolean(person);
  const who = person?.name ?? (payload.attendees[0] ?? 'a new contact');
  const now = new Date();
  const when = relativeDayPhrase(now, signal.occurredAt);

  // Urgency rises the sooner the meeting is — a meeting today needs
  // preparation now; one three days out can wait.
  const hoursUntil = Math.max(0, (signal.occurredAt.getTime() - now.getTime()) / (1000 * 60 * 60));
  const urgency = clamp01(1 - hoursUntil / 72); // saturates toward 0 as it approaches 72h out

  // A first meeting with a prospect is a conversion opportunity; a
  // returning customer meeting protects an existing relationship. Both
  // matter, but a first meeting with someone not yet won carries more
  // upside if prepared for well.
  const isProspect = person?.relationship === 'prospect';
  const businessImpact = payload.isFirstMeetingWithPerson && isProspect ? 0.85 : isKnown ? 0.6 : 0.5;

  const matchedGoals = matchGoalsForSignal(context.goals, CALENDAR_GOAL_KEYWORDS, payload.title);
  const strategicImportance =
    matchedGoals.length > 0 ? (payload.isFirstMeetingWithPerson ? 0.8 : 0.6) : 0.4;

  const confidence = isKnown ? 0.85 : 0.7;

  const summary = payload.isFirstMeetingWithPerson
    ? `A first meeting with ${who} is coming up ${when}.`
    : `A meeting with ${who} is coming up ${when}.`;

  const reasoningParts: string[] = [
    `"${payload.title}" is scheduled ${when} (${payload.durationMinutes} minutes).`,
  ];
  if (payload.isFirstMeetingWithPerson && isProspect) {
    reasoningParts.push(
      `This is a first meeting with a prospect — first impressions here directly affect conversion.`
    );
  } else if (isKnown) {
    reasoningParts.push(`${who} is an existing ${person!.relationship} — worth reviewing recent history before the call.`);
  } else {
    reasoningParts.push(`No prior record exists for this attendee yet.`);
  }
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
    recommendedAction: `Prepare briefing notes for your meeting with ${who}, ${when}.`,
  };
}

export const meetingUpcomingInterpreter: SignalInterpreter = {
  domain: 'calendar',
  type: 'meeting_upcoming',
  interpret: interpretMeetingUpcoming,
};
