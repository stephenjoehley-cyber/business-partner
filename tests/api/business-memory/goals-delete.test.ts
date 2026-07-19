import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/brain/repository', () => ({
  getBusinessByOwner: vi.fn(),
  deleteGoal: vi.fn(),
  updateGoal: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner, deleteGoal, updateGoal } from '@/lib/brain/repository';
import { DELETE, PATCH } from '@/app/api/business-memory/goals/[id]/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const getBusinessByOwnerMock = getBusinessByOwner as unknown as ReturnType<typeof vi.fn>;
const deleteGoalMock = deleteGoal as unknown as ReturnType<typeof vi.fn>;
const updateGoalMock = updateGoal as unknown as ReturnType<typeof vi.fn>;

function mockAuthedUser(userId: string | null) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

function makeRequest() {
  return new Request('http://localhost/api/business-memory/goals/goal-1', { method: 'DELETE' });
}

function makePatchRequest(body: unknown) {
  return new Request('http://localhost/api/business-memory/goals/goal-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

describe('DELETE /api/business-memory/goals/[id]', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getBusinessByOwnerMock.mockReset();
    deleteGoalMock.mockReset();
  });

  it('returns 401 when there is no authenticated user', async () => {
    mockAuthedUser(null);

    const res = await DELETE(makeRequest(), { params: { id: 'goal-1' } });

    expect(res.status).toBe(401);
    expect(deleteGoalMock).not.toHaveBeenCalled();
  });

  it('returns 409 when the owner has no business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue(null);

    const res = await DELETE(makeRequest(), { params: { id: 'goal-1' } });

    expect(res.status).toBe(409);
  });

  it('deletes the goal scoped to the owner\'s own business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    deleteGoalMock.mockResolvedValue(undefined);

    const res = await DELETE(makeRequest(), { params: { id: 'goal-1' } });

    expect(res.status).toBe(200);
    expect(deleteGoalMock).toHaveBeenCalledWith('biz-1', 'goal-1');
  });
});

describe('PATCH /api/business-memory/goals/[id]', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getBusinessByOwnerMock.mockReset();
    updateGoalMock.mockReset();
  });

  it('returns 401 when there is no authenticated user', async () => {
    mockAuthedUser(null);

    const res = await PATCH(makePatchRequest({ description: 'New wording' }), { params: { id: 'goal-1' } });

    expect(res.status).toBe(401);
    expect(updateGoalMock).not.toHaveBeenCalled();
  });

  it('rejects an empty description', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });

    const res = await PATCH(makePatchRequest({ description: '' }), { params: { id: 'goal-1' } });

    expect(res.status).toBe(400);
    expect(updateGoalMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the goal does not exist or belong to this business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    updateGoalMock.mockResolvedValue(null);

    const res = await PATCH(makePatchRequest({ description: 'New wording' }), { params: { id: 'goal-1' } });

    expect(res.status).toBe(404);
  });

  it('updates the description scoped to the owner\'s own business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    updateGoalMock.mockResolvedValue({ id: 'goal-1', description: 'New wording', priority: 1 });

    const res = await PATCH(makePatchRequest({ description: 'New wording' }), { params: { id: 'goal-1' } });

    expect(res.status).toBe(200);
    expect(updateGoalMock).toHaveBeenCalledWith('biz-1', 'goal-1', 'New wording');
  });
});
