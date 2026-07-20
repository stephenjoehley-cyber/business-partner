import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { observe } from '@/lib/cognition/observe';
import { understand } from '@/lib/cognition/understand';
import { prioritise } from '@/lib/cognition/prioritise';

/**
 * TEMPORARY diagnostic route — added 19 July 2026 to verify, with real
 * computed data, whether the "stale email" concern is a genuine Cognitive
 * Engine defect (wrong scoring) or a UI/Executive Presence issue
 * (confidence label placement). Read-only, scoped to the calling owner's
 * own business. Delete once resolved.
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

  const allSignals = await getSignalsForBusiness(business.id);
  const observations = observe(allSignals);
  const understood = understand(observations, { business, goals: business.goals, people: business.people });
  const prioritised = prioritise(understood);

  return NextResponse.json({
    now: new Date().toISOString(),
    rankedSignals: prioritised.map((p) => ({
      summary: p.insight.summary,
      occurredAt: p.insight.signal.occurredAt,
      isKnownRelationship: p.insight.isKnownRelationship,
      relatedGoalDescriptions: p.insight.relatedGoalDescriptions,
      dimensions: p.dimensions,
      priorityScore: p.priorityScore,
    })),
  });
}
