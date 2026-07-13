import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isDemoMode } from '@/lib/demo/config';
import { demoAuthClient, type AuthClient } from '@/lib/demo/authStub';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Supabase client for use in Server Components, Route Handlers, and the
 * Executive Orchestrator. Reads the session from cookies — never trusts a
 * client-supplied businessId without verifying it against this session.
 *
 * In Demo Mode, returns `demoAuthClient` instead — a fixed demo user, no
 * network call, no cookies read or written. Every call site (`.auth.getUser()`
 * etc.) is unchanged; see `lib/demo/authStub.ts` for why this is safe to
 * return in place of a real `SupabaseClient`.
 */
export function createClient(): AuthClient {
  if (isDemoMode()) {
    return demoAuthClient;
  }

  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // is refreshing sessions.
          }
        },
      },
    }
  );
}
