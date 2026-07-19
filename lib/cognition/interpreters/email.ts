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

/**
 * Found live, 19 July 2026 — the provider-level exclusion (Gmail
 * provider, see DECISIONS.md) only stops NEW signals like this from
 * being created; it does nothing for the two already sitting in the
 * database from before that fix existed. Refreshing re-fetches from
 * Gmail and adds anything new — it doesn't retroactively re-validate
 * what's already been ingested. This is the same shape of gap as the
 * 165-day-old-email and duplicate-Person bugs found earlier: new
 * ingestion-time logic doesn't rewrite history.
 *
 * The interpreter is the one place, per that same lesson, where every
 * signal — old or freshly ingested — genuinely gets re-evaluated on
 * every single generation. Re-checking here catches the noreply@ case
 * retroactively: for an unmatched sender, payload.fromName is literally
 * their raw email address (set at ingestion — see gmail.ts), so the
 * same pattern check applies. This can't retroactively catch bulk mail
 * identified by a List-Unsubscribe header, since that header itself was
 * never stored in the payload — a signal already ingested that way will
 * fade out naturally via its own low-significance decay curve instead.
 */
const AUTOMATED_SENDER_PATTERNS = [
  'noreply',
  'no-reply',
  'no_reply',
  'donotreply',
  'do-not-reply',
  'notifications',
  'notification',
  'mailer-daemon',
  'postmaster',
  'system',
] as const;

function looksAutomated(fromNameOrEmail: string): boolean {
  const localPart = fromNameOrEmail.split('@')[0]?.toLowerCase() ?? '';
  return AUTOMATED_SENDER_PATTERNS.some((pattern) => localPart.includes(pattern));
}

function interpretEmail(signal: Signal, context: BusinessContext): InterpretedSignal {
  const payload = signal.payload as EmailSignalPayload;
  const personId = signal.relatedEntities.personId;
  const person = personId ? context.people.find((p) => p.id === personId) : undefined;
  const isKnown = Boolean(person);
  const daysSince = payload.daysSinceReceived;
  const who = person?.name ?? payload.fromName;

  // An unmatched automated address is never really "awaiting a reply" —
  // recommending one is a false claim, not just low priority. Confidence
  // is forced low enough that recommend() can never produce a
  // confident_recommendation from this (CONFIDENCE_THRESHOLD is 0.6) —
  // the low_confidence_insight tier has no recommendedAction field at
  // all, so the false "Reply to..." directive becomes structurally
  // impossible regardless of how this scores on every other dimension.
  const isAutomated = !isKnown && looksAutomated(payload.fromName);

  const matchedGoals = matchGoalsForSignal(context.goals, EMAIL_GOAL_KEYWORDS, payload.subject);
  const significance = significanceFor(isKnown, matchedGoals.length > 0);
  const urgency = isAutomated ? 0 : urgencyForSignificance(significance, daysSince);

  // A known customer or prospect matters more than an unidentified sender —
  // relationship risk is concrete for someone already on file.
  const businessImpact = isAutomated ? 0.1 : isKnown ? 0.75 : 0.5;

  const strategicImportance = isAutomated ? 0 : matchedGoals.length > 0 ? 0.7 : 0.4;

  // Less certain this specific message matters if we don't recognise the
  // sender — could be a low-value cold enquiry rather than a relationship
  // to protect.
  const confidence = isAutomated ? 0.1 : isKnown ? 0.9 : 0.75;

  const summary =
    daysSince >= 2
      ? `An email from ${who} has gone unanswered for ${pluralDays(daysSince)}.`
      : `An email from ${who} is waiting on a reply.`;

  // Recommendation 2, approved by Founder + CPO, 19 July 2026 — Business
  // Memory the owner provided, not extracted from Gmail. Only included
  // when actually present; never fabricated.
  const companyContext = person?.company ? ` at ${person.company}` : '';

  const reasoningParts: string[] = [
    `"${payload.subject}" was received ${pluralDays(daysSince)} ago and still requires a reply.`,
    isAutomated
      ? `${who} appears to be an automated notification address, not a person who could receive a reply.`
      : isKnown
        ? `${who} is a known ${person!.relationship}${companyContext} — an unanswered message from someone on file carries more relationship risk than a generic enquiry.`
        : `${who} is not yet on file as a known contact, so this is treated as a new enquiry rather than an existing relationship.`,
  ];
  if (matchedGoals.length > 0 && !isAutomated) {
    reasoningParts.push(`This also touches a stated goal: "${matchedGoals[0].description}".`);
  }

  return {
    insight: {
      summary,
      relatedPersonName: person?.name,
      isKnownRelationship: isKnown,
      relatedGoalDescriptions: isAutomated ? [] : matchedGoals.map((g) => g.description),
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
