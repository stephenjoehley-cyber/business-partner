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

  it('about points to /about', () => {
    expect(PUBLIC_ROUTES.about).toBe('/about');
  });

  it('contact points to /contact', () => {
    expect(PUBLIC_ROUTES.contact).toBe('/contact');
  });

  it('trust points to /trust', () => {
    expect(PUBLIC_ROUTES.trust).toBe('/trust');
  });

  it('faq points to /faq', () => {
    expect(PUBLIC_ROUTES.faq).toBe('/faq');
  });
});
