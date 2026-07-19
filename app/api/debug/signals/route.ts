import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { getConfiguredProviderId, getProviderConfigData } from '@/lib/signals/config-repository';
import { getAllMorningBriefsForBusiness } from '@/lib/cognition/repository';

/**
 * TEMPORARY diagnostic route — extended 19 July 2026 to investigate why
 * the continuity note isn't appearing on the Morning Brief. Read-only,
 * scoped to the calling owner's own business only. Delete once resolved —
 * not meant to be a permanent feature.
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

  const calendarProviderId = await getConfiguredProviderId(business.id, 'calendar');
  const calendarConfig = (await getProviderConfigData(business.id, 'calendar')) as
    | { lastSyncedAt?: string | null; lastError?: string | null }
    | null;

  const emailProviderId = await getConfiguredProviderId(business.id, 'email');
  const emailConfig = (await getProviderConfigData(business.id, 'email')) as
    | { lastSyncedAt?: string | null; lastError?: string | null }
    | null;

  const allBriefs = await getAllMorningBriefsForBusiness(business.id);
  const lastTwoBriefs = allBriefs.slice(-2).map((b) => ({
    tier: b.tier,
    generatedAt: b.generatedAt,
    continuityNote: b.tier !== 'all_clear' ? b.continuityNote ?? null : null,
  }));

  return NextResponse.json({
    now: new Date().toISOString(),
    goals: business.goals.map((g: { description: string; priority: number; createdAt: Date }) => ({
      description: g.description,
      priority: g.priority,
      createdAt: g.createdAt,
    })),
    people: business.people.map((p: { name: string; relationship: string; createdAt: Date }) => ({
      name: p.name,
      relationship: p.relationship,
      createdAt: p.createdAt,
    })),
    lastTwoBriefs,
    configuredCalendarProvider: calendarProviderId,
    calendarLastSyncedAt: calendarConfig?.lastSyncedAt ?? null,
    calendarLastError: calendarConfig?.lastError ?? null,
    configuredEmailProvider: emailProviderId,
    emailLastSyncedAt: emailConfig?.lastSyncedAt ?? null,
    emailLastError: emailConfig?.lastError ?? null,
    totalSignals: signals.length,
    signalsByDomainAndSource: signals.map((s) => ({
      domain: s.domain,
      type: s.type,
      sourceProviderId: s.sourceProviderId,
      occurredAt: s.occurredAt,
    })),
  });
}
