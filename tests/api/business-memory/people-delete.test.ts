import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/brain/repository', () => ({
  getBusinessByOwner: vi.fn(),
  deletePerson: vi.fn(),
  updatePerson: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner, deletePerson, updatePerson } from '@/lib/brain/repository';
import { DELETE, PATCH } from '@/app/api/business-memory/people/[id]/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const getBusinessByOwnerMock = getBusinessByOwner as unknown as ReturnType<typeof vi.fn>;
const deletePersonMock = deletePerson as unknown as ReturnType<typeof vi.fn>;
const updatePersonMock = updatePerson as unknown as ReturnType<typeof vi.fn>;

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

function makePatchRequest(body: unknown) {
  return new Request('http://localhost/api/business-memory/people/person-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
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

describe('PATCH /api/business-memory/people/[id]', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getBusinessByOwnerMock.mockReset();
    updatePersonMock.mockReset();
  });

  it('returns 401 when there is no authenticated user', async () => {
    mockAuthedUser(null);

    const res = await PATCH(makePatchRequest({ name: 'Jane C.', relationship: 'customer' }), {
      params: { id: 'person-1' },
    });

    expect(res.status).toBe(401);
    expect(updatePersonMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid relationship value', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });

    const res = await PATCH(makePatchRequest({ name: 'Jane C.', relationship: 'not-real' }), {
      params: { id: 'person-1' },
    });

    expect(res.status).toBe(400);
    expect(updatePersonMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the person does not exist or belong to this business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    updatePersonMock.mockResolvedValue(null);

    const res = await PATCH(makePatchRequest({ name: 'Jane C.', relationship: 'customer' }), {
      params: { id: 'person-1' },
    });

    expect(res.status).toBe(404);
  });

  it('updates the person scoped to the owner\'s own business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    updatePersonMock.mockResolvedValue({ id: 'person-1', name: 'Jane C.', relationship: 'prospect' });

    const res = await PATCH(makePatchRequest({ name: 'Jane C.', relationship: 'prospect' }), {
      params: { id: 'person-1' },
    });

    expect(res.status).toBe(200);
    expect(updatePersonMock).toHaveBeenCalledWith('biz-1', 'person-1', { name: 'Jane C.', relationship: 'prospect' });
  });
});
