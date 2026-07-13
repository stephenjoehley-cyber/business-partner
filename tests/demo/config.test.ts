import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDemoMode } from '@/lib/demo/config';

describe('isDemoMode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is off when Supabase is configured and no override is set (the vitest.config.ts default)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test-project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', undefined);

    expect(isDemoMode()).toBe(false);
  });

  it('auto-activates when Supabase config is entirely absent (the zero-config default)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', undefined);
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', undefined);

    expect(isDemoMode()).toBe(true);
  });

  it('auto-activates when only the anon key is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test-project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', undefined);
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', undefined);

    expect(isDemoMode()).toBe(true);
  });

  it('NEXT_PUBLIC_DEMO_MODE=false forces it off even with Supabase config absent', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', undefined);
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');

    expect(isDemoMode()).toBe(false);
  });

  it('NEXT_PUBLIC_DEMO_MODE=true forces it on even with Supabase fully configured', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test-project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');

    expect(isDemoMode()).toBe(true);
  });
});
