import type { Business, Goal, Person } from '@prisma/client';
import type { BusinessWithRelations, BusinessProfileInput, GoalInput, PersonInput } from '@/lib/brain/repository';
import type { DraftSignal, Signal } from '@/lib/signals/types';
import type { MorningBriefResult } from '@/lib/cognition/types';
import { DEMO_BUSINESS_ID, DEMO_OWNER_ID } from './config';

/**
 * In-memory backing store for Demo Mode — Increment 5. Deliberately not a
 * database: it exists for exactly one process lifetime (resets on server
 * restart), which is the right trade-off for "open it and see it work,"
 * not a persistence guarantee. Every repository module (`lib/brain`,
 * `lib/signals`, `lib/cognition`) delegates here instead of Prisma when
 * `isDemoMode()` is true — this file is the one place that data lives,
 * mirroring the "one module owns persistence" principle those repositories
 * already follow for the real database.
 *
 * The seed data reuses "Meridian Gearboxes" / "Jane Cooper" — the same
 * example already used throughout the interpreter tests and design
 * documents — so the demo feels like a natural extension of the product's
 * own worked examples rather than a disconnected fixture.
 */

// ---------------------------------------------------------------------------
// Business / Goals / People
// ---------------------------------------------------------------------------

let demoBusiness: Business = {
  id: DEMO_BUSINESS_ID,
  ownerId: DEMO_OWNER_ID,
  name: 'Meridian Gearboxes',
  industry: 'Automotive',
  description: 'Independent gearbox specialist serving passenger and commercial vehicles.',
  website: 'https://meridiangearboxes.example',
  createdAt: new Date(),
  updatedAt: new Date(),
  // Demo Mode bypasses onboarding entirely (seeded, zero-configuration) —
  // pre-set so it's never routed into the real onboarding wizard by the
  // same completion check a real account uses.
  onboardingCompletedAt: new Date(),
};

let demoGoals: Goal[] = [
  {
    id: 'demo-goal-response-times',
    businessId: DEMO_BUSINESS_ID,
    // Deliberately touches the email interpreter's goal keywords
    // ("customer", "response") so the seeded email recommendation
    // demonstrates goal-matching, not just a bare signal.
    description: 'Improve response times on customer emails',
    priority: 1,
    createdAt: new Date(),
  },
  {
    id: 'demo-goal-new-customers',
    businessId: DEMO_BUSINESS_ID,
    // Touches the calendar interpreter's goal keywords ("sales", "new
    // customer") for the same reason.
    description: 'Grow sales through new customer meetings',
    priority: 2,
    createdAt: new Date(),
  },
];

let demoPeople: Person[] = [
  {
    id: 'demo-person-jane-cooper',
    businessId: DEMO_BUSINESS_ID,
    name: 'Jane Cooper',
    relationship: 'customer',
    email: 'jane.cooper@example.com',
    company: null,
    notes: 'Long-standing customer on a quarterly service contract.',
    createdAt: new Date(),
  },
];

function currentBusinessWithRelations(): BusinessWithRelations {
  return { ...demoBusiness, goals: demoGoals, people: demoPeople };
}

export function getDemoBusinessByOwner(ownerId: string): BusinessWithRelations | null {
  return ownerId === demoBusiness.ownerId ? currentBusinessWithRelations() : null;
}

export function getDemoBusinessById(businessId: string): BusinessWithRelations | null {
  return businessId === demoBusiness.id ? currentBusinessWithRelations() : null;
}

/** Mirrors `createBusinessProfile` — in practice never called via the demo UI (onboarding is bypassed), kept for completeness since this module is the demo counterpart to the whole Brain interface, not a partial one. */
export function createDemoBusinessProfile(ownerId: string, input: BusinessProfileInput): Business {
  demoBusiness = {
    ...demoBusiness,
    ownerId,
    name: input.name,
    industry: input.industry,
    description: input.description ?? null,
    website: input.website ?? null,
    onboardingCompletedAt: null,
    updatedAt: new Date(),
  };
  return demoBusiness;
}

/** Mirrors the real `completeOnboarding` — sets the field once the inaugural cycle has actually run. Never called via the demo UI (onboarding is bypassed), kept for completeness. */
export function completeDemoOnboarding(businessId: string): void {
  if (businessId !== demoBusiness.id) {
    throw new Error(`Demo store has no business with id: ${businessId}`);
  }
  demoBusiness = { ...demoBusiness, onboardingCompletedAt: new Date() };
}

export function updateDemoBusinessProfile(businessId: string, input: Partial<BusinessProfileInput>): Business {
  if (businessId !== demoBusiness.id) {
    throw new Error(`Demo store has no business with id: ${businessId}`);
  }
  demoBusiness = { ...demoBusiness, ...input, updatedAt: new Date() };
  return demoBusiness;
}

export function replaceDemoGoals(businessId: string, goals: GoalInput[]): void {
  demoGoals = goals.map((g, index) => ({
    id: `demo-goal-${index}`,
    businessId,
    description: g.description,
    priority: g.priority,
    createdAt: new Date(),
  }));
}

/**
 * Continuous Executive Learning (v1) — genuinely additive, unlike
 * replaceDemoGoals, which is onboarding's own bulk one-time submission
 * and deliberately destructive by design. Adding one goal after
 * onboarding must never silently delete every goal already there.
 */
export function addDemoGoal(businessId: string, goal: GoalInput): Goal {
  const newGoal: Goal = {
    id: `demo-goal-${demoGoals.length}`,
    businessId,
    description: goal.description,
    priority: goal.priority,
    createdAt: new Date(),
  };
  demoGoals = [...demoGoals, newGoal];
  return newGoal;
}

/**
 * Continuous Executive Learning — deletion (19 July 2026). Scoped by
 * businessId as well as id, same guard the real Prisma-backed
 * deleteGoal uses — an owner can only ever delete their own business's
 * goals, even in demo data.
 */
export function deleteDemoGoal(businessId: string, goalId: string): void {
  demoGoals = demoGoals.filter((g) => !(g.id === goalId && g.businessId === businessId));
}

/** Continuous Executive Learning — editing (19 July 2026). Only description is editable — priority (ordering) is a separate concern, not part of this capability. */
export function updateDemoGoal(businessId: string, goalId: string, description: string): Goal | null {
  const goal = demoGoals.find((g) => g.id === goalId && g.businessId === businessId);
  if (!goal) return null;
  const updated = { ...goal, description };
  demoGoals = demoGoals.map((g) => (g.id === goalId ? updated : g));
  return updated;
}

export function addDemoPeople(businessId: string, people: PersonInput[]): void {
  const startIndex = demoPeople.length;
  const added: Person[] = people.map((p, index) => ({
    id: `demo-person-${startIndex + index}`,
    businessId,
    name: p.name,
    relationship: p.relationship,
    email: p.email ?? null,
    company: p.company ?? null,
    notes: p.notes ?? null,
    createdAt: new Date(),
  }));
  demoPeople = [...demoPeople, ...added];
}

/** Continuous Executive Learning — deletion (19 July 2026). Same businessId + id scoping guard as deleteDemoGoal. */
export function deleteDemoPerson(businessId: string, personId: string): void {
  demoPeople = demoPeople.filter((p) => !(p.id === personId && p.businessId === businessId));
}

/** Continuous Executive Learning — editing (19 July 2026). */
export function updateDemoPerson(businessId: string, personId: string, input: PersonInput): Person | null {
  const person = demoPeople.find((p) => p.id === personId && p.businessId === businessId);
  if (!person) return null;
  const updated: Person = {
    ...person,
    name: input.name,
    relationship: input.relationship,
    email: input.email ?? null,
    company: input.company ?? null,
    notes: input.notes ?? null,
  };
  demoPeople = demoPeople.map((p) => (p.id === personId ? updated : p));
  return updated;
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

/** Keyed by externalRef, matching the real repository's upsert-by-(businessId, externalRef) identity (DECISIONS.md, "Signal identity") — safe to re-run without duplicating. */
const demoSignals = new Map<string, Signal>();
let demoSignalSequence = 0;

export function persistDemoSignals(businessId: string, drafts: DraftSignal[]): Signal[] {
  return drafts.map((draft) => {
    const existing = demoSignals.get(draft.externalRef);
    const signal: Signal = {
      id: existing?.id ?? `demo-signal-${++demoSignalSequence}`,
      businessId,
      domain: draft.domain,
      type: draft.type,
      occurredAt: draft.occurredAt,
      relatedEntities: draft.relatedEntities,
      payload: draft.payload,
      sourceProviderId: draft.sourceProviderId,
      externalRef: draft.externalRef,
      confidence: draft.confidence,
      createdAt: existing?.createdAt ?? new Date(),
      temporality: draft.temporality ?? 'continuous',
      reportingPeriod: draft.reportingPeriod,
      provenance: draft.provenance,
    };
    demoSignals.set(draft.externalRef, signal);
    return signal;
  });
}

export function getDemoSignalsForBusiness(businessId: string): Signal[] {
  return [...demoSignals.values()]
    .filter((s) => s.businessId === businessId)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

export function getDemoSignalsByIds(businessId: string, ids: string[]): Signal[] {
  if (ids.length === 0) return [];
  const byId = new Map(
    [...demoSignals.values()].filter((s) => s.businessId === businessId).map((s) => [s.id, s] as const)
  );
  // Preserve the order `ids` specified, same contract as the real repository.
  return ids.map((id) => byId.get(id)).filter((s): s is Signal => Boolean(s));
}

// ---------------------------------------------------------------------------
// Signal Provider configuration
// ---------------------------------------------------------------------------

/**
 * Demo Mode never has a per-business provider override — it always falls
 * through to `DEFAULT_PROVIDER_ID` (the seeded Calendar/Email providers),
 * which is exactly the zero-config behaviour a demo should have.
 */
export function getDemoConfiguredProviderId(): null {
  return null;
}

// ---------------------------------------------------------------------------
// Morning Briefs
// ---------------------------------------------------------------------------

const demoBriefs: MorningBriefResult[] = [];

export function saveDemoMorningBrief(brief: MorningBriefResult): void {
  demoBriefs.push(brief);
}

export function getLatestDemoMorningBrief(): MorningBriefResult | null {
  return demoBriefs.length > 0 ? demoBriefs[demoBriefs.length - 1] : null;
}

// ---------------------------------------------------------------------------
// Seeding state
// ---------------------------------------------------------------------------

/**
 * Business/Goals/People are seeded synchronously above (module load) —
 * only Signals and the first Morning Brief require running the real,
 * async pipeline once (`lib/demo/seed.ts`, `ensureDemoSeeded`). This flag
 * is what makes that idempotent across the many requests a dev server
 * handles.
 */
let seeded = false;

export function isDemoSeeded(): boolean {
  return seeded;
}

export function markDemoSeeded(): void {
  seeded = true;
}
