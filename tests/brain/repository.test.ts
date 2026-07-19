import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    goal: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    person: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/demo/config', () => ({
  isDemoMode: vi.fn(),
  DEMO_BUSINESS_ID: 'demo-business',
}));

vi.mock('@/lib/demo/store', () => ({
  getDemoBusinessById: vi.fn(),
  addDemoPeople: vi.fn(),
  addDemoGoal: vi.fn(),
  deleteDemoGoal: vi.fn(),
  deleteDemoPerson: vi.fn(),
  completeDemoOnboarding: vi.fn(),
  createDemoBusinessProfile: vi.fn(),
  getDemoBusinessByOwner: vi.fn(),
  replaceDemoGoals: vi.fn(),
  updateDemoBusinessProfile: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';
import {
  completeDemoOnboarding,
  getDemoBusinessById,
  addDemoGoal,
  deleteDemoGoal,
  deleteDemoPerson,
} from '@/lib/demo/store';
import {
  completeOnboarding,
  getAllBusinessIds,
  addGoal,
  deleteGoal,
  deletePerson,
  addPerson,
} from '@/lib/brain/repository';

const goalCreateMock = prisma.goal.create as unknown as ReturnType<typeof vi.fn>;
const goalDeleteManyMock = prisma.goal.deleteMany as unknown as ReturnType<typeof vi.fn>;
const personCreateMock = prisma.person.create as unknown as ReturnType<typeof vi.fn>;
const personDeleteManyMock = prisma.person.deleteMany as unknown as ReturnType<typeof vi.fn>;
const addDemoGoalMock = addDemoGoal as unknown as ReturnType<typeof vi.fn>;
const deleteDemoGoalMock = deleteDemoGoal as unknown as ReturnType<typeof vi.fn>;
const deleteDemoPersonMock = deleteDemoPerson as unknown as ReturnType<typeof vi.fn>;

const findManyMock = prisma.business.findMany as unknown as ReturnType<typeof vi.fn>;
const updateMock = prisma.business.update as unknown as ReturnType<typeof vi.fn>;
const isDemoModeMock = isDemoMode as unknown as ReturnType<typeof vi.fn>;
const getDemoBusinessByIdMock = getDemoBusinessById as unknown as ReturnType<typeof vi.fn>;
const completeDemoOnboardingMock = completeDemoOnboarding as unknown as ReturnType<typeof vi.fn>;

describe('getAllBusinessIds', () => {
  beforeEach(() => {
    findManyMock.mockReset();
    isDemoModeMock.mockReset();
    getDemoBusinessByIdMock.mockReset();
  });

  it('queries every business id when not in Demo Mode', async () => {
    isDemoModeMock.mockReturnValue(false);
    findManyMock.mockResolvedValue([{ id: 'biz-1' }, { id: 'biz-2' }]);

    const result = await getAllBusinessIds();

    expect(findManyMock).toHaveBeenCalledWith({ select: { id: true } });
    expect(result).toEqual(['biz-1', 'biz-2']);
  });

  it('returns an empty array when no businesses exist', async () => {
    isDemoModeMock.mockReturnValue(false);
    findManyMock.mockResolvedValue([]);

    const result = await getAllBusinessIds();

    expect(result).toEqual([]);
  });

  it('returns the single seeded demo business id in Demo Mode, without touching Prisma', async () => {
    isDemoModeMock.mockReturnValue(true);
    getDemoBusinessByIdMock.mockReturnValue({ id: 'demo-business' });

    const result = await getAllBusinessIds();

    expect(result).toEqual(['demo-business']);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('returns an empty array in Demo Mode if the demo business is somehow missing', async () => {
    isDemoModeMock.mockReturnValue(true);
    getDemoBusinessByIdMock.mockReturnValue(null);

    const result = await getAllBusinessIds();

    expect(result).toEqual([]);
  });
});

describe('completeOnboarding', () => {
  beforeEach(() => {
    updateMock.mockReset();
    isDemoModeMock.mockReset();
    completeDemoOnboardingMock.mockReset();
  });

  it('sets onboardingCompletedAt via Prisma when not in Demo Mode', async () => {
    isDemoModeMock.mockReturnValue(false);
    updateMock.mockResolvedValue({});

    await completeOnboarding('biz-1');

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'biz-1' },
      data: { onboardingCompletedAt: expect.any(Date) },
    });
    expect(completeDemoOnboardingMock).not.toHaveBeenCalled();
  });

  it('delegates to the demo store in Demo Mode, without touching Prisma', async () => {
    isDemoModeMock.mockReturnValue(true);

    await completeOnboarding('demo-business');

    expect(completeDemoOnboardingMock).toHaveBeenCalledWith('demo-business');
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe('addGoal', () => {
  const isDemoModeMock2 = isDemoMode as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    goalCreateMock.mockReset();
    addDemoGoalMock.mockReset();
    isDemoModeMock2.mockReset();
  });

  it('creates exactly one new Goal via Prisma, never deleting or touching existing ones (unlike replaceGoals)', async () => {
    isDemoModeMock2.mockReturnValue(false);
    goalCreateMock.mockResolvedValue({ id: 'goal-1', description: 'Win our first client', priority: 3 });

    const result = await addGoal('biz-1', { description: 'Win our first client', priority: 3 });

    expect(goalCreateMock).toHaveBeenCalledWith({
      data: { businessId: 'biz-1', description: 'Win our first client', priority: 3 },
    });
    expect(result).toEqual({ id: 'goal-1', description: 'Win our first client', priority: 3 });
  });

  it('delegates to the demo store in Demo Mode, without touching Prisma', async () => {
    isDemoModeMock2.mockReturnValue(true);
    addDemoGoalMock.mockReturnValue({ id: 'demo-goal-0', description: 'Win our first client', priority: 1 });

    const result = await addGoal('demo-business', { description: 'Win our first client', priority: 1 });

    expect(addDemoGoalMock).toHaveBeenCalledWith('demo-business', { description: 'Win our first client', priority: 1 });
    expect(goalCreateMock).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'demo-goal-0', description: 'Win our first client', priority: 1 });
  });
});

describe('deleteGoal', () => {
  const isDemoModeMock3 = isDemoMode as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    goalDeleteManyMock.mockReset();
    deleteDemoGoalMock.mockReset();
    isDemoModeMock3.mockReset();
  });

  it('deletes via Prisma, scoped by both id and businessId — an owner can only delete their own business\'s goal', async () => {
    isDemoModeMock3.mockReturnValue(false);
    goalDeleteManyMock.mockResolvedValue({ count: 1 });

    await deleteGoal('biz-1', 'goal-1');

    expect(goalDeleteManyMock).toHaveBeenCalledWith({ where: { id: 'goal-1', businessId: 'biz-1' } });
  });

  it('delegates to the demo store in Demo Mode, without touching Prisma', async () => {
    isDemoModeMock3.mockReturnValue(true);

    await deleteGoal('demo-business', 'demo-goal-0');

    expect(deleteDemoGoalMock).toHaveBeenCalledWith('demo-business', 'demo-goal-0');
    expect(goalDeleteManyMock).not.toHaveBeenCalled();
  });
});

describe('deletePerson', () => {
  const isDemoModeMock4 = isDemoMode as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    personDeleteManyMock.mockReset();
    deleteDemoPersonMock.mockReset();
    isDemoModeMock4.mockReset();
  });

  it('deletes via Prisma, scoped by both id and businessId', async () => {
    isDemoModeMock4.mockReturnValue(false);
    personDeleteManyMock.mockResolvedValue({ count: 1 });

    await deletePerson('biz-1', 'person-1');

    expect(personDeleteManyMock).toHaveBeenCalledWith({ where: { id: 'person-1', businessId: 'biz-1' } });
  });

  it('delegates to the demo store in Demo Mode, without touching Prisma', async () => {
    isDemoModeMock4.mockReturnValue(true);

    await deletePerson('demo-business', 'demo-person-0');

    expect(deleteDemoPersonMock).toHaveBeenCalledWith('demo-business', 'demo-person-0');
    expect(personDeleteManyMock).not.toHaveBeenCalled();
  });
});

describe('addPerson', () => {
  const isDemoModeMock5 = isDemoMode as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    personCreateMock.mockReset();
    isDemoModeMock5.mockReset();
  });

  it('creates exactly one new Person via Prisma and returns the created record (including its real id)', async () => {
    isDemoModeMock5.mockReturnValue(false);
    personCreateMock.mockResolvedValue({ id: 'person-1', name: 'Jane Cooper', relationship: 'customer' });

    const result = await addPerson('biz-1', { name: 'Jane Cooper', relationship: 'customer' });

    expect(personCreateMock).toHaveBeenCalledWith({
      data: { businessId: 'biz-1', name: 'Jane Cooper', relationship: 'customer', email: undefined, notes: undefined },
    });
    expect(result).toEqual({ id: 'person-1', name: 'Jane Cooper', relationship: 'customer' });
  });
});
