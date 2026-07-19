import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner, deleteGoal, updateGoal } from '@/lib/brain/repository';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateGoalSchema = z.object({
  description: z.string().min(1).max(300),
});

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

/**
 * Continuous Executive Learning — editing (19 July 2026). Only
 * description is editable — priority is a separate concern.
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
  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const goal = await updateGoal(business.id, params.id, parsed.data.description);
  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, goal });
}
