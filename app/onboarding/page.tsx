import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { OnboardingWizard } from './OnboardingWizard';
import { SignOutButton } from '@/app/morning-brief/SignOutButton';

export default async function OnboardingPage() {
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
      <OnboardingWizard initialBusiness={existingBusiness} />
    </main>
  );
}
