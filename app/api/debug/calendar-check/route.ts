import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';

/**
 * TEMPORARY diagnostic route — added 20 July 2026 to verify whether two
 * "Business Partner Moring Brief Update" entries (one "today," one
 * "tomorrow") are genuinely different calendar events or the same signal
 * described inconsistently. Read-only, scoped to the calling owner's own
 * business. Delete once resolved.
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

  return NextResponse.json({
    now: new Date().toISOString(),
    calendarSignals: signals
      .filter((s) => s.domain === 'calendar')
      .map((s) => ({
        id: s.id,
        externalRef: s.externalRef,
        occurredAt: s.occurredAt,
        title: (s.payload as { title?: string }).title,
      })),
  });
}
