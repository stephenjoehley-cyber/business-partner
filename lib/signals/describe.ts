import { pluralDays, relativeDatePhrase } from '@/lib/shared/time';
import { companyDomainHint } from '@/lib/shared/emailDomain';
import type { Person } from '@prisma/client';
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
 * — it produces a description, not a scored Insight, and does no goal
 * matching. Where an interpreter already exists for a domain, its
 * `Insight.summary` is the richer, context-aware version of the same
 * fact; this function is the fallback plain-language form used for
 * signals that are along for the ride as supporting evidence rather than
 * the one being reasoned about.
 *
 * `people` is optional (defaults to none) so every existing call site
 * keeps working unchanged — but found live, 19 July 2026: without it,
 * the calendar case could describe the exact same meeting differently
 * from the winning recommendation's own headline (which does look the
 * person up), since only the calendar interpreter previously did this
 * lookup. Email's `payload.fromName` doesn't have the same gap — the
 * Gmail provider already resolves it to the matched Person's name once,
 * at ingestion (see gmail.ts's toDraftSignal), so no live lookup is
 * needed there.
 */
export function describeSignalPlainly(signal: Signal, now: Date = new Date(), people: Person[] = []): string {
  switch (signal.domain) {
    case 'email': {
      const payload = signal.payload as EmailSignalPayload;
      // Found live, 19 July 2026 — this read payload.daysSinceReceived
      // directly, the same frozen ingestion-time value already fixed in
      // the email interpreter (lib/cognition/interpreters/email.ts) for
      // the winning signal's own reasoning. This function is used for
      // every OTHER signal shown as supporting evidence, which never
      // passes through that fix — so a non-winning email's displayed
      // "unanswered for X days" text kept showing its original,
      // stale ingestion-time count indefinitely, even after the
      // interpreter fix shipped and even after a genuine fresh
      // generation.
      const daysSince = Math.max(0, Math.floor((now.getTime() - signal.occurredAt.getTime()) / (1000 * 60 * 60 * 24)));
      return daysSince >= 2
        ? `An email from ${payload.fromName}, unanswered for ${pluralDays(daysSince)}`
        : `An email from ${payload.fromName}, waiting on a reply`;
    }
    case 'calendar': {
      const payload = signal.payload as CalendarSignalPayload;
      const when = relativeDatePhrase(now, signal.occurredAt);
      // Found live, 19 July 2026: the winning recommendation's headline
      // correctly showed "Stephen Oehley" (a matched Person, via the
      // calendar interpreter's own lookup) while this function, for the
      // exact same meeting, still showed "a new contact at
      // mzansichat.co.za" — the same inconsistency the title fix
      // addressed for two genuinely different meetings, but this time
      // for one single meeting describing itself two different ways.
      const matchedPersonId = signal.relatedEntities.personId;
      const matchedPerson = matchedPersonId ? people.find((p) => p.id === matchedPersonId) : undefined;
      const rawAttendee = payload.attendees[0];
      const domainHint = matchedPerson ? undefined : companyDomainHint(rawAttendee ?? '');
      const attendeeDisplay =
        matchedPerson?.name ?? (domainHint ? `a new contact at ${domainHint}` : rawAttendee ?? 'a new contact');
      return payload.isFirstMeetingWithPerson
        ? `A first meeting with ${attendeeDisplay} — "${payload.title}" — coming up ${when}`
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
