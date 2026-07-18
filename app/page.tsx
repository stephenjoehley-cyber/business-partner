import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { Homepage } from '@/components/public/Homepage';

export const metadata: Metadata = {
  title: 'Business Partner — Start every day knowing what matters most',
  description:
    'Business Partner helps business owners see what needs attention, understand why it matters and decide what to do next.',
  openGraph: {
    title: 'Business Partner — Start every day knowing what matters most',
    description:
      'Business Partner helps business owners see what needs attention, understand why it matters and decide what to do next.',
    type: 'website',
  },
};

/**
 * D1.2 — previously this route did nothing but redirect (§27 audit
 * finding: there was no public homepage here at all, for anyone,
 * authenticated or not). Now: signed-out visitors see the real public
 * homepage; signed-in owners are redirected onward exactly as before —
 * existing auth redirect logic is unchanged, just reached conditionally
 * rather than unconditionally.
 */
export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const business = await getBusinessByOwner(user.id);
    redirect(business ? '/morning-brief' : '/onboarding');
  }

  return <Homepage />;
}
