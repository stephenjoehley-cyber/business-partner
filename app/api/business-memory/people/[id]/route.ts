import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner, deletePerson, updatePerson } from '@/lib/brain/repository';
import { personSchema } from '@/lib/brain/validation';

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

/**
 * Continuous Executive Learning — editing (19 July 2026). Reuses the
 * exact same personSchema as the add route — the editable shape is
 * identical.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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
  const parsed = personSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const person = await updatePerson(business.id, params.id, parsed.data);
  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, person });
}
