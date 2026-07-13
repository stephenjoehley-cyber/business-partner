import { pluralDays, relativeDatePhrase } from '@/lib/shared/time';
import type {
  CalendarSignalPayload,
  CrmSignalPayload,
  EmailSignalPayload,
  FinanceSignalPayload,
  ProposalSignalPayload,
  Signal,
  TaskSignalPayload,
} from './types';

/**
 * Turns any Signal into one plain-English sentence — no domain, no type,
 * no raw timestamp. This is the only form of a Signal that's allowed
 * outside the Cognitive Engine's own interpreters: the Narrative Layer's
 * evidence input (`lib/narrative/fromMorningBrief.ts`) and the Morning
 * Brief's evidence-disclosure UI both use this instead of reading
 * `signal.domain` / `signal.type` directly.
 *
 * Executive Presence Specification, Principle 3 ("Human Executive
 * Language") and the Editorial Style Guide §4 ("Raw enum or identifier
 * values ... never show a value exactly as it exists in a database") are
 * both explicit that `email_awaiting_reply_overdue` must never reach an
 * owner. This function is the one place that translation happens for
 * "any signal, not just the one the Cognitive Engine chose to act on."
 *
 * Deliberately simpler than the interpreters in `lib/cognition/interpreters`
 * — it has no access to Business Memory (no known-person lookup, no goal
 * matching) and produces a description, not a scored Insight. Where an
 * interpreter already exists for a domain, its `Insight.summary` is the
 * richer, context-aware version of the same fact; this function is the
 * fallback plain-language form used for signals that are along for the
 * ride as supporting evidence rather than the one being reasoned about.
 */
export function describeSignalPlainly(signal: Signal, now: Date = new Date()): string {
  switch (signal.domain) {
    case 'email': {
      const payload = signal.payload as EmailSignalPayload;
      return payload.daysSinceReceived >= 2
        ? `An email from ${payload.fromName}, unanswered for ${pluralDays(payload.daysSinceReceived)}`
        : `An email from ${payload.fromName}, waiting on a reply`;
    }
    case 'calendar': {
      const payload = signal.payload as CalendarSignalPayload;
      const when = relativeDatePhrase(now, signal.occurredAt);
      return payload.isFirstMeetingWithPerson
        ? `A first meeting with ${payload.attendees[0] ?? 'a new contact'}, coming up ${when}`
        : `A meeting — "${payload.title}" — coming up ${when}`;
    }
    case 'tasks': {
      const payload = signal.payload as TaskSignalPayload;
      return payload.isOverdue
        ? `The task "${payload.title}", overdue`
        : `The task "${payload.title}", due ${relativeDatePhrase(now, new Date(payload.dueDate))}`;
    }
    case 'crm': {
      const payload = signal.payload as CrmSignalPayload;
      return `An opportunity in ${payload.stage.replaceAll('_', ' ')}, there for ${pluralDays(payload.daysInStage)}`;
    }
    case 'finance': {
      const payload = signal.payload as FinanceSignalPayload;
      return `An invoice for ${payload.customerName}, ${pluralDays(payload.daysOverdue)} overdue`;
    }
    case 'proposals': {
      const payload = signal.payload as ProposalSignalPayload;
      return payload.viewed
        ? `The proposal "${payload.proposalTitle}", viewed but not yet actioned`
        : `The proposal "${payload.proposalTitle}", sent ${pluralDays(payload.daysSinceSent)} ago and not yet opened`;
    }
    default: {
      // Exhaustiveness guard — a new SignalDomain added to
      // `lib/signals/types.ts` without a case here is a build error, not a
      // silent raw fallback (matching Constitution Principle 10, "never
      // hide uncertainty," extended to never leak an enum by omission).
      const exhaustiveCheck: never = signal.domain;
      throw new Error(`describeSignalPlainly: no case for signal domain "${exhaustiveCheck}".`);
    }
  }
}
