import type { Person } from '@prisma/client';
import type { SignalProvider, BusinessContext, TimeWindow } from '../../provider';
import type { EmailSignalPayload, DraftSignal } from '../../types';
import { getProviderConfigData, setProviderConfigData } from '../../config-repository';
import { encryptToken, decryptToken } from './tokenStorage';
import { refreshAccessToken } from './oauth';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

interface StoredGoogleConfig {
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  accessTokenExpiresAt: string;
  lastSyncedAt: string | null;
  lastError: string | null;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessage {
  id: string;
  internalDate?: string;
  payload?: { headers?: GmailHeader[] };
}

interface GmailThread {
  id: string;
  messages?: GmailMessage[];
}

/**
 * Gmail Signal Provider — Decision Backlog Q4/Gmail Product Audit,
 * 17 July 2026. Level 1 Communication Intelligence only: structural
 * facts computed from message headers (sender, recipient, subject,
 * timestamp). No message body or snippet is ever requested — the
 * gmail.metadata OAuth scope doesn't return one, and Level 1 has no
 * honest use for it anyway (Decision Backlog Q23, Executive
 * Observations, covers anything beyond this, deliberately deferred).
 *
 * This is the first live implementation of Business Partner's
 * Communication Provider pattern (the same SignalProvider seam,
 * domain 'email', that GoogleCalendarProvider already established for
 * domain 'calendar'). A future Outlook, Microsoft 365, or IMAP
 * provider should follow this exact shape — only fetchThreads and
 * toDraftSignal are genuinely Gmail-specific; token lifecycle,
 * person-matching, and error handling are the same pattern Calendar
 * already proved.
 *
 * PRODUCTION RELEASE GATE — do not expose this provider to any real
 * (non-test-user) owner until the Gmail Product Audit's five-item
 * Production Release Gate has been explicitly cleared by the Founder
 * (Google's restricted-scope verification pathway, whether the
 * security assessment is triggered, its cost, its timeline, and
 * explicit sign-off accepting the recurring commercial burden). Until
 * then, this provider is reachable only via Google accounts added as
 * approved test users in Google Cloud Console. See DECISIONS.md.
 */
export class GoogleGmailProvider implements SignalProvider {
  readonly domain = 'email' as const;
  readonly providerId = 'google-gmail';

  async fetchSignals(context: BusinessContext, window: TimeWindow): Promise<DraftSignal[]> {
    const { business, people } = context;

    const stored = (await getProviderConfigData(business.id, 'email')) as StoredGoogleConfig | null;
    if (!stored) {
      return [];
    }

    try {
      const accessToken = await this.getValidAccessToken(business.id, stored);
      const ownerEmail = await this.fetchOwnerEmailAddress(accessToken);
      const threads = await this.fetchThreads(accessToken);

      const signals: DraftSignal<EmailSignalPayload>[] = [];
      for (const thread of threads) {
        const signal = this.toDraftSignal(thread, ownerEmail, people);
        if (signal) signals.push(signal);
      }

      await setProviderConfigData(business.id, 'email', this.providerId, {
        ...stored,
        lastSyncedAt: new Date().toISOString(),
        lastError: null,
      });

      return signals;
    } catch (error) {
      await setProviderConfigData(business.id, 'email', this.providerId, {
        ...stored,
        lastError: error instanceof Error ? error.message : 'Unknown Gmail sync error.',
      });
      return [];
    }
  }

  private async getValidAccessToken(businessId: string, stored: StoredGoogleConfig): Promise<string> {
    const expiresAt = new Date(stored.accessTokenExpiresAt);
    const stillValid = expiresAt.getTime() - Date.now() > 60_000;

    if (stillValid) {
      return decryptToken(stored.encryptedAccessToken);
    }

    const refreshToken = decryptToken(stored.encryptedRefreshToken);
    const refreshed = await refreshAccessToken(refreshToken);

    await setProviderConfigData(businessId, 'email', this.providerId, {
      ...stored,
      encryptedAccessToken: encryptToken(refreshed.accessToken),
      accessTokenExpiresAt: refreshed.expiresAt.toISOString(),
    });

    return refreshed.accessToken;
  }

  private async fetchOwnerEmailAddress(accessToken: string): Promise<string> {
    const response = await fetch(`${GMAIL_API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Gmail profile lookup returned ${response.status}`);
    }
    const data = await response.json();
    return (data.emailAddress ?? '').toLowerCase();
  }

  /**
   * Restricted to the inbox's primary category, deliberately — a
   * promotional or social message has no honest "awaiting your reply"
   * meaning, and surfacing one as if it did would be a false structural
   * claim, not just noise. Uses `labelIds`, not the `q` search parameter
   * — confirmed directly against Google's own API reference (17 July
   * 2026, after a real production 403): `q` is explicitly disallowed
   * under the gmail.metadata scope, `labelIds` is not. Time-window
   * filtering is therefore done in toDraftSignal instead of server-side.
   * Only headers are requested (format=metadata, with an explicit header
   * allow-list) — never the message body.
   */
  private async fetchThreads(accessToken: string): Promise<GmailThread[]> {
    // maxResults deliberately small — this pulls the whole owner's recent
    // inbox activity once a day, not a full mailbox export, and each
    // returned thread costs a separate API call plus a database upsert.
    // Confirmed live, 17 July 2026: an earlier value of 50 produced
    // enough concurrent Signal upserts (persistSignals runs them all via
    // Promise.all) to exhaust the production database's connection pool
    // (limit: 1) and time out. Not yet a fix to persistSignals itself —
    // see Decision Backlog for that — this keeps Gmail's own footprint
    // proportionate in the meantime.
    const listParams = new URLSearchParams({ maxResults: '10' });
    listParams.append('labelIds', 'INBOX');
    listParams.append('labelIds', 'CATEGORY_PERSONAL');

    const listResponse = await fetch(`${GMAIL_API_BASE}/threads?${listParams.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!listResponse.ok) {
      throw new Error(`Gmail threads.list returned ${listResponse.status}`);
    }
    const listData = await listResponse.json();
    const threadStubs: { id: string }[] = listData.threads ?? [];

    const threads: GmailThread[] = [];
    for (const stub of threadStubs) {
      const detailParams = new URLSearchParams({ format: 'metadata' });
      ['From', 'To', 'Subject', 'Date'].forEach((header) => detailParams.append('metadataHeaders', header));

      const threadResponse = await fetch(
        `${GMAIL_API_BASE}/threads/${stub.id}?${detailParams.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!threadResponse.ok) {
        throw new Error(`Gmail threads.get returned ${threadResponse.status}`);
      }
      threads.push(await threadResponse.json());
    }
    return threads;
  }

  private getHeader(message: GmailMessage, name: string): string | undefined {
    return message.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
  }

  /** A "From"/"To" header may be "Name <email@example.com>" or a bare address. */
  private extractEmailAddress(headerValue: string | undefined): string | undefined {
    if (!headerValue) return undefined;
    const match = headerValue.match(/<([^>]+)>/);
    return (match ? match[1] : headerValue).trim().toLowerCase();
  }

  private matchCorrespondentToPerson(email: string | undefined, people: Person[]): Person | undefined {
    if (!email) return undefined;
    return people.find((p) => p.email?.trim().toLowerCase() === email);
  }

  /**
   * A thread only counts as "awaiting the owner's reply" if the owner did
   * not send the most recent message in it — a structural fact read
   * directly from the From header, never an inference about content.
   * Threads where the owner sent the last message are correctly excluded
   * entirely (this is watching for the owner's own action items, not
   * everyone else's).
   *
   * Deliberately does not take the pipeline's TimeWindow at all —
   * confirmed live, 17 July 2026: the default window
   * (generateSignalsForBusiness) is `{ from: now, to: now + 3 days }`,
   * built for Calendar's forward-looking "meetings coming up" semantics.
   * Email's "awaiting reply" is inherently backward-looking — a real
   * unanswered email is always in the past relative to "now," so
   * rejecting anything before `window.from` (as an earlier version of
   * this method did) silently excluded every real email, always. Gmail's
   * own `threads.list` response (most-recently-active first, maxResults
   * capped) already bounds this to a sensible recent set without an
   * explicit date filter.
   */
  private toDraftSignal(
    thread: GmailThread,
    ownerEmail: string,
    people: Person[]
  ): DraftSignal<EmailSignalPayload> | null {
    const messages = thread.messages ?? [];
    if (messages.length === 0) return null;

    const lastMessage = messages[messages.length - 1];
    const fromEmail = this.extractEmailAddress(this.getHeader(lastMessage, 'From'));

    if (!fromEmail || fromEmail === ownerEmail) {
      return null;
    }

    const now = new Date();
    const receivedAt = lastMessage.internalDate
      ? new Date(Number(lastMessage.internalDate))
      : new Date(this.getHeader(lastMessage, 'Date') ?? now);

    // A real, honest structural fact ("you never replied") stops being a
    // useful executive signal once it's old enough — at real-world
    // volume (confirmed live, 17 July 2026: ~100 emails/day), a 5-month-
    // old unanswered thread is noise, not something worth the owner's
    // attention today. 14 days is a deliberate, generous cutoff — long
    // enough to still catch a genuinely dropped commitment, short enough
    // that ancient dead threads don't resurface indefinitely.
    const STALENESS_CUTOFF_DAYS = 14;
    const daysSinceReceived = Math.max(0, Math.floor((now.getTime() - receivedAt.getTime()) / (1000 * 60 * 60 * 24)));
    if (daysSinceReceived > STALENESS_CUTOFF_DAYS) {
      return null;
    }

    const matchedPerson = this.matchCorrespondentToPerson(fromEmail, people);
    const subject = this.getHeader(lastMessage, 'Subject') ?? '(no subject)';
    const fromName = matchedPerson?.name ?? fromEmail;

    return {
      domain: 'email',
      type: daysSinceReceived >= 2 ? 'email_awaiting_reply_overdue' : 'email_awaiting_reply',
      occurredAt: receivedAt,
      relatedEntities: { personId: matchedPerson?.id },
      payload: {
        subject,
        fromName,
        // Deliberately empty: gmail.metadata never returns message body
        // or snippet content, and nothing downstream reads this field
        // today (confirmed directly — lib/cognition/interpreters/email.ts
        // never touches payload.preview).
        preview: '',
        requiresReply: true,
        daysSinceReceived,
      },
      sourceProviderId: this.providerId,
      externalRef: thread.id,
      confidence: 1.0,
    };
  }
}
