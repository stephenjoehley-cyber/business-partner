import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Partner Capability, Step 4 — 23 July 2026. Founder-only (enforced in
 * middleware.ts for every /api/executive/* route); this handler still
 * checks auth itself, matching every other route in this codebase.
 *
 * Unlike Business Configuration and Blog, Partner has no propose/
 * approve/publish workflow — it's a plain relational model created
 * directly by the Founder, since a partner agreement here is a single-
 * founder decision with no second approver to route through yet
 * (the same "don't build governance theatre" reasoning already applied
 * to the Governed Capability Framework's own three-state, not
 * four-state, workflow).
 */

interface CreatePartnerBody {
  partnerName: string;
  organisation: string;
  contactEmail: string;
  referralCode: string;
  revenueSharePercent: number;
}

function isValidCreatePartnerBody(body: unknown): body is CreatePartnerBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.partnerName === 'string' && b.partnerName.trim().length > 0 &&
    typeof b.organisation === 'string' && b.organisation.trim().length > 0 &&
    typeof b.contactEmail === 'string' && b.contactEmail.trim().length > 0 &&
    typeof b.referralCode === 'string' && /^[A-Za-z0-9-]+$/.test(b.referralCode.trim()) &&
    typeof b.revenueSharePercent === 'number' && b.revenueSharePercent >= 0 && b.revenueSharePercent <= 100
  );
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const partners = await prisma.partner.findMany({
    orderBy: { dateJoined: 'desc' },
    include: {
      revenueShareTerms: { where: { effectiveTo: null } },
      _count: { select: { referrals: true } },
    },
  });

  return NextResponse.json({ partners });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  if (!isValidCreatePartnerBody(body)) {
    return NextResponse.json(
      { error: 'A partner needs a name, organisation, contact email, a referral code (letters, numbers, hyphens only), and a revenue share percentage between 0 and 100' },
      { status: 400 }
    );
  }

  const existing = await prisma.partner.findUnique({ where: { referralCode: body.referralCode.trim() } });
  if (existing) {
    return NextResponse.json({ error: 'This referral code is already in use by another partner' }, { status: 409 });
  }

  const partner = await prisma.partner.create({
    data: {
      partnerName: body.partnerName.trim(),
      organisation: body.organisation.trim(),
      contactEmail: body.contactEmail.trim(),
      referralCode: body.referralCode.trim(),
      status: 'active',
      revenueShareTerms: {
        create: { revenueSharePercent: body.revenueSharePercent },
      },
    },
  });

  return NextResponse.json({ partner });
}
