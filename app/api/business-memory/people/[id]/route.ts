import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner, deletePerson } from '@/lib/brain/repository';

export const dynamic = 'force-dynamic';

/**
 * Continuous Executive Learning — deletion (19 July 2026). Same
 * reasoning as the Goal delete route — see that file's doc comment.
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

  await deletePerson(business.id, params.id);

  return NextResponse.json({ success: true });
}
