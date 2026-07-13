import { createBrowserClient } from '@supabase/ssr';
import { isDemoMode } from '@/lib/demo/config';
import { demoAuthClient, type AuthClient } from '@/lib/demo/authStub';

/**
 * Supabase client for use in Client Components.
 * Auth only — the Business Brain itself is accessed exclusively through
 * lib/brain (Prisma), never directly from the browser.
 *
 * In Demo Mode, returns `demoAuthClient` instead — see
 * `lib/supabase/server.ts` for the equivalent server-side swap and
 * `lib/demo/authStub.ts` for why every call site is unaffected.
 */
export function createClient(): AuthClient {
  if (isDemoMode()) {
    return demoAuthClient;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
