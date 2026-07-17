import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/brain/repository', () => ({
  getBusinessByOwner: vi.fn(),
}));

vi.mock('@/lib/signals/repository', () => ({
  getSignalsForBusiness: vi.fn(),
}));

vi.mock('@/lib/cognition/repository', () => ({
  getAllMorningBriefsForBusiness: vi.fn(),
}));

vi.mock('@/lib/demo/config', () => ({
  isDemoMode: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { getSignalsForBusiness } from '@/lib/signals/repository';
import { getAllMorningBriefsForBusiness } from '@/lib/cognition/repository';
import { isDemoMode } from '@/lib/demo/config';
import { GET } from '@/app/api/account/export/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const getBusinessByOwnerMock = getBusinessByOwner as unknown as ReturnType<typeof vi.fn>;
const getSignalsForBusinessMock = getSignalsForBusiness as unknown as ReturnType<typeof vi.fn>;
const getAllMorningBriefsForBusinessMock = getAllMorningBriefsForBusiness as unknown as ReturnType<typeof vi.fn>;
const isDemoModeMock = isDemoMode as unknown as ReturnType<typeof vi.fn>;

function mockAuthedUser(userId: string | null) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

const sampleBusiness = {
  id: 'biz-1',
  name: 'Mzansichat',
  industry: 'Advertising & Marketing',
  description: 'WhatsApp automation',
  website: 'https://mzansichat.co.za',
  createdAt: new Date('2026-01-01'),
  goals: [{ description: 'Win our first account', priority: 1, createdAt: new Date('2026-01-01') }],
  people: [{ name: 'Francios Joubert', relationship: 'prospect', email: 'francios@forceflow.co.za', notes: null }],
};

describe('GET /api/account/export', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getBusinessByOwnerMock.mockReset();
    getSignalsForBusinessMock.mockReset();
    getAllMorningBriefsForBusinessMock.mockReset();
    isDemoModeMock.mockReset();
    isDemoModeMock.mockReturnValue(false);
  });

  it('refuses to operate in Demo Mode', async () => {
    isDemoModeMock.mockReturnValue(true);

    const res = await GET();

    expect(res.status).toBe(403);
    expect(getBusinessByOwnerMock).not.toHaveBeenCalled();
  });

  it('returns 401 when there is no authenticated user', async () => {
    mockAuthedUser(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns 404 when the owner has no business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(404);
  });

  it('returns a downloadable JSON export containing business, goals, people, signals, and briefs — excluding provider tokens entirely', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue(sampleBusiness);
    getSignalsForBusinessMock.mockResolvedValue([{ id: 'sig-1', domain: 'calendar' }]);
    getAllMorningBriefsForBusinessMock.mockResolvedValue([{ tier: 'all_clear', message: 'No signals currently require executive attention.' }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(body.business.name).toBe('Mzansichat');
    expect(body.goals).toHaveLength(1);
    expect(body.people[0].name).toBe('Francios Joubert');
    expect(body.signals).toHaveLength(1);
    expect(body.morningBriefs).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain('encryptedAccessToken');
    expect(JSON.stringify(body)).not.toContain('encryptedRefreshToken');
  });
});
