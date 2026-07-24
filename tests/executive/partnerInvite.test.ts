import { describe, expect, it, vi, beforeEach } from 'vitest';

const inviteUserByEmailMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { admin: { inviteUserByEmail: inviteUserByEmailMock } },
  })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    partner: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/demo/config', () => ({
  isDemoMode: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';
import { invitePartner, PartnerInviteError } from '@/lib/executive/partnerInvite';

const findUniqueOrThrowMock = prisma.partner.findUniqueOrThrow as unknown as ReturnType<typeof vi.fn>;
const updateMock = prisma.partner.update as unknown as ReturnType<typeof vi.fn>;
const isDemoModeMock = isDemoMode as unknown as ReturnType<typeof vi.fn>;

describe('invitePartner', () => {
  beforeEach(() => {
    findUniqueOrThrowMock.mockReset();
    updateMock.mockReset();
    isDemoModeMock.mockReset();
    inviteUserByEmailMock.mockReset();
    isDemoModeMock.mockReturnValue(false);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test-project.supabase.co');
  });

  it('refuses to run in demo mode', async () => {
    isDemoModeMock.mockReturnValue(true);
    await expect(invitePartner('partner-1', 'founder-id')).rejects.toThrow(PartnerInviteError);
    expect(findUniqueOrThrowMock).not.toHaveBeenCalled();
  });

  it('refuses to invite a partner who already has a portal account', async () => {
    findUniqueOrThrowMock.mockResolvedValue({ id: 'partner-1', authUserId: 'existing-user-id', contactEmail: 'x@example.com' });
    await expect(invitePartner('partner-1', 'founder-id')).rejects.toThrow('already been invited');
    expect(inviteUserByEmailMock).not.toHaveBeenCalled();
  });

  it('refuses to run if the service-role key is not configured, rather than silently skip', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    findUniqueOrThrowMock.mockResolvedValue({ id: 'partner-1', authUserId: null, contactEmail: 'x@example.com' });
    await expect(invitePartner('partner-1', 'founder-id')).rejects.toThrow(PartnerInviteError);
  });

  it('never surfaces the underlying Supabase error directly', async () => {
    findUniqueOrThrowMock.mockResolvedValue({ id: 'partner-1', authUserId: null, contactEmail: 'x@example.com' });
    inviteUserByEmailMock.mockResolvedValue({ data: { user: null }, error: { message: 'some internal Supabase detail' } });

    await expect(invitePartner('partner-1', 'founder-id')).rejects.toThrow('Something went wrong');
  });

  it('on success, records authUserId, invitedBy, and invitedAt — auditability of the privileged action', async () => {
    findUniqueOrThrowMock.mockResolvedValue({ id: 'partner-1', authUserId: null, contactEmail: 'partner@example.com' });
    inviteUserByEmailMock.mockResolvedValue({ data: { user: { id: 'new-partner-user-id' } }, error: null });
    updateMock.mockResolvedValue({});

    await invitePartner('partner-1', 'founder-user-id');

    expect(inviteUserByEmailMock).toHaveBeenCalledWith('partner@example.com');
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'partner-1' },
      data: expect.objectContaining({ authUserId: 'new-partner-user-id', invitedBy: 'founder-user-id' }),
    });
  });
});
