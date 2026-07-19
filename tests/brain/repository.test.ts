import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    goal: {
      create: vi.fn(),
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
  completeDemoOnboarding: vi.fn(),
  createDemoBusinessProfile: vi.fn(),
  getDemoBusinessByOwner: vi.fn(),
  replaceDemoGoals: vi.fn(),
  updateDemoBusinessProfile: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';
import { completeDemoOnboarding, getDemoBusinessById, addDemoGoal } from '@/lib/demo/store';
import { completeOnboarding, getAllBusinessIds, addGoal } from '@/lib/brain/repository';

const goalCreateMock = prisma.goal.create as unknown as ReturnType<typeof vi.fn>;
const addDemoGoalMock = addDemoGoal as unknown as ReturnType<typeof vi.fn>;

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
