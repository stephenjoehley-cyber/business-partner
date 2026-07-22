/**
 * Signal domain model — Business Partner MVP Blueprint v1.0, Section 5.
 *
 * A Signal is the atomic unit the Cognitive Engine reasons over, regardless
 * of whether it came from a seeded provider or a live integration. Nothing
 * downstream of the Signal Provider Registry is allowed to know or care
 * which kind of provider produced it.
 */

export const SIGNAL_DOMAINS = ['calendar', 'email', 'tasks', 'crm', 'finance', 'proposals'] as const;
export type SignalDomain = (typeof SIGNAL_DOMAINS)[number];

export interface RelatedEntities {
  personId?: string;
  projectId?: string;
}

/**
 * Product Audit — F0: Signal Temporality, 22 July 2026 (Founder + CPO).
 *
 * Every signal built so far (calendar, email) is `continuous`: it describes
 * something occurring at a point in time, and relevance decays from
 * `occurredAt`. Financial documents break that assumption — a P&L's
 * *acquisition* time and the *reporting period* it describes are two
 * different clocks, and conflating them lets a stale document masquerade
 * as current. `snapshot` signals carry a `reportingPeriod` and are reasoned
 * about relative to `reportingPeriod.end`, never `occurredAt` (Founder/CPO
 * decision: no hard staleness expiry — fresh/aging/historical framing is
 * defined per document type at the Understand stage, when the first real
 * extractor is built — see lib/cognition/snapshotAge.ts).
 */
export const SIGNAL_TEMPORALITIES = ['continuous', 'snapshot'] as const;
export type SignalTemporality = (typeof SIGNAL_TEMPORALITIES)[number];

export interface ReportingPeriod {
  start: Date;
  end: Date;
}

/**
 * Attached by every DocumentSignalExtractor to every snapshot signal it
 * produces. Deliberately not a confidence score: Founder/CPO decision (F0
 * audit) — qualification for snapshot evidence is based on provenance and
 * evidence quality, not a fixed extraction-confidence percentage. Structured
 * CSV extraction is not assumed immune to silent semantic error — parsing
 * can succeed while mappings, formats, completeness, or reconciliation are
 * still wrong. `structurallyComplete` is the extractor's own honest
 * assertion that it found every field its document type requires and
 * passed its own reconciliation checks — never a heuristic guess.
 */
export interface SnapshotProvenance {
  extractionMethod: 'structured_export' | 'pdf_parsed' | 'api';
  sourceDocumentType: string; // e.g. 'aged_debtors', 'bank_statement'
  structurallyComplete: boolean;
}

/** A Signal as produced by a provider, before it has been persisted. */
export interface DraftSignal<TPayload = Record<string, unknown>> {
  domain: SignalDomain;
  type: string;
  occurredAt: Date;
  relatedEntities: RelatedEntities;
  payload: TPayload;
  sourceProviderId: string;
  /**
   * Stable identifier supplied by the provider — e.g. a Google Calendar event
   * ID for a live provider, or a deterministic hash for a seeded one. Used
   * for idempotent persistence (see DECISIONS.md, "Signal identity").
   */
  externalRef: string;
  /** 1.0 for real data; seeded data may vary to simulate real-world uncertainty. */
  confidence: number;
  /**
   * Defaults to 'continuous' at the repository layer when omitted, so every
   * existing provider (calendar, email) needs no changes. Only extractors
   * producing document-derived signals set this to 'snapshot'.
   */
  temporality?: SignalTemporality;
  /** Present only when temporality === 'snapshot'. */
  reportingPeriod?: ReportingPeriod;
  /** Present only when temporality === 'snapshot'. */
  provenance?: SnapshotProvenance;
}

/** A Signal once persisted (adds database identity and businessId scope). */
export interface Signal<TPayload = Record<string, unknown>> extends DraftSignal<TPayload> {
  id: string;
  businessId: string;
  createdAt: Date;
}

// --- Per-domain payload shapes -------------------------------------------
// Each domain owns its payload shape, versioned alongside its providers.
// These are the shapes seeded providers must produce and live providers
// will eventually be adapted to produce, so the Cognitive Engine never
// needs a source-specific branch.

export interface CalendarSignalPayload {
  [key: string]: unknown;
  title: string;
  startTime: string; // ISO 8601
  durationMinutes: number;
  attendees: string[];
  isFirstMeetingWithPerson: boolean;
}

export interface EmailSignalPayload {
  [key: string]: unknown;
  subject: string;
  fromName: string;
  preview: string;
  requiresReply: boolean;
  daysSinceReceived: number;
}

export interface TaskSignalPayload {
  [key: string]: unknown;
  title: string;
  dueDate: string; // ISO 8601
  isOverdue: boolean;
}

export interface CrmSignalPayload {
  [key: string]: unknown;
  stage: 'enquiry' | 'proposal_sent' | 'negotiation' | 'won' | 'lost';
  daysInStage: number;
  dealValue: number;
}

export interface FinanceSignalPayload {
  [key: string]: unknown;
  invoiceId: string;
  amount: number;
  daysOverdue: number;
  customerName: string;
}

export interface ProposalSignalPayload {
  [key: string]: unknown;
  proposalTitle: string;
  daysSinceSent: number;
  viewed: boolean;
}
