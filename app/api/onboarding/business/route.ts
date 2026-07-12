import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBusinessProfile, getBusinessByOwner, updateBusinessProfile } from '@/lib/brain/repository';
import { businessProfileSchema } from '@/lib/brain/validation';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = businessProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await getBusinessByOwner(user.id);

  const business = existing
    ? await updateBusinessProfile(existing.id, parsed.data)
    : await createBusinessProfile(user.id, parsed.data);

  return NextResponse.json({ business });
}
