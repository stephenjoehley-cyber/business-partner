import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';

/**
 * TEMPORARY diagnostic route — added 19 July 2026 solely to confirm a
 * Goal edit was genuinely persisted to the database, not just reflected
 * in client-side state. Read-only, scoped to the calling owner's own
 * business. Delete once confirmed — not meant to be a permanent
 * feature.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
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

  return NextResponse.json({
    goals: business.goals.map((g: { id: string; description: string; priority: number }) => ({
      id: g.id,
      description: g.description,
      priority: g.priority,
    })),
  });
}
