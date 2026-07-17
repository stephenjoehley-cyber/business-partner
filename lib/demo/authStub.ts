import { DEMO_OWNER_EMAIL, DEMO_OWNER_ID } from './config';

/**
 * The exact subset of the Supabase auth client every call site in this
 * app actually uses (`getUser`, `signOut`, `signInWithPassword`, `signUp`,
 * `exchangeCodeForSession`, `setSession`, `getSession`) — grep the codebase and this is the complete
 * list. A real `SupabaseClient` satisfies this interface structurally (it
 * has all of these methods, with compatible signatures), so
 * `lib/supabase/server.ts` / `lib/supabase/client.ts` can return either
 * the real client or `demoAuthClient` below from the same `createClient()`
 * function with no change needed at any call site.
 *
 * 2026-07-15: `getUser()`'s return widened to include `user_metadata`, and
 * `signUp()`'s `options` widened to accept `data` — both needed once
 * Signup started passing `preferredName` through Supabase's existing
 * metadata mechanism (Founder + CPO decision, Personal Greeting).
 *
 * 2026-07-17: `updateUser()`'s attributes widened to also accept `data` —
 * needed once Settings started letting an existing owner set or change
 * Preferred Name retroactively (Decision Backlog Q9), the same
 * `user_metadata` mechanism as signup, just reached from a different
 * screen.
 */
export interface AuthClient {
  auth: {
    getUser(): Promise<{
      data: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null };
      error: unknown;
    }>;
    signOut(): Promise<{ error: unknown }>;
    signInWithPassword(credentials: {
      email: string;
      password: string;
    }): Promise<{ data: unknown; error: { message: string } | null }>;
    signUp(credentials: {
      email: string;
      password: string;
      options?: { emailRedirectTo?: string; data?: Record<string, unknown> };
    }): Promise<{ data: unknown; error: { message: string } | null }>;
    exchangeCodeForSession(code: string): Promise<{ data: unknown; error: unknown }>;
    setSession(session: { access_token: string; refresh_token: string }): Promise<{ data: unknown; error: unknown }>;
    getSession(): Promise<{ data: { session: unknown }; error: unknown }>;
    resetPasswordForEmail(
      email: string,
      options?: { redirectTo?: string }
    ): Promise<{ data: unknown; error: { message: string } | null }>;
    updateUser(attributes: {
      password?: string;
      data?: Record<string, unknown>;
    }): Promise<{ data: unknown; error: { message: string } | null }>;
  };
}

const DEMO_USER = { id: DEMO_OWNER_ID, email: DEMO_OWNER_EMAIL };

/**
 * Every request in Demo Mode is implicitly "signed in" as the one seeded
 * demo owner — there is no real session, no cookie, no network call.
 * `signInWithPassword` / `signUp` / `exchangeCodeForSession` all resolve
 * successfully without checking anything: in Demo Mode, `/login` and
 * `/signup` are unreachable in normal navigation (middleware redirects
 * them straight to `/morning-brief`), so these only run if a founder
 * navigates there directly and submits the form — in which case
 * "succeeding immediately" is the correct, harmless behaviour, not a
 * security concern, since there is no real account to protect.
 */
export const demoAuthClient: AuthClient = {
  auth: {
    async getUser() {
      return { data: { user: DEMO_USER }, error: null };
    },
    async signOut() {
      return { error: null };
    },
    async signInWithPassword() {
      return { data: { user: DEMO_USER, session: null }, error: null };
    },
    async signUp() {
      return { data: { user: DEMO_USER, session: null }, error: null };
    },
    async exchangeCodeForSession() {
      return { data: { session: null }, error: null };
    },
    async setSession() {
      return { data: { session: null }, error: null };
    },
    async getSession() {
      return { data: { session: null }, error: null };
    },
    async resetPasswordForEmail() {
      return { data: {}, error: null };
    },
    async updateUser() {
      return { data: { user: DEMO_USER }, error: null };
    },
  },
};
