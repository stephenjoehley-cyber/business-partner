import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/executive/governedCapability', () => ({
  proposeCapability: vi.fn(),
  getPendingCapabilities: vi.fn(),
  getPublishedValue: vi.fn(),
  approveCapability: vi.fn(),
  publishCapability: vi.fn(),
  InvalidCapabilityTransitionError: class InvalidCapabilityTransitionError extends Error {},
}));

import { createClient } from '@/lib/supabase/server';
import {
  proposeCapability,
  getPendingCapabilities,
  getPublishedValue,
  approveCapability,
  publishCapability,
  InvalidCapabilityTransitionError,
} from '@/lib/executive/governedCapability';
import { GET as listRoute, POST as proposeRoute } from '@/app/api/executive/business-configuration/route';
import { POST as approveRoute } from '@/app/api/executive/business-configuration/[id]/approve/route';
import { POST as publishRoute } from '@/app/api/executive/business-configuration/[id]/publish/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const proposeCapabilityMock = proposeCapability as unknown as ReturnType<typeof vi.fn>;
const getPendingCapabilitiesMock = getPendingCapabilities as unknown as ReturnType<typeof vi.fn>;
const getPublishedValueMock = getPublishedValue as unknown as ReturnType<typeof vi.fn>;
const approveCapabilityMock = approveCapability as unknown as ReturnType<typeof vi.fn>;
const publishCapabilityMock = publishCapability as unknown as ReturnType<typeof vi.fn>;

function mockAuthedUser(userId: string | null) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

function makeRequest(body?: unknown) {
  return new Request('http://localhost/api/executive/business-configuration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('GET /api/executive/business-configuration', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getPendingCapabilitiesMock.mockReset();
    getPublishedValueMock.mockReset();
    getPendingCapabilitiesMock.mockResolvedValue([]);
    getPublishedValueMock.mockResolvedValue(undefined);
  });

  it('rejects an unauthenticated request', async () => {
    mockAuthedUser(null);
    const res = await listRoute();
    expect(res.status).toBe(401);
  });

  it('returns pending and published values for an authenticated request', async () => {
    mockAuthedUser('founder-1');
    getPendingCapabilitiesMock.mockResolvedValue([{ id: 'gc-1', key: 'support_email', status: 'draft' }]);

    const res = await listRoute();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pending).toHaveLength(1);
    expect(body.published).toBeDefined();
  });
});

describe('POST /api/executive/business-configuration', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    proposeCapabilityMock.mockReset();
  });

  it('rejects an unauthenticated request', async () => {
    mockAuthedUser(null);
    const res = await proposeRoute(makeRequest({ key: 'support_email', value: 'new@business-partner.co.za' }));
    expect(res.status).toBe(401);
  });

  it('rejects an unrecognised key', async () => {
    mockAuthedUser('founder-1');
    const res = await proposeRoute(makeRequest({ key: 'not_a_real_key', value: 'x' }));
    expect(res.status).toBe(400);
  });

  it('rejects an empty value', async () => {
    mockAuthedUser('founder-1');
    const res = await proposeRoute(makeRequest({ key: 'support_email', value: '   ' }));
    expect(res.status).toBe(400);
  });

  it('proposes a valid change', async () => {
    mockAuthedUser('founder-1');
    proposeCapabilityMock.mockResolvedValue({ id: 'gc-1', status: 'draft' });

    const res = await proposeRoute(makeRequest({ key: 'support_email', value: 'new@business-partner.co.za' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.proposal.status).toBe('draft');
    expect(proposeCapabilityMock).toHaveBeenCalledWith('business_configuration', 'support_email', 'new@business-partner.co.za', 'founder-1');
  });
});

describe('POST /api/executive/business-configuration/[id]/approve', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    approveCapabilityMock.mockReset();
  });

  it('rejects an unauthenticated request', async () => {
    mockAuthedUser(null);
    const res = await approveRoute(makeRequest(), { params: { id: 'gc-1' } });
    expect(res.status).toBe(401);
  });

  it('returns 409 for an impossible transition rather than a generic error', async () => {
    mockAuthedUser('founder-1');
    approveCapabilityMock.mockRejectedValue(new InvalidCapabilityTransitionError('draft', 'test'));

    const res = await approveRoute(makeRequest(), { params: { id: 'gc-1' } });
    expect(res.status).toBe(409);
  });

  it('approves successfully', async () => {
    mockAuthedUser('founder-1');
    approveCapabilityMock.mockResolvedValue({ id: 'gc-1', status: 'approved' });

    const res = await approveRoute(makeRequest(), { params: { id: 'gc-1' } });
    const body = await res.json();
    expect(body.approved.status).toBe('approved');
  });
});

describe('POST /api/executive/business-configuration/[id]/publish', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    publishCapabilityMock.mockReset();
  });

  it('returns 409 for an impossible transition', async () => {
    mockAuthedUser('founder-1');
    publishCapabilityMock.mockRejectedValue(new InvalidCapabilityTransitionError('draft', 'test'));

    const res = await publishRoute(makeRequest(), { params: { id: 'gc-1' } });
    expect(res.status).toBe(409);
  });

  it('publishes successfully', async () => {
    mockAuthedUser('founder-1');
    publishCapabilityMock.mockResolvedValue({ id: 'gc-1', status: 'published' });

    const res = await publishRoute(makeRequest(), { params: { id: 'gc-1' } });
    const body = await res.json();
    expect(body.published.status).toBe('published');
  });
});
