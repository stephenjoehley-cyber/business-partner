import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/brain/repository', () => ({
  getBusinessByOwner: vi.fn(),
  addPeople: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner, addPeople } from '@/lib/brain/repository';
import { POST } from '@/app/api/business-memory/people/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const getBusinessByOwnerMock = getBusinessByOwner as unknown as ReturnType<typeof vi.fn>;
const addPeopleMock = addPeople as unknown as ReturnType<typeof vi.fn>;

function mockAuthedUser(userId: string | null) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/business-memory/people', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/business-memory/people', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getBusinessByOwnerMock.mockReset();
    addPeopleMock.mockReset();
  });

  it('returns 401 when there is no authenticated user', async () => {
    mockAuthedUser(null);

    const res = await POST(makeRequest({ name: 'Jane Cooper', relationship: 'customer' }));

    expect(res.status).toBe(401);
    expect(addPeopleMock).not.toHaveBeenCalled();
  });

  it('returns 409 when the owner has no business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue(null);

    const res = await POST(makeRequest({ name: 'Jane Cooper', relationship: 'customer' }));

    expect(res.status).toBe(409);
  });

  it('rejects a missing name', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });

    const res = await POST(makeRequest({ name: '', relationship: 'customer' }));

    expect(res.status).toBe(400);
    expect(addPeopleMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid relationship value', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });

    const res = await POST(makeRequest({ name: 'Jane Cooper', relationship: 'not-a-real-relationship' }));

    expect(res.status).toBe(400);
  });

  it('adds exactly one person via the existing, already-additive addPeople function', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    addPeopleMock.mockResolvedValue(undefined);

    const res = await POST(makeRequest({ name: 'Jane Cooper', relationship: 'customer', email: 'jane@example.com' }));

    expect(res.status).toBe(200);
    expect(addPeopleMock).toHaveBeenCalledWith('biz-1', [
      { name: 'Jane Cooper', relationship: 'customer', email: 'jane@example.com' },
    ]);
  });

  it('accepts a person with no email supplied at all', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    addPeopleMock.mockResolvedValue(undefined);

    const res = await POST(makeRequest({ name: 'Jane Cooper', relationship: 'customer' }));

    expect(res.status).toBe(200);
  });
});
