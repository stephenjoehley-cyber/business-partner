import type { Business, Goal, Person } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isDemoMode, DEMO_BUSINESS_ID } from '@/lib/demo/config';
import {
  addDemoPeople,
  completeDemoOnboarding,
  createDemoBusinessProfile,
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