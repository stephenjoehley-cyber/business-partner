import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { generateSignalsForBusiness } from '@/lib/signals/pipeline';

/**
 * Manual trigger for Increment 2. The Executive Orchestrator (Increment 5)
 * will call generateSignalsForBusiness on a schedule instead — this route
 * exists so the Signal Provider seam is demonstrable and testable before
 * that scheduling layer is built.
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

  const signals = await generateSignalsForBusiness(business.id);

  return NextResponse.json({ signals });
}
