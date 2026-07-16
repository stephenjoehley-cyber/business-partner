import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addPeople, getBusinessByOwner } from '@/lib/brain/repository';
import { peopleSchema } from '@/lib/brain/validation';

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


  return NextResponse.json({ success: true });
}
