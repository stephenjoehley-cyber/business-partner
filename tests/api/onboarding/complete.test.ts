import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/brain/repository', () => ({
  getBusinessByOwner: vi.fn(),
  completeOnboarding: vi.fn(),
}));

vi.mock('@/lib/orchestrator/dailyCycle', () => ({
  runDailyCycleForBusiness: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { completeOnboarding, getBusinessByOwner } from '@/lib/brain/repository';
import { runDailyCycleForBusiness } from '@/lib/orchestrator/dailyCycle';
import { POST } from '@/app/api/onboarding/complete/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const getBusinessByOwnerMock = getBusinessByOwner as unknown as ReturnType<typeof vi.fn>;
const completeOnboardingMock = completeOnboarding as unknown as ReturnType<typeof vi.fn>;
const runDailyCycleForBusinessMock = runDailyCycleForBusiness as unknown as ReturnType<typeof vi.fn>;

function mockAuthedUser(userId: string | null) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

describe('POST /api/onboarding/complete', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getBusinessByOwnerMock.mockReset();
    completeOnboardingMock.mockReset();
    runDailyCycleForBusinessMock.mockReset();
  });

  it('returns 401 when there is no authenticated user', async () => {
    mockAuthedUser(null);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(runDailyCycleForBusinessMock).not.toHaveBeenCalled();
    expect(completeOnboardingMock).not.toHaveBeenCalled();
  });

  it('returns 409 when the owner has no business profile yet', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue(null);

    const res = await POST();

    expect(res.status).toBe(409);
    expect(runDailyCycleForBusinessMock).not.toHaveBeenCalled();
  });

  it('marks onboarding complete once the inaugural cycle runs successfully', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    runDailyCycleForBusinessMock.mockResolvedValue({ ran: true });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(completeOnboardingMock).toHaveBeenCalledWith('biz-1');
  });

  it('treats "already ran today" (no error) as success — a retried call after completion is still marked complete', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    runDailyCycleForBusinessMock.mockResolvedValue({ ran: false });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(completeOnboardingMock).toHaveBeenCalledWith('biz-1');
  });

  it('does not mark onboarding complete when the inaugural cycle genuinely fails, and returns a retryable error', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    runDailyCycleForBusinessMock.mockResolvedValue({ ran: false, error: 'Signal provider unavailable' });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toMatch(/still getting things ready/i);
    expect(completeOnboardingMock).not.toHaveBeenCalled();
  });
});