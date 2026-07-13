import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addPeople, getBusinessByOwner } from '@/lib/brain/repository';
import { peopleSchema } from '@/lib/brain/validation';
import { runDailyCycleForBusiness } from '@/lib/orchestrator/dailyCycle';

export async function POST(request: Request) {
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

  const body = await request.json();
  const parsed = peopleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await addPeople(business.id, parsed.data);

  // Onboarding is the first caller of the same daily executive cycle the
  // Executive Orchestrator (Increment 7) runs on a schedule from this
  // point on — not a separate "first brief" code path. Generating it
  // synchronously here means the owner never finishes onboarding only to
  // be told to wait until tomorrow before Business Partner has anything
  // to show them (Founder decision, Increment 7 Implementation Plan §5).
  await runDailyCycleForBusiness(business.id);

  return NextResponse.json({ success: true });
}
