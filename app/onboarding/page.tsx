import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { OnboardingWizard } from './OnboardingWizard';

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // If onboarding was already completed, don't re-run it.
  const existingBusiness = await getBusinessByOwner(user.id);
  if (existingBusiness && existingBusiness.goals.length > 0) {
    redirect('/morning-brief');
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-16">
      <OnboardingWizard initialBusiness={existingBusiness} />
    </main>
  );
}
