import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const business = await getBusinessByOwner(user.id);

  redirect(business ? '/morning-brief' : '/onboarding');
}
