import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner, addPerson } from '@/lib/brain/repository';
import { personSchema } from '@/lib/brain/validation';

/**
 * Forces this route to always run per-request rather than being
 * considered for static optimization at build time — see DECISIONS.md,
 * 17 July 2026.
 */
export const dynamic = 'force-dynamic';

/**
 * Continuous Executive Learning (v1) — Product Audit, 17/18 July 2026.
 * Adds one Person after onboarding. Reuses the existing `addPeople`
 * repository function directly — already genuinely additive
 * (`prisma.person.createMany`), built correctly for this from the start,
 * unlike Goals. Marking someone as a known relationship already
 * materially changes `businessImpact` and `confidence` in the email
 * interpreter — no new reasoning capability required.
 */
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
  const parsed = personSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const person = await addPerson(business.id, parsed.data);

  return NextResponse.json({ success: true, person });
}
