import type { Business, Goal, Person } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isDemoMode, DEMO_BUSINESS_ID } from '@/lib/demo/config';
import {
  addDemoGoal,
  addDemoPeople,
  completeDemoOnboarding,
  createDemoBusinessProfile,
  deleteDemoGoal,
  deleteDemoPerson,
  getDemoBusinessById,
  getDemoBusinessByOwner,
  replaceDemoGoals,
  updateDemoBusinessProfile,
} from '@/lib/demo/store';

/**
 * Business Brain — Increment 1 scope.
 *
 * This is the only module that touches Business/Goal/Person persistence
 * directly. API routes and Server Components call these functions; nothing
 * else imports `@/lib/prisma` for these entities. This is the enforcement
 * point for "the Brain never duplicates business logic elsewhere."
 *
 * Increment 5 (Demo Mode): every exported function below checks
 * `isDemoMode()` first and, if set, delegates to `lib/demo/store.ts`
 * instead of Prisma — same seam pattern as `SignalProvider` /
 * `NarrativeProvider`. Production callers (API routes, Server Components)
 * are unchanged; the swap happens entirely inside this module, which is
 * exactly what "the Brain is the only module that touches persistence"
 * is for.
 */

/** Shared with `lib/demo/store.ts` so the seeded demo business is structurally identical to a real one. */
export type BusinessWithRelations = Business & { goals: Goal[]; people: Person[] };

export interface BusinessProfileInput {
  name: string;
  industry: string;
  description?: string;
  website?: string;
}

export async function getBusinessByOwner(ownerId: string): Promise<BusinessWithRelations | null> {
  if (isDemoMode()) return getDemoBusinessByOwner(ownerId);

  return prisma.business.findUnique({
    where: { ownerId },
    include: { goals: true, people: true },
  });
}

export async function getBusinessById(businessId: string): Promise<BusinessWithRelations | null> {
  if (isDemoMode()) return getDemoBusinessById(businessId);

  return prisma.business.findUnique({
    where: { id: businessId },
    include: { goals: true, people: true },
  });
}

export async function createBusinessProfile(ownerId: string, input: BusinessProfileInput): Promise<Business> {
  if (isDemoMode()) return createDemoBusinessProfile(ownerId, input);

  return prisma.business.create({
    data: {
      ownerId,
      name: input.name,
      industry: input.industry,
      description: input.description,
      website: input.website,
    },
  });
}

export async function updateBusinessProfile(
  businessId: string,
  input: Partial<BusinessProfileInput>
): Promise<Business> {
  if (isDemoMode()) return updateDemoBusinessProfile(businessId, input);

  return prisma.business.update({
    where: { id: businessId },
    data: input,
  });
}

export interface GoalInput {
  description: string;
  priority: number;
}

export async function replaceGoals(businessId: string, goals: GoalInput[]): Promise<void> {
  if (isDemoMode()) {
    replaceDemoGoals(businessId, goals);
    return;
  }

  // Onboarding submits the full goal list each time — simplest correct
  // behaviour for a short, infrequently-edited list. Revisit if goal
  // editing becomes a frequent, granular action post-MVP.
  await prisma.$transaction([
    prisma.goal.deleteMany({ where: { businessId } }),
    prisma.goal.createMany({
      data: goals.map((g) => ({ businessId, description: g.description, priority: g.priority })),
    }),
  ]);
}

/**
 * Continuous Executive Learning (v1, Product Audit 17/18 July 2026) —
 * adds one Goal without touching any existing ones. Deliberately a
 * separate function from replaceGoals, not a reuse of it: replaceGoals
 * is destructive by design (correct for onboarding's one-time bulk
 * submission), and reusing it here would silently delete every goal
 * already on file the first time an owner added a new one.
 */
export async function addGoal(businessId: string, goal: GoalInput): Promise<Goal> {
  if (isDemoMode()) {
    return addDemoGoal(businessId, goal);
  }

  return prisma.goal.create({
    data: { businessId, description: goal.description, priority: goal.priority },
  });
}

/**
 * Continuous Executive Learning — deletion (19 July 2026). Scoped by
 * businessId as well as id (deleteMany, not delete) — an owner can only
 * ever delete a goal that actually belongs to their own business, even
 * if they somehow guessed another business's goal id. Idempotent: does
 * nothing (no error) if the goal is already gone.
 */
export async function deleteGoal(businessId: string, goalId: string): Promise<void> {
  if (isDemoMode()) {
    deleteDemoGoal(businessId, goalId);
    return;
  }

  await prisma.goal.deleteMany({ where: { id: goalId, businessId } });
}

export interface PersonInput {
  name: string;
  relationship: string;
  email?: string;
  notes?: string;
}

export async function addPeople(businessId: string, people: PersonInput[]): Promise<void> {
  if (people.length === 0) return;

  if (isDemoMode()) {
    addDemoPeople(businessId, people);
    return;
  }

  await prisma.person.createMany({
    data: people.map((p) => ({
      businessId,
      name: p.name,
      relationship: p.relationship,
      email: p.email,
      notes: p.notes,
    })),
  });
}

/** Continuous Executive Learning — deletion (19 July 2026). Same businessId + id scoping guard as deleteGoal. */
export async function deletePerson(businessId: string, personId: string): Promise<void> {
  if (isDemoMode()) {
    deleteDemoPerson(businessId, personId);
    return;
  }

  await prisma.person.deleteMany({ where: { id: personId, businessId } });
}

/**
 * Continuous Executive Learning — deletion (19 July 2026). `addPeople`
 * (above) uses Prisma's `createMany`, which never returns the created
 * rows — fine for onboarding's bulk submission, which doesn't need the
 * new ids back, but a real gap for the single-person add in Settings,
 * which needs the real id immediately so a delete button can target it.
 * A distinct singular function, not a change to addPeople's existing
 * bulk behaviour or callers.
 */
export async function addPerson(businessId: string, person: PersonInput): Promise<Person> {
  if (isDemoMode()) {
    addDemoPeople(businessId, [person]);
    // Demo store doesn't currently return the created record from
    // addDemoPeople — read it straight back out, since Demo Mode always
    // appends and this is always the most recently added Person for the
    // business.
    const demo = getDemoBusinessById(businessId);
    const created = demo?.people[demo.people.length - 1];
    if (!created) throw new Error('Failed to add demo person');
    return created;
  }

  return prisma.person.create({
    data: {
      businessId,
      name: person.name,
      relationship: person.relationship,
      email: person.email,
      notes: person.notes,
    },
  });
}

/**
 * Marks onboarding complete — called only after the inaugural Morning
 * Brief has genuinely been generated (Phase B Item 7 Founder decision:
 * the owner isn't finished onboarding because they submitted a form,
 * they're finished because Business Partner is genuinely ready to begin
 * working). Never called directly from a form-submission handler; the
 * only caller is `/api/onboarding/complete`, after `runDailyCycleForBusiness`
 * reports success.
 */
export async function completeOnboarding(businessId: string): Promise<void> {
  if (isDemoMode()) {
    completeDemoOnboarding(businessId);
    return;
  }

  await prisma.business.update({
    where: { id: businessId },
    data: { onboardingCompletedAt: new Date() },
  });
}

/**
 * Every business the Executive Orchestrator (Increment 7) should run the
 * daily executive cycle for. v1 has no per-business scheduling
 * configuration (Operating Model §1 — one owner, one business, one
 * schedule) so this is deliberately unfiltered: every business that
 * exists. Demo Mode returns its single fixed seeded business id, mirroring
 * every other repository function's demo/real split.
 */
export async function getAllBusinessIds(): Promise<string[]> {
  if (isDemoMode()) {
    const demo = getDemoBusinessById(DEMO_BUSINESS_ID);
    return demo ? [demo.id] : [];
  }

  const businesses = await prisma.business.findMany({ select: { id: true } });
  return businesses.map((b: { id: string }) => b.id);
}
