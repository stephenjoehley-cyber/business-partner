import { describe, expect, it } from 'vitest';
import { demoAuthClient } from '@/lib/demo/authStub';
import { DEMO_OWNER_EMAIL, DEMO_OWNER_ID } from '@/lib/demo/config';

describe('demoAuthClient', () => {
  it('getUser always resolves to the fixed demo owner', async () => {
    const { data, error } = await demoAuthClient.auth.getUser();
    expect(error).toBeNull();
    expect(data.user).toEqual({ id: DEMO_OWNER_ID, email: DEMO_OWNER_EMAIL });
  });

  it('signOut resolves without error (no real session to end)', async () => {
    const { error } = await demoAuthClient.auth.signOut();
    expect(error).toBeNull();
  });

  it('signInWithPassword succeeds regardless of credentials — there is no real account to protect in Demo Mode', async () => {
    const { error } = await demoAuthClient.auth.signInWithPassword({ email: 'anyone@example.com', password: 'anything' });
    expect(error).toBeNull();
  });

  it('signUp succeeds regardless of credentials', async () => {
    const { error } = await demoAuthClient.auth.signUp({ email: 'anyone@example.com', password: 'anything' });
    expect(error).toBeNull();
  });

  it('exchangeCodeForSession resolves without error', async () => {
    const { error } = await demoAuthClient.auth.exchangeCodeForSession('any-code');
    expect(error).toBeNull();
  });

  it('setSession resolves without error', async () => {
    const { error } = await demoAuthClient.auth.setSession({
      access_token: 'any-token',
      refresh_token: 'any-refresh-token',
    });
    expect(error).toBeNull();
  });

  it('getSession resolves with a null session (Demo Mode has no real session to report)', async () => {
    const { data, error } = await demoAuthClient.auth.getSession();
    expect(error).toBeNull();
    expect(data.session).toBeNull();
  });
});
