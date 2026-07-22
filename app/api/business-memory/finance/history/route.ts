import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { listSignalSourcesForBusiness } from '@/lib/signals/sourceRepository';
import { documentTypeLabel, statusLabel } from '@/lib/finance/copy';

export const dynamic = 'force-dynamic';

/**
 * Backs the F1 upload flow's history list (approved copy, Section 18).
 * Read-only — no ingestion logic here, matching the same thin-route
 * principle as the upload route itself.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const business = await getBusinessByOwner(user.id);
  if (!business) {
    return NextResponse.json({ error: 'Complete your business profile first' }, { status: 409 });
  }

  const sources = await listSignalSourcesForBusiness(business.id);

  return NextResponse.json({
    uploads: sources.map((s) => ({
      id: s.id,
      filename: s.originalFilename,
      subtitle: `${documentTypeLabel(s.documentType as 'aged_debtors' | 'aged_creditors')}${
        s.reportingDate ? `, as at ${s.reportingDate.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''
      }`,
      status: statusLabel(s.status, s.excludedRowCount),
      addedDate: s.createdAt.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }),
      needsConfirmation: s.status === 'pending_confirmation',
    })),
  });
}
