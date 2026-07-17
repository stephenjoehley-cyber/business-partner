import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { getConfiguredProviderId, getProviderConfigData } from '@/lib/signals/config-repository';

/**
 * TEMPORARY diagnostic route — added 17 July 2026 solely to confirm,
 * directly, whether GoogleGmailProvider is actually producing signals for
 * a real connected account, since the Morning Brief only ever displays
 * its single highest-priority recommendation and can't be used to
 * confirm or deny a lower-priority domain's presence. Read-only, scoped
 * to the calling owner's own business only — same auth pattern as every
 * other route. Delete once Gmail is confirmed working end-to-end; not
 * meant to be a permanent feature or a precedent for a general-purpose
 * debug surface.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const business = await getBusinessByOwner(user.id);
  if (!business) {
    return NextResponse.json({ error: 'Complete your business profile first' }, { status: 409 });
  }

  const signals = await getSignalsForBusiness(business.id);
  const emailProviderId = await getConfiguredProviderId(business.id, 'email');
  const emailConfig = (await getProviderConfigData(business.id, 'email')) as
    | { lastSyncedAt?: string | null; lastError?: string | null }
    | null;

  return NextResponse.json({
    configuredEmailProvider: emailProviderId,
    emailProviderLastSyncedAt: emailConfig?.lastSyncedAt ?? null,
    emailProviderLastError: emailConfig?.lastError ?? null,
    totalSignals: signals.length,
    signalsByDomainAndSource: signals.map((s) => ({
      domain: s.domain,
      type: s.type,
      sourceProviderId: s.sourceProviderId,
      occurredAt: s.occurredAt,
    })),
  });
}
