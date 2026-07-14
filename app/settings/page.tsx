import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getConfiguredProviderId, getProviderConfigData } from '@/lib/signals/config-repository';
import { DisconnectButton } from './DisconnectButton';

/**
 * Settings — Phase B, Item 5. A single card: Google Calendar connect status
 * and a connect/disconnect action. Nothing else belongs here yet, per the
 * approved Product Audit's explicit exclusion of any broader integrations
 * page.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { calendar?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // middleware already redirects unauthenticated requests to /login

  const business = await getBusinessByOwner(user.id);
  if (!business) return null; // middleware/onboarding flow already handles this case elsewhere

  const configuredProviderId = await getConfiguredProviderId(business.id, 'calendar');
  const isConnected = configuredProviderId === 'google-calendar';

  const config = isConnected
    ? ((await getProviderConfigData(business.id, 'calendar')) as { lastError?: string | null } | null)
    : null;

  // lastError is read only to decide which calm, generic status to show —
  // its actual technical content is never rendered, per the Founder's
  // requirement that the stored error stays internal.
  const needsReconnect = Boolean(config?.lastError);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <h1 className="font-body text-ink text-xl font-semibold">Settings</h1>

      <div className="rounded-lg border border-surface-border bg-surface-card p-6">
        <h2 className="font-body text-ink font-medium">Google Calendar</h2>

        <p className="mt-2 text-sm text-ink-faint">
          {isConnected
            ? needsReconnect
              ? 'Calendar needs to be reconnected.'
              : 'Connected. Business Partner is observing your schedule.'
            : 'Not connected. Business Partner is ready to observe your schedule once connected.'}
        </p>

        {searchParams.calendar === 'error' && (
          <p className="mt-2 text-sm text-ink-faint">
            Something went wrong connecting Google Calendar. Please try again.
          </p>
        )}

        <div className="mt-4">
          {isConnected ? (
            <DisconnectButton />
          ) : (
            <a
              href="/api/integrations/google-calendar/connect"
              className="focus-ring inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface"
            >
              Connect Google Calendar
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
