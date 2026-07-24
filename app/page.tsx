import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';
import { Homepage } from '@/components/public/Homepage';

export const metadata: Metadata = {
  title: 'Business Partner: You\u2019re not disorganised. You\u2019re just carrying too much.',
  description:
    'Business Partner shows you what\u2019s already been considered and brings forward only what genuinely needs you today.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Business Partner: You\u2019re not disorganised. You\u2019re just carrying too much.',
    description:
      'Business Partner shows you what\u2019s already been considered and brings forward only what genuinely needs you today.',
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Business Partner: You\u2019re not disorganised. You\u2019re just carrying too much.',
    description:
      'Business Partner shows you what\u2019s already been considered and brings forward only what genuinely needs you today.',
  },
};

/**
 * Search Presence, 23 July 2026 (Founder + CPO) — Organization and
 * WebSite structured data, matched exactly to what the page and About
 * page actually say (Product Truth applies to structured data as much
 * as visible copy — a search engine or AI system reading this should
 * never be told something different from what a visitor reads).
 */
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Business Partner',
      url: 'https://business-partner.co.za',
      description:
        'Business Partner shows business owners what has already been considered and brings forward only what genuinely needs their attention today.',
    },
    {
      '@type': 'WebSite',
      name: 'Business Partner',
      url: 'https://business-partner.co.za',
    },
  ],
};

/**
 * D1.2 — previously this route did nothing but redirect (§27 audit
 * finding: there was no public homepage here at all, for anyone,
 * authenticated or not). Now: signed-out visitors see the real public
 * homepage; signed-in owners are redirected onward exactly as before —
 * existing auth redirect logic is unchanged, just reached conditionally
 * rather than unconditionally.
 *
 * Partner Capability, 23 July 2026 (Step 5) — identity resolution now
 * has three destinations, not two. Partner is checked first: it's a
 * narrow, single-purpose identity with no other destination to fall
 * back to, unlike a Customer/onboarding user. Founder-level access
 * (FOUNDER_USER_IDS, /executive) is a separate, additive authorization
 * checked in middleware.ts, not a competing redirect destination here —
 * a founder dogfooding their own account as a customer still lands on
 * their own Morning Brief, exactly as before.
 */
export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (!isDemoMode()) {
      const partner = await prisma.partner.findUnique({ where: { authUserId: user.id } });
      if (partner) {
        redirect('/partner');
      }
    }
    const business = await getBusinessByOwner(user.id);
    redirect(business ? '/morning-brief' : '/onboarding');
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Homepage />
    </>
  );
}
