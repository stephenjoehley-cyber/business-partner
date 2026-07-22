'use client';

import { useEffect, useState } from 'react';
import { inputClasses } from '@/components/FormField';

/**
 * Product Audit — F1: Aged Debtors/Creditors, 22 July 2026 (Founder + CPO,
 * copy approved with four refinements). This is the owner-facing surface
 * for the upload flow — every string here is drawn from the approved
 * copy, not invented at implementation time. No business logic lives
 * here: this component only calls the two thin routes
 * (/api/business-memory/finance/upload, /history) and renders their
 * responses.
 */

type DocumentType = 'aged_debtors' | 'aged_creditors';

type Step =
  | { kind: 'select_type' }
  | { kind: 'select_file'; documentType: DocumentType }
  | { kind: 'uploading' }
  | { kind: 'needs_confirmation'; documentType: DocumentType; file: File; currencyPrompt?: string; reportingDatePrompt?: string }
  | { kind: 'result'; result: UploadResult };

interface UploadResult {
  status: 'completed' | 'rejected' | 'duplicate';
  message?: string;
  heading?: string;
  reinforcement?: string;
  reportingDate?: string;
  outcomeMessage?: string;
  processedCount?: number;
  totalCount?: number;
  excludedRows?: { rowNumber: number; reason: string }[];
}

interface HistoryItem {
  id: string;
  filename: string;
  subtitle: string;
  status: string;
  addedDate: string;
  needsConfirmation: boolean;
}

async function submitUpload(documentType: DocumentType, file: File, confirmation?: { currency?: string; reportingDate?: string }) {
  const formData = new FormData();
  formData.set('documentType', documentType);
  formData.set('file', file);
  if (confirmation?.currency) formData.set('currency', confirmation.currency);
  if (confirmation?.reportingDate) formData.set('reportingDate', confirmation.reportingDate);

  const res = await fetch('/api/business-memory/finance/upload', { method: 'POST', body: formData });
  return res.json();
}

export function FinanceUploadSection() {
  const [step, setStep] = useState<Step>({ kind: 'select_type' });
  const [history, setHistory] = useState<HistoryItem[]>([]);

  async function loadHistory() {
    const res = await fetch('/api/business-memory/finance/history');
    if (res.ok) {
      const data = await res.json();
      setHistory(data.uploads);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleFileChosen(documentType: DocumentType, file: File) {
    setStep({ kind: 'uploading' });
    const data = await submitUpload(documentType, file);

    if (data.status === 'pending_confirmation') {
      setStep({
        kind: 'needs_confirmation',
        documentType,
        file,
        currencyPrompt: data.currencyPrompt,
        reportingDatePrompt: data.reportingDatePrompt,
      });
      return;
    }

    setStep({ kind: 'result', result: data });
    loadHistory();
  }

  async function handleConfirmation(documentType: DocumentType, file: File, currency?: string, reportingDate?: string) {
    setStep({ kind: 'uploading' });
    const data = await submitUpload(documentType, file, { currency, reportingDate });
    setStep({ kind: 'result', result: data });
    loadHistory();
  }

  return (
    <div className="flex flex-col gap-4">
      {step.kind === 'select_type' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-faint">
            Bring me what&rsquo;s owed to you and what you owe, and I&rsquo;ll use it to better understand your
            business, bringing anything that genuinely needs you into a Morning Brief.
          </p>
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">What kind of file is this?</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setStep({ kind: 'select_file', documentType: 'aged_debtors' })}
              className="focus-ring rounded-lg border border-surface-border p-4 text-left hover:bg-surface"
            >
              <span className="block font-medium text-ink">Money owed to you</span>
              <span className="mt-1 block text-sm text-ink-faint">
                Sometimes called an Aged Debtors report — a list of customers who still owe you.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStep({ kind: 'select_file', documentType: 'aged_creditors' })}
              className="focus-ring rounded-lg border border-surface-border p-4 text-left hover:bg-surface"
            >
              <span className="block font-medium text-ink">Money you owe</span>
              <span className="mt-1 block text-sm text-ink-faint">
                Sometimes called an Aged Creditors report — a list of suppliers you still owe.
              </span>
            </button>
          </div>
        </div>
      )}

      {step.kind === 'select_file' && (
        <div className="flex flex-col gap-3">
          <p className="text-ink">
            Add your {step.documentType === 'aged_debtors' ? 'money owed to you' : 'money you owe'} file
          </p>
          <p className="text-sm text-ink-faint">A spreadsheet file (.csv) works best. Most accounting software can export one directly.</p>
          <input
            type="file"
            accept=".csv"
            className={inputClasses}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileChosen(step.documentType, file);
            }}
          />
          <p className="text-xs text-ink-faint">Files up to 5 MB, with up to 10,000 rows.</p>
          <button
            type="button"
            onClick={() => setStep({ kind: 'select_type' })}
            className="focus-ring w-fit text-xs text-ink-faint underline"
          >
            Choose a different file type
          </button>
        </div>
      )}

      {step.kind === 'uploading' && <p className="text-ink-faint">Reading your file&hellip;</p>}

      {step.kind === 'needs_confirmation' && (
        <ConfirmationForm
          currencyPrompt={step.currencyPrompt}
          reportingDatePrompt={step.reportingDatePrompt}
          onSubmit={(currency, reportingDate) =>
            handleConfirmation(step.documentType, step.file, currency, reportingDate)
          }
        />
      )}

      {step.kind === 'result' && (
        <ResultView
          result={step.result}
          onDone={() => setStep({ kind: 'select_type' })}
        />
      )}

      <div className="mt-4 border-t border-surface-border pt-4">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">What I&rsquo;ve added</p>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">
            Nothing uploaded yet. Once you add a debtors or creditors file, I&rsquo;ll tell you here what I found —
            and if anything in it genuinely needs your attention, you&rsquo;ll see it in tomorrow&rsquo;s brief.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {history.map((item) => (
              <li key={item.id} className="rounded-md border border-surface-border p-3">
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-ink">{item.filename}</span>
                  <span className="text-xs text-ink-faint">{item.subtitle}</span>
                  <span className="mt-1 text-xs text-ink-faint">
                    {item.status} · Added {item.addedDate}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ConfirmationForm({
  currencyPrompt,
  reportingDatePrompt,
  onSubmit,
}: {
  currencyPrompt?: string;
  reportingDatePrompt?: string;
  onSubmit: (currency?: string, reportingDate?: string) => void;
}) {
  const [currency, setCurrency] = useState('');
  const [reportingDate, setReportingDate] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(currencyPrompt ? currency : undefined, reportingDatePrompt ? reportingDate : undefined);
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-ink">{currencyPrompt && reportingDatePrompt ? 'A couple of things before I continue.' : currencyPrompt ? 'One thing before I continue.' : 'One more thing.'}</p>

      {currencyPrompt && (
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ink-faint" htmlFor="currency-input">
            {currencyPrompt}
          </label>
          <input
            id="currency-input"
            className={inputClasses}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="e.g. ZAR"
            required
          />
        </div>
      )}

      {reportingDatePrompt && (
        <div className="flex flex-col gap-1">
          <label className="text-sm text-ink-faint" htmlFor="reporting-date-input">
            {reportingDatePrompt}
          </label>
          <input
            id="reporting-date-input"
            type="date"
            className={inputClasses}
            value={reportingDate}
            onChange={(e) => setReportingDate(e.target.value)}
            required
          />
          <p className="text-xs text-ink-faint">
            This is the date your figures were true as of — not today&rsquo;s date, and not when you&rsquo;re
            uploading this.
          </p>
        </div>
      )}

      <button
        type="submit"
        className="focus-ring inline-block w-fit rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface"
      >
        Continue
      </button>
    </form>
  );
}

function ResultView({ result, onDone }: { result: UploadResult; onDone: () => void }) {
  const [showDetail, setShowDetail] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  async function handleTakeMeThere() {
    // Found while verifying the complete demonstrable loop, 22 July 2026:
    // the Morning Brief page only ever reads the last *persisted* brief —
    // it never regenerates one on its own (app/morning-brief/page.tsx
    // calls getLatestMorningBrief, never generateMorningBrief). A plain
    // link here could land on a stale, pre-upload Brief if one had
    // already run today. Refreshing first, then hard-navigating, is the
    // same pattern already established (and already fixed once for a
    // stale-client-router bug) in HelpUnderstandSection's own refresh —
    // reused deliberately, not reinvented.
    setIsNavigating(true);
    await fetch('/api/recommendations/generate', { method: 'POST' });
    window.location.href = '/morning-brief';
  }

  if (result.status === 'rejected') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-ink">{result.message}</p>
        <button type="button" onClick={onDone} className="focus-ring inline-block w-fit rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface">
          Try again
        </button>
      </div>
    );
  }

  if (result.status === 'duplicate') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-ink">{result.message}</p>
        <button type="button" onClick={onDone} className="focus-ring inline-block w-fit rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface">
          Done
        </button>
      </div>
    );
  }

  // completed
  const hasExclusions = (result.excludedRows?.length ?? 0) > 0;
  return (
    <div className="flex flex-col gap-3">
      <p className="font-medium text-ink">{result.heading}</p>
      <p className="text-ink-faint">{result.reinforcement}</p>
      <p className="text-sm text-ink-faint">{result.outcomeMessage}</p>

      {hasExclusions && (
        <button type="button" onClick={() => setShowDetail(!showDetail)} className="focus-ring w-fit text-xs text-ink-faint underline">
          See what I couldn&rsquo;t use
        </button>
      )}

      {showDetail && (
        <ul className="flex flex-col gap-1 text-xs text-ink-faint">
          {result.excludedRows?.map((row) => (
            <li key={row.rowNumber}>
              Row {row.rowNumber}: {row.reason}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={handleTakeMeThere}
          disabled={isNavigating}
          className="focus-ring inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
        >
          {isNavigating ? 'Preparing your brief…' : 'Take me there'}
        </button>
        <button type="button" onClick={onDone} className="focus-ring text-sm text-ink-faint underline">
          Back to Business Memory
        </button>
      </div>
    </div>
  );
}
