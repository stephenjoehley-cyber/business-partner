import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';

/**
 * TEMPORARY diagnostic route — added 19 July 2026 solely to identify and
 * remove one specific lingering Signal (a Travelpayouts bulk-mail email
 * ingested before the List-Id fix existed, which can't be retroactively
 * suppressed the way the noreply@ case was — see DECISIONS.md). Read-only,
 * scoped to the calling owner's own business. Delete this route once the
 * cleanup is confirmed — not meant to be a permanent feature or a general
 * "delete any signal" capability.
 *
 * The id below is hardcoded deliberately, not passed as a parameter —
 * confirmed directly against the Founder's own diagnostic output before
 * being added here, so there is zero risk of deleting the wrong row via a
 * mistyped id.
 */
export const dynamic = 'force-dynamic';

const CONFIRMED_SIGNAL_ID_TO_REMOVE = 'cmrrjugmo000u68s5co5yg1qo'; // Travelpayouts — "Three ideas worth stealing from TBEX 2026"

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

  const signals = await getSignalsForBusiness(business.id);

  return NextResponse.json({
    emailSignals: signals
      .filter((s) => s.domain === 'email')
      .map((s) => ({
        id: s.id,
        type: s.type,
        occurredAt: s.occurredAt,
        subject: (s.payload as { subject?: string }).subject,
        fromName: (s.payload as { fromName?: string }).fromName,
      })),
  });
}

export async function POST() {
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

  if (isDemoMode()) {
    return NextResponse.json({ error: 'Not applicable in Demo Mode' }, { status: 400 });
  }

  // Scoped by businessId as well as id, same guard as every other
  // deletion tonight — this can only ever remove a signal genuinely
  // belonging to the calling owner's own business.
  const result = await prisma.signal.deleteMany({
    where: { id: CONFIRMED_SIGNAL_ID_TO_REMOVE, businessId: business.id },
  });

  return NextResponse.json({ deleted: result.count });
}
