import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeOnboarding, getBusinessByOwner } from '@/lib/brain/repository';
import { runDailyCycleForBusiness } from '@/lib/orchestrator/dailyCycle';

/**
 * Forces this route to always run per-request rather than being
 * considered for static optimization at build time. Every route in
 * this app depends on request-specific state (session, cookies, query
 * params, or POST bodies), so none of them are ever safe to
 * statically prerender — added after a real production build failure
 * (2026-07-17): Next.js attempted to export the Google Calendar
 * callback route at build time, where GOOGLE_TOKEN_ENCRYPTION_KEY and
 * a real request context don't exist, and the build failed outright.
 * See DECISIONS.md.
 */
export const dynamic = 'force-dynamic';

/**
 * The final onboarding step — Phase B Item 7.
 *
 * Deliberately separate from `/api/onboarding/people`: onboarding is
 * complete when Business Partner has genuinely generated the inaugural
 * Morning Brief, not when the owner has submitted a form (Founder
 * decision). Keeping this as its own call means a brief-generation
 * failure can be retried on its own — the owner never risks resubmitting
 * (and duplicating) People to retry this step.
 *
 * Idempotent: `runDailyCycleForBusiness` already no-ops if a brief exists
 * for today, and this only ever advances `onboardingCompletedAt` forward,
 * never backward — safe to call again after a prior failure, or by
 * accident.
 */
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

  const outcome = await runDailyCycleForBusiness(business.id);

  if (!outcome.ran && outcome.error) {
    // A real failure generating the inaugural brief — do not mark
    // onboarding complete. The owner stays in the wizard and can retry
    // this step directly; nothing about People or Goals is re-submitted.
    return NextResponse.json(
      { error: "We're still getting things ready. Please try again in a moment." },
      { status: 503 },
    );
  }

  // outcome.ran === true (brief generated now) or false-with-no-error
  // (a brief already exists for today, e.g. a retried call) both mean
  // Business Partner is genuinely ready.
  await completeOnboarding(business.id);

  return NextResponse.json({ success: true });
}
