import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { approveCapability, InvalidCapabilityTransitionError } from '@/lib/executive/governedCapability';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const approved = await approveCapability(params.id, user.id);
    return NextResponse.json({ approved });
  } catch (err) {
    if (err instanceof InvalidCapabilityTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
