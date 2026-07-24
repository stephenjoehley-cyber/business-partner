import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { ExecutiveNav } from '@/components/foundation/ExecutiveNav';
import { PartnerManagementPanel } from './PartnerManagementPanel';

export const dynamic = 'force-dynamic';

/**
 * Executive Operating Dashboard, Growth domain — Partner Capability,
 * 23 July 2026. The Founder remains responsible for the relationship;
 * this page is the repeatable administration around it — creating the
 * record, inviting the partner to their own read-only portal, and
 * seeing real subscriber counts as they accumulate.
 */
export default async function PartnersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const partners = await prisma.partner.findMany({
    orderBy: { dateJoined: 'desc' },
    include: {
      revenueShareTerms: { where: { effectiveTo: null } },
      _count: { select: { referrals: true } },
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <ExecutiveNav />
      <h1 className="text-2xl font-semibold text-ink">Partners</h1>
      <p className="mt-2 text-ink-faint">
        Create a partner record, then invite them to their own read-only portal. Referral
        attribution is tracked automatically from the moment someone signs up through their link.
      </p>
      <PartnerManagementPanel initialPartners={partners} />
    </main>
  );
}
