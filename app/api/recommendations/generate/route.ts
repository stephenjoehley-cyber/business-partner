import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { generateRecommendation } from '@/lib/cognition/pipeline';

/**
 * Manual trigger for Increment 3. The Executive Orchestrator (Increment 5)
 * will call generateRecommendation on a schedule instead — this route
 * exists so the Cognitive Engine is demonstrable and testable before that
 * scheduling layer is built (same reasoning as /api/signals/generate).
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

  const recommendation = await generateRecommendation(business.id);

  if (!recommendation) {
    return NextResponse.json(
      { recommendation: null, message: 'No signals to reason over yet — refresh signals first.' },
      { status: 200 }
    );
  }

  return NextResponse.json({ recommendation });
}
