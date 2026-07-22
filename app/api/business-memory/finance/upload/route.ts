import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { ingestDocument } from '@/lib/orchestrator/signalIngestion';
import { UPLOAD_COPY, documentTypeLabel, excludedRowReasonText } from '@/lib/finance/copy';

export const dynamic = 'force-dynamic';

/**
 * Product Audit — F1: Aged Debtors/Creditors, 22 July 2026 (Founder + CPO
 * architectural amendment). This route authenticates and accepts input —
 * nothing more. Extraction, confirmation-gating, and persistence
 * coordination all live in the Signal Ingestion Service
 * (lib/orchestrator/signalIngestion.ts); this file must never grow logic
 * that belongs there.
 *
 * One endpoint, not two: the confirmation step (Section 8/9 of the
 * approved copy) resubmits this same request with `currency` and/or
 * `reportingDate` added — the browser already holds the selected file in
 * memory, so there's no need to store it server-side between the two
 * calls, which would have reopened the "no raw file retention" decision
 * (Audit v2 §6) just to bridge a UI round trip.
 */

const MAX_FILE_BYTES = 5 * 1024 * 1024; // Founder/CPO decision: 5 MB
const ALLOWED_EXTENSIONS = ['.csv'];

const requestSchema = z.object({
  documentType: z.enum(['aged_debtors', 'aged_creditors']),
  currency: z.string().max(10).optional(),
  reportingDate: z.string().optional(),
});

export async function POST(request: Request) {
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

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ message: UPLOAD_COPY.malformedFile }, { status: 400 });
  }

  const parsed = requestSchema.safeParse({
    documentType: formData.get('documentType'),
    currency: formData.get('currency') || undefined,
    reportingDate: formData.get('reportingDate') || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const hasCsvExtension = ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!hasCsvExtension) {
    return NextResponse.json({ message: UPLOAD_COPY.unsupportedFileType }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ message: UPLOAD_COPY.fileTooLarge }, { status: 413 });
  }

  const content = await file.text();
  const { documentType, currency, reportingDate } = parsed.data;

  let result;
  try {
    result = await ingestDocument(
      business.id,
      documentType,
      { filename: file.name, content },
      currency || reportingDate ? { currency, reportingDate: reportingDate ? new Date(reportingDate) : undefined } : undefined
    );
  } catch {
    return NextResponse.json({ message: UPLOAD_COPY.unexpectedFailure }, { status: 500 });
  }

  switch (result.status) {
    case 'rejected': {
      const label = documentTypeLabel(documentType);
      const message =
        result.kind === 'wrong_document_type'
          ? UPLOAD_COPY.wrongDocumentType(label)
          : result.kind === 'empty_file'
            ? UPLOAD_COPY.malformedFile
            : result.kind === 'too_many_rows'
              ? UPLOAD_COPY.tooManyRows
              : UPLOAD_COPY.malformedFile; // ambiguous_reporting_date — file-shaped but internally inconsistent; same calm "can't make sense of this" framing
      return NextResponse.json({ status: 'rejected', message }, { status: 422 });
    }

    case 'duplicate': {
      const date = result.source.createdAt.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
      return NextResponse.json({
        status: 'duplicate',
        message: UPLOAD_COPY.duplicateUpload(result.source.originalFilename, date),
      });
    }

    case 'pending_confirmation':
      return NextResponse.json({
        status: 'pending_confirmation',
        sourceId: result.sourceId,
        needsCurrency: result.needsCurrency,
        needsReportingDate: result.needsReportingDate,
        currencyPrompt: result.needsCurrency ? UPLOAD_COPY.currencyPrompt : undefined,
        reportingDatePrompt: result.needsReportingDate ? UPLOAD_COPY.reportingDatePrompt : undefined,
      });

    case 'completed': {
      const reportingDateLabel = result.source.reportingDate?.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
      return NextResponse.json({
        status: 'completed',
        heading: UPLOAD_COPY.successHeading,
        reinforcement: UPLOAD_COPY.reinforcement,
        reportingDate: reportingDateLabel,
        outcomeMessage: result.qualifiedCount > 0 ? UPLOAD_COPY.needsAttention : UPLOAD_COPY.allClear,
        processedCount: result.source.processedRowCount,
        totalCount: result.source.totalRowCount,
        excludedRows: result.excludedRows.map((r) => ({ rowNumber: r.rowNumber, reason: excludedRowReasonText(r.reason) })),
      });
    }
  }
}
