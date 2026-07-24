import { describe, expect, it, vi, beforeEach } from 'vitest';

const generateLinkMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { admin: { generateLink: generateLinkMock } },
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
    generateLinkMock.mockReset();
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
    expect(generateLinkMock).not.toHaveBeenCalled();
  });

  it('refuses to run if the service-role key is not configured, rather than silently skip', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    findUniqueOrThrowMock.mockResolvedValue({ id: 'partner-1', authUserId: null, contactEmail: 'x@example.com' });
    await expect(invitePartner('partner-1', 'founder-id')).rejects.toThrow(PartnerInviteError);
  });

  it('never surfaces the underlying Supabase error directly', async () => {
    findUniqueOrThrowMock.mockResolvedValue({ id: 'partner-1', authUserId: null, contactEmail: 'x@example.com' });
    generateLinkMock.mockResolvedValue({ data: { user: null, properties: null }, error: { message: 'some internal Supabase detail' } });

    await expect(invitePartner('partner-1', 'founder-id')).rejects.toThrow('Something went wrong');
  });

  it('fails clearly if generateLink succeeds but returns no hashed_token, rather than construct a broken link', async () => {
    findUniqueOrThrowMock.mockResolvedValue({ id: 'partner-1', authUserId: null, contactEmail: 'x@example.com' });
    generateLinkMock.mockResolvedValue({ data: { user: { id: 'new-user' }, properties: {} }, error: null });

    await expect(invitePartner('partner-1', 'founder-id')).rejects.toThrow(PartnerInviteError);
  });

  it('on success, records authUserId/invitedBy/invitedAt and returns a real, usable invite link', async () => {
    findUniqueOrThrowMock.mockResolvedValue({ id: 'partner-1', authUserId: null, contactEmail: 'partner@example.com' });
    generateLinkMock.mockResolvedValue({
      data: { user: { id: 'new-partner-user-id' }, properties: { hashed_token: 'real-token-hash-value' } },
      error: null,
    });
    updateMock.mockResolvedValue({});

    const result = await invitePartner('partner-1', 'founder-user-id');

    expect(generateLinkMock).toHaveBeenCalledWith({ type: 'invite', email: 'partner@example.com' });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'partner-1' },
      data: expect.objectContaining({ authUserId: 'new-partner-user-id', invitedBy: 'founder-user-id' }),
    });
    expect(result.inviteLink).toContain('token_hash=real-token-hash-value');
    expect(result.inviteLink).toContain('type=invite');
    expect(result.inviteLink).toContain('redirect_to=/partner');
  });
});
