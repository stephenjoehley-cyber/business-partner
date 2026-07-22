import type { ExcludedRowReason } from '@/lib/signals/extractor';

/**
 * F1 Upload Flow — Complete Copy Draft, approved by Founder + CPO, 22 July
 * 2026 (with the four refinements from the follow-up approval). This is
 * the one place internal reason codes and document-type values are
 * translated into the approved owner-facing strings — kept out of the
 * extractor and ingestion service, which stay presentation-free, per the
 * existing separation everywhere else in this codebase (e.g.
 * describe.ts owns plain-language translation for Signals; this is the
 * same role for the upload flow).
 */

export function documentTypeLabel(documentType: 'aged_debtors' | 'aged_creditors'): string {
  return documentType === 'aged_debtors' ? 'money owed to you' : 'money you owe';
}

export function excludedRowReasonText(reason: ExcludedRowReason): string {
  switch (reason) {
    case 'missing_required_field':
      return "I couldn't find a name or reference for this row";
    case 'unparseable_amount':
      return "the amount didn't make sense to me";
    case 'unparseable_due_date':
      return "I couldn't read the due date";
    case 'missing_currency':
      return "I couldn't tell what currency this was in";
    case 'conflicting_duplicate':
      return 'this looked like the same entry as another row, but the two didn\u2019t agree with each other';
  }
}

/**
 * Multi-format CSV Understanding, 22 July 2026 — approved copy for column
 * confirmation. The word "mapping" never reaches the owner anywhere
 * here, per the Founder/CPO's explicit editorial decision: it describes
 * an implementation, not an executive concept.
 */
const CANONICAL_FIELD_LABELS: Record<string, string> = {
  'as at date': 'the date this file is current as at',
  'customer name': 'your customer\u2019s name',
  'supplier name': 'your supplier\u2019s name',
  'invoice reference': 'the invoice reference',
  'invoice date': 'the invoice date',
  'due date': 'the due date',
  amount: 'the amount',
  currency: 'the currency',
};

export function canonicalFieldLabel(canonicalField: string): string {
  return CANONICAL_FIELD_LABELS[canonicalField] ?? canonicalField;
}

export const MAPPING_COPY = {
  multipleQuestionsHeading: 'A couple of things before I continue.',
  singleQuestionHeading: 'One thing before I continue.',
  confirmQuestion: (fieldLabel: string) => `I think this column is ${fieldLabel} — is that right?`,
  confirmExplanation: 'Once you confirm, I\u2019ll remember this for every file like it in future.',
  confirmYes: 'Yes, that\u2019s right',
  confirmNo: 'No, let me choose',
  selectQuestion: (fieldLabel: string) => `Which column is ${fieldLabel}?`,
  rememberedNotice: 'I\u2019ll remember this for your next upload from the same file — you won\u2019t need to confirm it again.',
  continueButton: 'Continue',
} as const;

export const UPLOAD_COPY = {
  pageTitle: 'Financial Understanding',
  pageIntro:
    "Bring me what's owed to you and what you owe, and I'll use it to better understand your business, bringing anything that genuinely needs you into a Morning Brief.",
  emptyState:
    "Nothing uploaded yet.\nOnce you add a debtors or creditors file, I'll tell you here what I found — and if anything in it genuinely needs your attention, you'll see it in tomorrow's brief.",
  documentTypePrompt: 'What kind of file is this?',
  documentTypeOptions: {
    aged_debtors: { label: 'Money owed to you', sublabel: 'Sometimes called an Aged Debtors report — a list of customers who still owe you.' },
    aged_creditors: { label: 'Money you owe', sublabel: 'Sometimes called an Aged Creditors report — a list of suppliers you still owe.' },
  },
  fileHint: 'Files up to 5 MB, with up to 10,000 rows.',
  uploading: 'Reading your file\u2026',
  successHeading: 'This is now part of how I understand your business.',
  reinforcement: 'This gives me a better picture of your business.',
  needsAttention: "A few of these are worth your attention — you'll see them in your next Morning Brief.",
  allClear: "Nothing here needs you right now. I'll keep watching.",
  currencyPrompt: "This file doesn't say which currency these amounts are in. What currency should I use?",
  reportingDatePrompt: "This file doesn't say what date it's current as at. What date should I use?",
  reportingDateHint: "This is the date your figures were true as of — not today's date, and not when you're uploading this.",
  wrongDocumentType: (label: string) =>
    `This doesn't look like ${label}. I couldn't find what I'd expect in a file like this — check you've picked the right one, or ask your bookkeeper to confirm the format.`,
  malformedFile: "I couldn't make sense of this file. It doesn't look like a spreadsheet I can read. Try opening it and saving it again as a .csv file, then upload it here.",
  reconciliationFailure:
    "The numbers in this file don't add up the way I expected. I've held off on using it rather than risk getting it wrong. Check the file with your bookkeeper and upload it again.",
  duplicateUpload: (filename: string, date: string) =>
    `I've already got this one. This is the same file as ${filename}, uploaded ${date}. Nothing's changed, so there's nothing new for me to go through.`,
  fileTooLarge: 'This file is a bit too large for me to take in — up to 5 MB works. If it\u2019s larger than that, ask your bookkeeper to split it, or export a smaller date range.',
  tooManyRows: 'This file has more rows than I can take in right now — up to 10,000 works. Ask your bookkeeper to export a smaller date range, or split the file, and try again.',
  unsupportedFileType: 'I can only read spreadsheet files (.csv) for now. If your file is in a different format, most accounting software or Excel can save it as a .csv.',
  unexpectedFailure: "Something went wrong on my side, not yours. Try uploading again in a moment. If it keeps happening, let us know and we'll look into it.",
} as const;

export function statusLabel(status: string, excludedRowCount = 0): string {
  switch (status) {
    case 'completed':
      return excludedRowCount > 0 ? 'Mostly understood' : 'Understood';
    case 'processing':
      return 'Understood'; // transitional; owner never sees 'processing' at rest
    case 'pending_confirmation':
      return 'Needs one thing from you';
    case 'rejected':
      return "Couldn't use this one";
    default:
      return status;
  }
}
