import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { generateSignalsForBusiness } from '@/lib/signals/pipeline';
import { generateMorningBrief } from '@/lib/cognition/pipeline';

/**
 * Manual trigger for Increment 3/4, still in place pending the Executive
 * Orchestrator's scheduled pipeline. As of Increment 6, this route also
 * refreshes signals before reasoning over them (folding in the former
 * `/api/signals/generate` trigger) — "signals" were never a concept the
 * owner should need to think about separately from "a recommendation";
 * this route now does, in one call, what the Orchestrator will eventually
 * do on a schedule: observe, then reason. See DECISIONS.md, Increment 6.
 *
 * Always returns a morningBrief (never null) — Executive Honesty means
 * there is always something to report, even if it's an all_clear tier.
 */
export async function POST() {
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

  await generateSignalsForBusiness(business.id);
  const morningBrief = await generateMorningBrief(business.id);

  return NextResponse.json({ morningBrief });
}
