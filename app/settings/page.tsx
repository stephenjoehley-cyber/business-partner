import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getConfiguredProviderId, getProviderConfigData } from '@/lib/signals/config-repository';
import { DisconnectButton } from './DisconnectButton';
import { ExportDataLink } from './ExportDataLink';
import { DeleteBusinessSection } from './DeleteBusinessSection';
import { PreferredNameSection } from './PreferredNameSection';
import { HelpUnderstandSection } from './HelpUnderstandSection';

/**
 * Settings — Phase B, Item 5. Google Calendar connect status and a
 * connect/disconnect action.
 *
 * 2026-07-15: not-connected copy updated to state why Business Partner is
 * asking for access before the action itself, per the Founder's decision on
 * the Phase B Item 5 Product Audit ("explanation first, action second" —
 * Decision Backlog Q6).
 *
 * 2026-07-16: added a plain link back to the Morning Brief — Settings
 * previously had no navigation at all, a real dead end for anyone who
 * arrives here directly (e.g., returning later just to disconnect).
 * Discovered during Item 8's Founder Experience Review; see DECISIONS.md
 * and Decision Backlog Q21 (application-wide navigation architecture,
 * deferred — this is a local fix, not a resolution of that broader
 * question).
 *
 * 2026-07-16: added data export/deletion (Decision Backlog Q11, Operating
 * Model §4/§7 — the business owner owns their data). Option A, per the
 * Founder's explicit decision: deletes Business Memory only, never the
 * Supabase Auth identity — see app/api/account/delete/route.ts for the
 * full reasoning.
 *
 * 2026-07-17: added retroactive Preferred Name (Decision Backlog Q9) and
 * reorganized this screen into three relationship-based groups — Personal,
 * Connections, Your Business Data — rather than a flat stack of cards.
 * Founder's framing: these groups reflect what actually belongs to the
 * owner personally, what connects Business Partner to outside systems,
 * and what belongs to the business itself — "Me → My Connections → My
 * Business Data." No functional change to Calendar, Export, or Delete;
 * this is information architecture only. Likely a precursor to whatever
 * Asset 019 (Executive Relationship Journey) eventually formalizes here.
 *
 * 2026-07-17: added a Gmail card under Connections (Decision Backlog Q23,
 * Gmail Product Audit) — Level 1 Communication Intelligence, following
 * the exact same connect/disconnect/error pattern as Calendar.
 * DisconnectButton widened to take an explicit endpoint, rather than
 * duplicated, since both cards now share it.
 *
 * 2026-07-18: added "Help Business Partner Understand Your Business" —
 * Continuous Executive Learning (v1), per the Product Audit prepared
 * with the Executive Design Authority Brief. Lets an owner add a Goal or
 * Person after onboarding and manually refresh the Morning Brief to see
 * the effect — a permanent product capability, not an investor-demo
 * feature; the underlying Cognitive Engine already used Goals/People in
 * scoring before this existed, so this only exposes a dormant capability
 * rather than building a new one. The manual refresh button is a
 * deliberate Phase 1 teaching aid (see HelpUnderstandSection.tsx), not
 * the permanent interaction model.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { calendar?: string; gmail?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // middleware already redirects unauthenticated requests to /login

  // Same read pattern as app/morning-brief/page.tsx — one shared source of
  // truth for Preferred Name (Supabase user_metadata), never duplicated
  // into Business Memory.
  const preferredName =
    typeof user.user_metadata?.preferredName === 'string' && user.user_metadata.preferredName.trim()
      ? user.user_metadata.preferredName.trim()
      : null;

  const business = await getBusinessByOwner(user.id);
  if (!business) return null; // middleware/onboarding flow already handles this case elsewhere

  const configuredCalendarProviderId = await getConfiguredProviderId(business.id, 'calendar');
  const isCalendarConnected = configuredCalendarProviderId === 'google-calendar';

  const calendarConfig = isCalendarConnected
    ? ((await getProviderConfigData(business.id, 'calendar')) as { lastError?: string | null } | null)
    : null;

  const configuredEmailProviderId = await getConfiguredProviderId(business.id, 'email');
  const isGmailConnected = configuredEmailProviderId === 'google-gmail';

  const gmailConfig = isGmailConnected
    ? ((await getProviderConfigData(business.id, 'email')) as { lastError?: string | null } | null)
    : null;

  // lastError is read only to decide which calm, generic status to show —
  // its actual technical content is never rendered, per the Founder's
  // requirement that the stored error stays internal.
  const calendarNeedsReconnect = Boolean(calendarConfig?.lastError);
  const gmailNeedsReconnect = Boolean(gmailConfig?.lastError);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12">
      <a href="/morning-brief" className="focus-ring text-sm text-ink-faint hover:text-ink">
        Back to your Morning Brief
      </a>

      <h1 className="font-body text-ink text-xl font-semibold">Settings</h1>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-faint">Personal</h2>

        <div className="rounded-lg border border-surface-border bg-surface-card p-6">
          <PreferredNameSection initialPreferredName={preferredName} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-faint">
          Help Business Partner Understand Your Business
        </h2>

        <div className="rounded-lg border border-surface-border bg-surface-card p-6">
          <HelpUnderstandSection
            initialGoals={business.goals.map((g: { description: string }) => ({ description: g.description }))}
            initialPeople={business.people.map((p: { name: string; relationship: string }) => ({
              name: p.name,
              relationship: p.relationship,
            }))}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-faint">Connections</h2>

        <div className="rounded-lg border border-surface-border bg-surface-card p-6">
          <h3 className="font-body text-ink font-medium">Google Calendar</h3>

          <p className="mt-2 text-sm text-ink-faint">
            {isCalendarConnected
              ? calendarNeedsReconnect
                ? 'Calendar needs to be reconnected.'
                : 'Connected. Business Partner is observing your schedule.'
              : 'Connect your calendar so Business Partner can prepare you for upcoming meetings and help prioritise your day.'}
          </p>

          {searchParams.calendar === 'error' && (
            <p className="mt-2 text-sm text-ink-faint">
              Something went wrong connecting Google Calendar. Please try again.
            </p>
          )}

          <div className="mt-4">
            {isCalendarConnected ? (
              <DisconnectButton endpoint="/api/integrations/google-calendar/disconnect" />
            ) : (
              <a href="/api/integrations/google-calendar/connect"
                className="focus-ring inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface"
              >
                Connect Google Calendar
              </a>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-card p-6">
          <h3 className="font-body text-ink font-medium">Gmail</h3>

          <p className="mt-2 text-sm text-ink-faint">
            {isGmailConnected
              ? gmailNeedsReconnect
                ? 'Gmail needs to be reconnected.'
                : 'Connected. Business Partner is observing which emails are still waiting on a reply from you.'
              : 'Connect your inbox so Business Partner can see which emails are still waiting on a reply from you.'}
          </p>

          {searchParams.gmail === 'error' && (
            <p className="mt-2 text-sm text-ink-faint">
              Something went wrong connecting Gmail. Please try again.
            </p>
          )}

          <div className="mt-4">
            {isGmailConnected ? (
              <DisconnectButton endpoint="/api/integrations/gmail/disconnect" />
            ) : (
              <a href="/api/integrations/gmail/connect"
                className="focus-ring inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface"
              >
                Connect Gmail
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-xs uppercase tracking-wide text-ink-faint">Your Business Data</h2>

        <div className="rounded-lg border border-surface-border bg-surface-card p-6">
          <p className="text-sm text-ink-faint">
            Export a copy of everything Business Partner has learned about your business, or
            permanently delete it.
            <br />
            If you choose to delete it, your business data will be removed permanently. Your login
            stays active, so you&apos;re always welcome to start a new business here in the future.
          </p>

          <div className="mt-4 flex flex-col items-start gap-3">
            <ExportDataLink />
            <DeleteBusinessSection businessName={business.name} />
          </div>
        </div>
      </section>
    </main>
  );
}
