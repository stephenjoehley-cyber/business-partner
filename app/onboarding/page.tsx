import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { OnboardingWizard } from './OnboardingWizard';
import { SignOutButton } from '@/components/foundation/SignOutButton';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { deleted?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // If onboarding was already completed — meaning Business Partner has
  // genuinely generated the inaugural Morning Brief, not merely that a
  // form was submitted — don't re-run it. Using this field rather than
  // `goals.length > 0` matters: People is deliberately optional, so an
  // owner who completes Business Profile and Goals but abandons before
  // reaching People must still be routed back into the wizard, not past it.
  const existingBusiness = await getBusinessByOwner(user.id);
  if (existingBusiness?.onboardingCompletedAt) {
    redirect('/morning-brief');
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-16">
      <div className="mb-6 flex justify-end">
        <SignOutButton />
      </div>

      {/*
        Shown once, immediately after a business deletion (Decision
        Backlog Q11) — not a permanent onboarding fixture. Acknowledges
        what changed rather than silently reusing onboarding's normal
        first-visit copy as if nothing happened (Pre-Ship Walkthrough
        Checklist, point 7 — relationship continuity visible).
      */}
      {searchParams.deleted === 'true' && (
        <p className="mb-6 text-sm text-ink-faint">
          Your previous business has been deleted.
          <br />
          Whenever you&apos;re ready, let&apos;s start again.
        </p>
      )}

      <OnboardingWizard initialBusiness={existingBusiness} />
    </main>
  );
}
