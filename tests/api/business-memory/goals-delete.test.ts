import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/brain/repository', () => ({
  getBusinessByOwner: vi.fn(),
  deleteGoal: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner, deleteGoal } from '@/lib/brain/repository';
import { DELETE } from '@/app/api/business-memory/goals/[id]/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const getBusinessByOwnerMock = getBusinessByOwner as unknown as ReturnType<typeof vi.fn>;
const deleteGoalMock = deleteGoal as unknown as ReturnType<typeof vi.fn>;

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
