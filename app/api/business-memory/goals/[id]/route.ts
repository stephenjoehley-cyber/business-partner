import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner, deleteGoal } from '@/lib/brain/repository';

export const dynamic = 'force-dynamic';

/**
 * Continuous Executive Learning — deletion (19 July 2026). The smallest
 * complete fix for a real gap found live: adding was possible but
 * correcting a mistake (a duplicate entry) was not. Delete only, not
 * edit — the actual problem observed was "remove one wrong entry," not
 * "change a goal's wording." Idempotent and scoped: deleteGoal only ever
 * touches a goal that genuinely belongs to the calling owner's own
 * business.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

  await deleteGoal(business.id, params.id);

  return NextResponse.json({ success: true });
}
