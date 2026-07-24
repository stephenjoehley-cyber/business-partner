import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { updatePartner, deletePartner, InvalidRevenueShareError, PartnerDeletionBlockedError } from '@/lib/executive/partnerManagement';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();

  try {
    await updatePartner(params.id, body);
  } catch (err) {
    if (err instanceof InvalidRevenueShareError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const partner = await prisma.partner.findUnique({
    where: { id: params.id },
    include: { revenueShareTerms: { where: { effectiveTo: null } }, _count: { select: { referrals: true } } },
  });

  return NextResponse.json({ partner });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    await deletePartner(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof PartnerDeletionBlockedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
