import { describe, expect, it } from 'vitest';
import { PUBLIC_ROUTES } from '@/lib/ui/publicRoutes';

describe('PUBLIC_ROUTES', () => {
  it('Sign in points to /login', () => {
    expect(PUBLIC_ROUTES.signIn).toBe('/login');
  });

  it('Get started points to /signup', () => {
    expect(PUBLIC_ROUTES.getStarted).toBe('/signup');
  });

  it('home points to /', () => {
    expect(PUBLIC_ROUTES.home).toBe('/');
  });
});
