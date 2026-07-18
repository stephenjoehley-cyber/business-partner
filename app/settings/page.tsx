import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getConfiguredProviderId, getProviderConfigData } from '@/lib/signals/config-repository';
import { AppShell } from '@/components/foundation/AppShell';
import { AccountBlock } from '@/components/foundation/AccountBlock';
import { PageIntro } from '@/components/foundation/PageIntro';
import { ContextualPanel } from '@/components/foundation/ContextualPanel';
import { SettingSection } from './SettingSection';
import { ConnectionCard } from './ConnectionCard';
import { DangerPanel } from './DangerPanel';
import { ExportDataLink } from './ExportDataLink';
import { PreferredNameSection } from './PreferredNameSection';

/**
 * Settings — Phase B, Item 5 onward. See DECISIONS.md for the full
 * history of this screen's evolution.
 *
 * 2026-07-18 (Increment D1.1 — Executive Foundation & Settings Reference
 * Implementation): restyled onto the shared AppShell, PageIntro and
 * ContextualPanel, with three previously-inline sections extracted into
 * semantic components (SettingSection, ConnectionCard, DangerPanel).
 * Information architecture is unchanged — still the same three groups
 * plus Danger Zone (Personal, Connections, Your Business Data), not the
 * mockup's list-of-links-to-subpages IA, since Notifications/Security &
 * Access/Workspace don't exist yet (Founder decision, D1.1 Implementation
 * Plan §6). The old standalone "Back to your Morning Brief" link is
 * removed — AppShell's persistent Nav now covers that, more reliably,
 * for every page it wraps rather than one manually-added link. No
 * behavioural change to Calendar, Gmail, Export, Preferred Name, or
 * Delete Business — DeleteBusinessSection is untouched; only DangerPanel
 * wraps it differently.
 */
export const metadata: Metadata = {
  title: 'Settings | Business Partner',
  description: 'Manage the business information and preferences Business Partner uses to support you.',
};

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

  const calendarNeedsReconnect = Boolean(calendarConfig?.lastError);
  const gmailNeedsReconnect = Boolean(gmailConfig?.lastError);

  return (
    <AppShell
      accountSlot={<AccountBlock name={preferredName ?? business.name} businessName={business.name} />}
      contextualPanel={
        <ContextualPanel
          heading="Your preferences. Your business."
          orientation="These settings are about you and your business. They ensure Business Partner understands your context, respects your preferences, and keeps your information safe."
        />
      }
    >
      <div className="flex flex-col gap-8">
        <PageIntro
          title="Settings"
          supporting="You're in control of how Business Partner works with you and your business."
        />

        <SettingSection label="Personal">
          <div className="rounded-lg border border-surface-border bg-surface-card p-6">
            <PreferredNameSection initialPreferredName={preferredName} />
          </div>
        </SettingSection>

        <SettingSection label="Connections">
          <div className="flex flex-col gap-4">
            <ConnectionCard
              name="Google Calendar"
              isConnected={isCalendarConnected}
              needsReconnect={calendarNeedsReconnect}
              connectedCopy="Connected. Business Partner is observing your schedule."
              disconnectedCopy="Connect your calendar so Business Partner can prepare you for upcoming meetings and help prioritise your day."
              reconnectCopy="Calendar needs to be reconnected."
              connectHref="/api/integrations/google-calendar/connect"
              disconnectEndpoint="/api/integrations/google-calendar/disconnect"
              errorParam={searchParams.calendar}
            />

            <ConnectionCard
              name="Gmail"
              isConnected={isGmailConnected}
              needsReconnect={gmailNeedsReconnect}
              connectedCopy="Connected. Business Partner is observing which emails are still waiting on a reply from you."
              disconnectedCopy="Connect your inbox so Business Partner can see which emails are still waiting on a reply from you."
              reconnectCopy="Gmail needs to be reconnected."
              connectHref="/api/integrations/gmail/connect"
              disconnectEndpoint="/api/integrations/gmail/disconnect"
              errorParam={searchParams.gmail}
            />
          </div>
        </SettingSection>

        <SettingSection label="Your Business Data">
          <div className="rounded-lg border border-surface-border bg-surface-card p-6">
            <p className="text-sm text-ink-faint">
              Export a copy of everything Business Partner has learned about your business, or
              permanently delete it.
              <br />
              If you choose to delete it, your business data will be removed permanently. Your login
              stays active, so you&apos;re always welcome to start a new business here in the future.
            </p>

            <div className="mt-4">
              <ExportDataLink />
            </div>
          </div>
        </SettingSection>

        <SettingSection label="Danger Zone">
          <DangerPanel businessName={business.name} />
        </SettingSection>
      </div>
    </AppShell>
  );
}
