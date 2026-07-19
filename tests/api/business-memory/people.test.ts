import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/brain/repository', () => ({
  getBusinessByOwner: vi.fn(),
  addPerson: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner, addPerson } from '@/lib/brain/repository';
import { POST } from '@/app/api/business-memory/people/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const getBusinessByOwnerMock = getBusinessByOwner as unknown as ReturnType<typeof vi.fn>;
const addPersonMock = addPerson as unknown as ReturnType<typeof vi.fn>;

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
    addPersonMock.mockReset();
  });

  it('returns 401 when there is no authenticated user', async () => {
    mockAuthedUser(null);

    const res = await POST(makeRequest({ name: 'Jane Cooper', relationship: 'customer' }));

    expect(res.status).toBe(401);
    expect(addPersonMock).not.toHaveBeenCalled();
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
    expect(addPersonMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid relationship value', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });

    const res = await POST(makeRequest({ name: 'Jane Cooper', relationship: 'not-a-real-relationship' }));

    expect(res.status).toBe(400);
  });

  it('adds exactly one person via the singular addPerson function, and returns the created record (including its real id) so the UI can target it for deletion', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    addPersonMock.mockResolvedValue({ id: 'person-99', name: 'Jane Cooper', relationship: 'customer' });

    const res = await POST(makeRequest({ name: 'Jane Cooper', relationship: 'customer', email: 'jane@example.com' }));

    expect(res.status).toBe(200);
    expect(addPersonMock).toHaveBeenCalledWith('biz-1', {
      name: 'Jane Cooper',
      relationship: 'customer',
      email: 'jane@example.com',
    });
    const body = await res.json();
    expect(body.person.id).toBe('person-99');
  });

  it('accepts a person with no email supplied at all', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    addPersonMock.mockResolvedValue({ id: 'person-1', name: 'Jane Cooper', relationship: 'customer' });

    const res = await POST(makeRequest({ name: 'Jane Cooper', relationship: 'customer' }));

    expect(res.status).toBe(200);
  });
});
