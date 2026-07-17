import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/brain/repository', () => ({
  getBusinessByOwner: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { business: { delete: vi.fn() } },
}));

vi.mock('@/lib/demo/config', () => ({
  isDemoMode: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';
import { POST } from '@/app/api/account/delete/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const getBusinessByOwnerMock = getBusinessByOwner as unknown as ReturnType<typeof vi.fn>;
const businessDeleteMock = prisma.business.delete as unknown as ReturnType<typeof vi.fn>;
const isDemoModeMock = isDemoMode as unknown as ReturnType<typeof vi.fn>;

function mockAuthedUser(userId: string | null) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

function requestWithBody(body: unknown) {
  return new Request('https://example.com/api/account/delete', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const sampleBusiness = { id: 'biz-1', name: 'Mzansichat' };

describe('POST /api/account/delete', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createClientMock.mockReset();
    getBusinessByOwnerMock.mockReset();
    businessDeleteMock.mockReset();
    isDemoModeMock.mockReset();
    isDemoModeMock.mockReturnValue(false);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('refuses to operate in Demo Mode', async () => {
    isDemoModeMock.mockReturnValue(true);

    const res = await POST(requestWithBody({}));

    expect(res.status).toBe(403);
    expect(businessDeleteMock).not.toHaveBeenCalled();
  });

  it('returns 401 when there is no authenticated user', async () => {
    mockAuthedUser(null);

    const res = await POST(requestWithBody({}));

    expect(res.status).toBe(401);
    expect(businessDeleteMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the owner has no business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue(null);

    const res = await POST(requestWithBody({}));

    expect(res.status).toBe(404);
    expect(businessDeleteMock).not.toHaveBeenCalled();
  });

  it('deletes only the requesting owner\'s business, and logs a structured BusinessDeleted event', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue(sampleBusiness);
    businessDeleteMock.mockResolvedValue(sampleBusiness);

    const res = await POST(requestWithBody({}));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(businessDeleteMock).toHaveBeenCalledWith({ where: { id: 'biz-1' } });

    const loggedLine = consoleLogSpy.mock.calls[0][0] as string;
    const logged = JSON.parse(loggedLine);
    expect(logged.event).toBe('BusinessDeleted');
    expect(logged.business).toBe('Mzansichat');
    expect(logged.businessId).toBe('biz-1');
    expect(logged.feedback).toBeUndefined();
  });

  it('includes optional feedback in the logged event when provided', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue(sampleBusiness);
    businessDeleteMock.mockResolvedValue(sampleBusiness);

    await POST(requestWithBody({ feedback: '  The Calendar sync never worked for me.  ' }));

    const loggedLine = consoleLogSpy.mock.calls[0][0] as string;
    const logged = JSON.parse(loggedLine);
    expect(logged.feedback).toBe('The Calendar sync never worked for me.');
  });

  it('proceeds without feedback when no request body is sent at all', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue(sampleBusiness);
    businessDeleteMock.mockResolvedValue(sampleBusiness);

    const res = await POST(new Request('https://example.com/api/account/delete', { method: 'POST' }));

    expect(res.status).toBe(200);
  });
});
