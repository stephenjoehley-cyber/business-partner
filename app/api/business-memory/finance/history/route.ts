import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { listSignalSourcesForBusiness, getExcludedRowsForSource } from '@/lib/signals/sourceRepository';
import { documentTypeLabel, statusLabel, excludedRowReasonText } from '@/lib/finance/copy';
import type { ExcludedRowReason } from '@/lib/signals/extractor';

export const dynamic = 'force-dynamic';

/**
 * Backs the F1 upload flow's history list (approved copy, Section 18).
 * Read-only — no ingestion logic here, matching the same thin-route
 * principle as the upload route itself.
 *
 * Financial Evidence History, 23 July 2026 — each upload now also
 * carries its excluded-row detail, translated the same way the
 * immediate upload-result experience already does, reused rather than
 * duplicated. Durable persistence was the whole point of this piece of
 * work; a history list that still couldn't answer "why wasn't this row
 * included" would defeat it.
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

  const uploads = await Promise.all(
    sources.map(async (s) => {
      const excludedRows = s.excludedRowCount > 0 ? await getExcludedRowsForSource(s.id) : [];
      return {
        id: s.id,
        filename: s.originalFilename,
        subtitle: `${documentTypeLabel(s.documentType as 'aged_debtors' | 'aged_creditors')}${
          s.reportingDate ? `, as at ${s.reportingDate.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''
        }`,
        status: statusLabel(s.status, s.excludedRowCount),
        addedDate: s.createdAt.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }),
        needsConfirmation: s.status === 'pending_confirmation',
        excludedRows: excludedRows.map((r) => ({
          rowNumber: r.rowNumber,
          reason: excludedRowReasonText(r.reason as ExcludedRowReason),
        })),
      };
    })
  );

  return NextResponse.json({ uploads });
}
