import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Partner Portal — Partner Capability, 23 July 2026 (Step 6). Read-
 * only, by design: nothing editable, no messaging, no campaign tools.
 * Not CRM, not partner management software, not a second product — a
 * single-responsibility surface showing a partner what Business
 * Partner already knows about their own referrals.
 *
 * The access check itself lives here, not in middleware.ts (see Step
 * 5's commit for why — Prisma's direct Postgres connection isn't
 * reliably supported in Next.js Edge middleware). Anyone authenticated
 * but not a genuine partner is redirected away, the same "logged in,
 * but not authorized for this surface" pattern already used for
 * /executive's non-founder redirect.
 *
 * Product Truth throughout: subscriber count and the revenue share
 * percentage are real today. Revenue share amount and statements
 * cannot be, since they depend on real payment data that doesn't exist
 * until Phase 2 (PayFast) — shown as an honest, plainly-worded absence,
 * never a fabricated zero or placeholder figure.
 */
export default async function PartnerPortalPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const partner = await prisma.partner.findUnique({
    where: { authUserId: user.id },
    include: {
      revenueShareTerms: { where: { effectiveTo: null } },
      _count: { select: { referrals: true } },
    },
  });

  if (!partner) redirect('/morning-brief');

  const currentTerm = partner.revenueShareTerms[0];
  const referralLink = `https://business-partner.co.za/signup?ref=${partner.referralCode}`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-ink">Partnership with Business Partner</h1>
      <p className="mt-2 text-ink-faint">{partner.organisation}</p>

      <div className="mt-8 flex flex-col gap-6">
        <div className="rounded-lg border border-surface-border p-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Your referral link</p>
          <p className="mt-2 break-all text-sm text-ink">{referralLink}</p>
        </div>

        <div className="rounded-lg border border-surface-border p-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Subscribers referred</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{partner._count.referrals}</p>
        </div>

        <div className="rounded-lg border border-surface-border p-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Revenue share</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{currentTerm?.revenueSharePercent ?? 0}%</p>
          <p className="mt-3 text-sm text-ink-faint">
            Once your first referred subscriber&rsquo;s payment is processed, your revenue share amount
            and monthly statements will appear here.
          </p>
        </div>

        <div className="rounded-lg border border-surface-border p-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Payment history</p>
          <p className="mt-2 text-sm text-ink-faint">Not yet available.</p>
        </div>
      </div>
    </main>
  );
}
