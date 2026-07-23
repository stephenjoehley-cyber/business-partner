import { describe, expect, it } from 'vitest';
import { PUBLIC_PATHS } from '@/middleware';
import { PUBLIC_ROUTES } from '@/lib/ui/publicRoutes';

/**
 * Found live, 23 July 2026: About and Contact were built and deployed
 * without being added to middleware.ts's PUBLIC_PATHS, so every
 * signed-out visitor was silently redirected to /login before either
 * page ever rendered — nothing caught this at the time. This test
 * cross-references the two lists directly, so a future public page
 * added to PUBLIC_ROUTES but forgotten in PUBLIC_PATHS fails loudly
 * here instead of failing silently in production.
 */
describe('middleware PUBLIC_PATHS', () => {
  it('registers every route in PUBLIC_ROUTES that is not the homepage or an authenticated destination', () => {
    // signIn and getStarted route to /login and /signup, already in
    // PUBLIC_PATHS by name; home ('/') is handled by an exact-match
    // check in middleware.ts itself, not this list. Every other public
    // route must appear here explicitly.
    const authOrHomeRoutes: string[] = [PUBLIC_ROUTES.home, PUBLIC_ROUTES.signIn, PUBLIC_ROUTES.getStarted];
    const remainingPublicRoutes = Object.values(PUBLIC_ROUTES).filter((route) => !authOrHomeRoutes.includes(route));

    for (const route of remainingPublicRoutes) {
      expect(PUBLIC_PATHS).toContain(route);
    }
  });

  it('includes /about and /contact specifically', () => {
    expect(PUBLIC_PATHS).toContain('/about');
    expect(PUBLIC_PATHS).toContain('/contact');
  });
});
