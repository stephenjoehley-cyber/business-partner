import type { BusinessContext } from '@/lib/signals/provider';
import type { DebtorSignalPayload, CreditorSignalPayload, Signal } from '@/lib/signals/types';
import type { InterpretedSignal, SignalInterpreter } from './types';
import { clamp01, pluralDays } from './util';
import { findMatchedPerson } from '../grounding';

/**
 * Product Audit — F1: Aged Debtors/Creditors, 22 July 2026 (Founder + CPO).
 *
 * Amount, age, relationship, recurrence, and concentration were assigned to
 * Understand/Prioritise, not Qualification (Audit v2 §9). Recurrence and
 * concentration are explicitly deferred to F1.1 (cross-signal reasoning
 * beyond what a per-signal interpreter can do — see supersession.ts for
 * the one piece of cross-signal logic F1 does need). This interpreter
 * covers amount (surfaced plainly, not editorially tiered — no revenue
 * baseline exists to judge whether a given amount is "large" for a
 * specific business), age, and relationship.
 *
 * Urgency curve deliberately reuses 30 days as its scaling reference for
 * debtors — not as a qualification threshold (Qualification now admits at
 * day 1, per the audit's correction), but because the Founder/CPO's own
 * language ("thirty days is a priority and severity consideration") names
 * exactly the number this curve should reach its ceiling at.
 */
/**
 * Same calendar-date-boundary fix as financeQualificationPolicy.ts's
 * daysUntilDue — comparing calendar dates, not raw durations, so a due
 * date checked partway through the day doesn't floor incorrectly.
 */
function daysOverdue(dueDate: string, now: Date): number {
  const due = new Date(dueDate);
  const dueDayStart = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const nowDayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((nowDayStart - dueDayStart) / (1000 * 60 * 60 * 24));
}

function interpretFinance(signal: Signal, context: BusinessContext): InterpretedSignal {
  const payload = signal.payload as DebtorSignalPayload | CreditorSignalPayload;
  const person = findMatchedPerson(signal, context.people);
  const isKnown = Boolean(person);
  const who = person?.name ?? payload.counterpartyName;
  const now = new Date();
  const overdueBy = daysOverdue(payload.dueDate, now); // positive = overdue, negative = not yet due

  let urgency: number;
  let summary: string;
  let recommendedAction: string;

  if (payload.role === 'debtor') {
    urgency = overdueBy > 0 ? clamp01(overdueBy / 30) : 0;
    summary =
      overdueBy > 0
        ? `An invoice from ${who} for ${payload.currency} ${payload.amount.toLocaleString()} is ${pluralDays(overdueBy)} overdue.`
        : `An invoice from ${who} for ${payload.currency} ${payload.amount.toLocaleString()} is due soon.`;
    recommendedAction = `Follow up with ${who} about the overdue invoice (${payload.invoiceReference}).`;
  } else {
    const dueSoonUrgency = overdueBy >= -7 && overdueBy <= 0 ? clamp01(1 - Math.abs(overdueBy) / 7) : 0;
    urgency = overdueBy > 0 ? 1 : dueSoonUrgency;
    summary =
      overdueBy > 0
        ? `An amount owed to ${who} for ${payload.currency} ${payload.amount.toLocaleString()} is ${pluralDays(overdueBy)} overdue.`
        : `An amount owed to ${who} for ${payload.currency} ${payload.amount.toLocaleString()} is due soon.`;
    recommendedAction = `Arrange payment to ${who} (${payload.invoiceReference}) before it becomes overdue.`;
  }

  // Mirrors email.ts's known/unknown pattern exactly — a known
  // relationship carries more concrete weight than an unidentified name.
  const businessImpact = isKnown ? 0.75 : 0.5;
  const strategicImportance = 0.6; // already qualified as world-inherent or owner-declared; a genuine consequence either way
  const confidence = isKnown ? 0.9 : 0.75;

  const relationshipContext = isKnown
    ? `${who} is a known ${person!.relationship} — an outstanding amount with someone already on file carries concrete relationship and cash-flow weight.`
    : `${who} is not yet recorded in your Business Memory, so this is shown on the strength of the export alone.`;

  const reportedAsAt = signal.reportingPeriod?.end.toISOString().slice(0, 10);
  const reasoning = `${summary} ${relationshipContext}${reportedAsAt ? ` Reported as at ${reportedAsAt}.` : ''}`;

  return {
    insight: {
      summary,
      relatedPersonName: person?.name,
      isKnownRelationship: isKnown,
      relatedGoalDescriptions: [],
    },
    dimensions: {
      businessImpact,
      urgency,
      strategicImportance,
      confidence,
      ownerPreference: 0.5,
    },
    reasoning,
    recommendedAction,
  };
}

export const debtorOverdueInterpreter: SignalInterpreter = {
  domain: 'finance',
  type: 'debtor_overdue',
  interpret: interpretFinance,
};

export const creditorDueInterpreter: SignalInterpreter = {
  domain: 'finance',
  type: 'creditor_due',
  interpret: interpretFinance,
};
