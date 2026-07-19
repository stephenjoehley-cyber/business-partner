import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/brain/repository', () => ({
  getBusinessByOwner: vi.fn(),
  addGoal: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner, addGoal } from '@/lib/brain/repository';
import { POST } from '@/app/api/business-memory/goals/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const getBusinessByOwnerMock = getBusinessByOwner as unknown as ReturnType<typeof vi.fn>;
const addGoalMock = addGoal as unknown as ReturnType<typeof vi.fn>;

function mockAuthedUser(userId: string | null) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/business-memory/goals', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/business-memory/goals', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getBusinessByOwnerMock.mockReset();
    addGoalMock.mockReset();
  });

  it('returns 401 when there is no authenticated user', async () => {
    mockAuthedUser(null);

    const res = await POST(makeRequest({ description: 'Win our first client' }));

    expect(res.status).toBe(401);
    expect(addGoalMock).not.toHaveBeenCalled();
  });

  it('returns 409 when the owner has no business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue(null);

    const res = await POST(makeRequest({ description: 'Win our first client' }));

    expect(res.status).toBe(409);
  });

  it('rejects an empty description', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1', goals: [] });

    const res = await POST(makeRequest({ description: '' }));

    expect(res.status).toBe(400);
    expect(addGoalMock).not.toHaveBeenCalled();
  });

  it('auto-assigns the next priority (max existing + 1) when none is supplied — a new goal must never silently outrank every existing one', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({
      id: 'biz-1',
      goals: [
        { priority: 1, description: 'Existing goal A' },
        { priority: 3, description: 'Existing goal B' },
      ],
    });
    addGoalMock.mockResolvedValue({ id: 'goal-new', description: 'Win our first client', priority: 4 });

    const res = await POST(makeRequest({ description: 'Win our first client' }));

    expect(res.status).toBe(200);
    expect(addGoalMock).toHaveBeenCalledWith('biz-1', { description: 'Win our first client', priority: 4 });
  });

  it('assigns priority 1 when the business has no existing goals at all', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1', goals: [] });
    addGoalMock.mockResolvedValue({ id: 'goal-new', description: 'Win our first client', priority: 1 });

    await POST(makeRequest({ description: 'Win our first client' }));

    expect(addGoalMock).toHaveBeenCalledWith('biz-1', { description: 'Win our first client', priority: 1 });
  });

  it('respects an explicit priority if the caller supplies one', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1', goals: [{ priority: 1, description: 'A' }] });
    addGoalMock.mockResolvedValue({ id: 'goal-new', description: 'Urgent goal', priority: 1 });

    await POST(makeRequest({ description: 'Urgent goal', priority: 1 }));

    expect(addGoalMock).toHaveBeenCalledWith('biz-1', { description: 'Urgent goal', priority: 1 });
  });
});
