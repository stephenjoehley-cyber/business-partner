import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    environment: 'node',
    // Demo Mode (lib/demo/config.ts) auto-activates whenever Supabase
    // config is absent — exactly the state a bare `vitest run` would
    // otherwise be in. Pinning these here means the existing repository
    // test suites keep exercising the real Prisma-backed code paths they
    // were written against; tests that specifically want Demo Mode
    // override it per-test with `vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true')`.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
