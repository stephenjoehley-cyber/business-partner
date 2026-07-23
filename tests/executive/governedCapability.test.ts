import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    governedCapability: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import {
  proposeCapability,
  approveCapability,
  publishCapability,
  getPublishedValue,
  getCapabilityHistory,
  getPendingCapabilities,
  getAllPublishedInDomain,
  InvalidCapabilityTransitionError,
} from '@/lib/executive/governedCapability';

const createMock = prisma.governedCapability.create as unknown as ReturnType<typeof vi.fn>;
const updateMock = prisma.governedCapability.update as unknown as ReturnType<typeof vi.fn>;
const updateManyMock = prisma.governedCapability.updateMany as unknown as ReturnType<typeof vi.fn>;
const findUniqueOrThrowMock = prisma.governedCapability.findUniqueOrThrow as unknown as ReturnType<typeof vi.fn>;
const findFirstMock = prisma.governedCapability.findFirst as unknown as ReturnType<typeof vi.fn>;
const findManyMock = prisma.governedCapability.findMany as unknown as ReturnType<typeof vi.fn>;
const transactionMock = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'gc-1',
    domain: 'business_configuration',
    key: 'support_email',
    value: 'hello@business-partner.co.za',
    status: 'draft',
    proposedBy: 'founder-user-id',
    proposedAt: new Date('2026-07-23T00:00:00.000Z'),
    approvedBy: null,
    approvedAt: null,
    publishedAt: null,
    supersedesId: null,
    ...overrides,
  };
}

describe('proposeCapability', () => {
  it('creates a new draft row', async () => {
    createMock.mockResolvedValue(makeRow());
    const result = await proposeCapability('business_configuration', 'support_email', 'hello@business-partner.co.za', 'founder-user-id');

    expect(result.status).toBe('draft');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'draft', domain: 'business_configuration', key: 'support_email' }) })
    );
  });
});

describe('approveCapability', () => {
  beforeEach(() => {
    findUniqueOrThrowMock.mockReset();
    updateMock.mockReset();
  });

  it('moves a draft to approved', async () => {
    findUniqueOrThrowMock.mockResolvedValue(makeRow({ status: 'draft' }));
    updateMock.mockResolvedValue(makeRow({ status: 'approved', approvedBy: 'founder-user-id' }));

    const result = await approveCapability('gc-1', 'founder-user-id');
    expect(result.status).toBe('approved');
  });

  it('rejects approving a row that is not a draft — the impossible transition', async () => {
    findUniqueOrThrowMock.mockResolvedValue(makeRow({ status: 'published' }));

    await expect(approveCapability('gc-1', 'founder-user-id')).rejects.toThrow(InvalidCapabilityTransitionError);
  });
});

describe('publishCapability', () => {
  beforeEach(() => {
    findUniqueOrThrowMock.mockReset();
    transactionMock.mockReset();
  });

  it('rejects publishing a row that has not been approved — the impossible transition', async () => {
    findUniqueOrThrowMock.mockResolvedValue(makeRow({ status: 'draft' }));

    await expect(publishCapability('gc-1')).rejects.toThrow(InvalidCapabilityTransitionError);
  });

  it('supersedes the prior published row and publishes the new one in one transaction', async () => {
    findUniqueOrThrowMock.mockResolvedValue(makeRow({ status: 'approved' }));
    transactionMock.mockResolvedValue([{ count: 1 }, makeRow({ status: 'published', publishedAt: new Date() })]);

    const result = await publishCapability('gc-1');

    expect(result.status).toBe('published');
    expect(transactionMock).toHaveBeenCalled();
    // The superseding updateMany and the publishing update both queued in the same transaction call.
    const transactionArg = transactionMock.mock.calls[0][0];
    expect(transactionArg).toHaveLength(2);
  });
});

describe('getPublishedValue', () => {
  it('returns only the published value, never a draft or approved-but-unpublished one', async () => {
    findFirstMock.mockResolvedValue(makeRow({ status: 'published', value: 'new@business-partner.co.za' }));

    const value = await getPublishedValue('business_configuration', 'support_email');

    expect(value).toBe('new@business-partner.co.za');
    expect(findFirstMock).toHaveBeenCalledWith(expect.objectContaining({ where: { domain: 'business_configuration', key: 'support_email', status: 'published' } }));
  });

  it('returns undefined when nothing has ever been published for this key', async () => {
    findFirstMock.mockResolvedValue(null);
    expect(await getPublishedValue('business_configuration', 'support_email')).toBeUndefined();
  });
});

describe('getCapabilityHistory', () => {
  it('returns every version ever proposed for a key, not just the published one', async () => {
    findManyMock.mockResolvedValue([makeRow({ status: 'superseded' }), makeRow({ id: 'gc-2', status: 'published' })]);

    const history = await getCapabilityHistory('business_configuration', 'support_email');
    expect(history).toHaveLength(2);
  });
});

describe('getPendingCapabilities', () => {
  it('returns only draft and approved rows, never published or superseded ones', async () => {
    findManyMock.mockResolvedValue([makeRow({ status: 'draft' })]);

    await getPendingCapabilities('business_configuration');
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { domain: 'business_configuration', status: { in: ['draft', 'approved'] } } })
    );
  });
});

describe('getAllPublishedInDomain', () => {
  it('returns every published row across a domain, not just one key', async () => {
    findManyMock.mockResolvedValue([
      makeRow({ id: 'post-1', key: 'first-post', status: 'published' }),
      makeRow({ id: 'post-2', key: 'second-post', status: 'published' }),
    ]);

    const result = await getAllPublishedInDomain('blog');

    expect(result).toHaveLength(2);
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: { domain: 'blog', status: 'published' } }));
  });
});
