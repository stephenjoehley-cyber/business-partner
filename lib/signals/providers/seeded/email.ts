import type { SignalProvider, BusinessContext, TimeWindow } from '../../provider';
import type { EmailSignalPayload, DraftSignal } from '../../types';
import { dayKey, pick, seededExternalRef, seededRandom } from './util';

const SUBJECT_TEMPLATES = [
  (name: string) => `Re: quotation for ${name}`,
  (name: string) => `Question about your services — ${name}`,
  (name: string) => `Following up — ${name}`,
  (name: string) => `${name}: availability next week?`,
] as const;

const PREVIEWS = [
  'Just checking in on timing for this — would love to move forward soon.',
  'Could you clarify the scope before we confirm?',
  'Thanks for the call earlier, sending the details you asked for.',
  'Wanted to check whether this is still on track.',
] as const;

/**
 * Seeded Email provider — Increment 2.
 *
 * Produces plausible unread/unreplied emails, preferring real People on
 * file. Replaced by a Gmail provider post-MVP without changes to callers.
 */
export class SeededEmailProvider implements SignalProvider {
  readonly domain = 'email' as const;
  readonly providerId = 'seeded-email';

  async fetchSignals(context: BusinessContext, window: TimeWindow): Promise<DraftSignal[]> {
    const { business, people } = context;
    const rng = seededRandom(`${business.id}:email:${dayKey(window.from)}`);

    const emailCount = 1 + Math.floor(rng() * 3); // 1–3 emails in the window
    const candidatePeople = people.filter((p) => p.relationship === 'customer' || p.relationship === 'prospect');

    const signals: DraftSignal<EmailSignalPayload>[] = [];

    for (let i = 0; i < emailCount; i++) {
      const person = candidatePeople.length > 0 ? pick(rng, candidatePeople) : null;
      const name = person?.name ?? 'a new enquiry';
      const receivedAt = new Date(window.from.getTime() + rng() * (window.to.getTime() - window.from.getTime()));
      const daysSinceReceived = Math.max(
        0,
        Math.floor((window.to.getTime() - receivedAt.getTime()) / (1000 * 60 * 60 * 24))
      );

      signals.push({
        domain: 'email',
        type: daysSinceReceived >= 2 ? 'email_awaiting_reply_overdue' : 'email_awaiting_reply',
        occurredAt: receivedAt,
        relatedEntities: { personId: person?.id },
        payload: {
          subject: pick(rng, SUBJECT_TEMPLATES)(name),
          fromName: name,
          preview: pick(rng, PREVIEWS),
          requiresReply: true,
          daysSinceReceived,
        },
        sourceProviderId: this.providerId,
        externalRef: seededExternalRef([this.providerId, business.id, dayKey(window.from), i]),
        confidence: 1.0,
      });
    }

    return signals;
  }
}
