import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { generateMorningBrief } from '@/lib/cognition/pipeline';

/**
 * Manual trigger for Increment 3/4. The Executive Orchestrator (Increment
 * 5) will call generateMorningBrief on a schedule instead — this route
 * exists so the Cognitive Engine is demonstrable and testable before that
 * scheduling layer is built (same reasoning as /api/signals/generate).
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

  const morningBrief = await generateMorningBrief(business.id);

  return NextResponse.json({ morningBrief });
}
