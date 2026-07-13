import type { Business, Goal, Person } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';
import {
  addDemoPeople,
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
