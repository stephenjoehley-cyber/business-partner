import { prisma } from '@/lib/prisma';

/**
 * Business Brain — Increment 1 scope.
 *
 * This is the only module that touches Business/Goal/Person persistence
 * directly. API routes and Server Components call these functions; nothing
 * else imports `@/lib/prisma` for these entities. This is the enforcement
 * point for "the Brain never duplicates business logic elsewhere."
 */

export interface BusinessProfileInput {
  name: string;
  industry: string;
  description?: string;
  website?: string;
}

export async function getBusinessByOwner(ownerId: string) {
  return prisma.business.findUnique({
    where: { ownerId },
    include: { goals: true, people: true },
  });
}

export async function getBusinessById(businessId: string) {
  return prisma.business.findUnique({
    where: { id: businessId },
    include: { goals: true, people: true },
  });
}

export async function createBusinessProfile(ownerId: string, input: BusinessProfileInput) {
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
) {
  return prisma.business.update({
    where: { id: businessId },
    data: input,
  });
}

export interface GoalInput {
  description: string;
  priority: number;
}

export async function replaceGoals(businessId: string, goals: GoalInput[]) {
  // Onboarding submits the full goal list each time — simplest correct
  // behaviour for a short, infrequently-edited list. Revisit if goal
  // editing becomes a frequent, granular action post-MVP.
  return prisma.$transaction([
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

export async function addPeople(businessId: string, people: PersonInput[]) {
  if (people.length === 0) return [];
  return prisma.person.createMany({
    data: people.map((p) => ({
      businessId,
      name: p.name,
      relationship: p.relationship,
      email: p.email,
      notes: p.notes,
    })),
  });
}
