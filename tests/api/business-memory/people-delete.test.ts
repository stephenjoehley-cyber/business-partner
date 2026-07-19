import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/brain/repository', () => ({
  getBusinessByOwner: vi.fn(),
  deletePerson: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner, deletePerson } from '@/lib/brain/repository';
import { DELETE } from '@/app/api/business-memory/people/[id]/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const getBusinessByOwnerMock = getBusinessByOwner as unknown as ReturnType<typeof vi.fn>;
const deletePersonMock = deletePerson as unknown as ReturnType<typeof vi.fn>;

function mockAuthedUser(userId: string | null) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

function makeRequest() {
  return new Request('http://localhost/api/business-memory/people/person-1', { method: 'DELETE' });
}

describe('DELETE /api/business-memory/people/[id]', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getBusinessByOwnerMock.mockReset();
    deletePersonMock.mockReset();
  });

  it('returns 401 when there is no authenticated user', async () => {
    mockAuthedUser(null);

    const res = await DELETE(makeRequest(), { params: { id: 'person-1' } });

    expect(res.status).toBe(401);
    expect(deletePersonMock).not.toHaveBeenCalled();
  });

  it('returns 409 when the owner has no business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue(null);

    const res = await DELETE(makeRequest(), { params: { id: 'person-1' } });

    expect(res.status).toBe(409);
  });

  it('deletes the person scoped to the owner\'s own business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    deletePersonMock.mockResolvedValue(undefined);

    const res = await DELETE(makeRequest(), { params: { id: 'person-1' } });

    expect(res.status).toBe(200);
    expect(deletePersonMock).toHaveBeenCalledWith('biz-1', 'person-1');
  });
});
