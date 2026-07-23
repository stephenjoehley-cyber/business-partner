import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isDemoMode } from '@/lib/demo/config';

// '/about' and '/contact' added here 23 July 2026 — found live: both
// pages were built and deployed (Production SaaS Completion, Phase 1)
// without being added to this list, so every signed-out visitor was
// redirected straight to /login before either page ever rendered. Any
// future public marketing page needs the same registration here, or it
// will fail exactly the same way — this file's own auth check has no
// way to know a route is "meant to be public" other than this list.
export const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/forgot-password', '/auth/reset-password', '/brand', '/about', '/contact', '/trust', '/faq', '/pricing', '/blog'];
const DEMO_REDIRECT_PATHS = ['/login', '/signup', '/onboarding', '/settings', '/forgot-password', '/auth/reset-password'];
type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  if (isDemoMode()) {
    const { pathname } = request.nextUrl;
    const shouldRedirectToMorningBrief =
      pathname === '/' || DEMO_REDIRECT_PATHS.some((path) => pathname.startsWith(path));

    if (shouldRedirectToMorningBrief) {
      const url = request.nextUrl.clone();
      url.pathname = '/morning-brief';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // '/' is checked as an exact match, not added to PUBLIC_PATHS below —
  // that list is matched with startsWith, and '/' would then match every
  // path in the app, defeating auth protection entirely. The homepage
  // itself (app/page.tsx) already handles showing public content to
  // signed-out visitors and redirecting signed-in ones onward; the
  // middleware just needs to stop intercepting it before that logic runs.
  //
  // '/brand' is in PUBLIC_PATHS (2026-07-18, found live): static assets
  // under public/ are matched by this middleware just like page routes —
  // a request for /brand/business-partner-horizontal.png was being
  // redirected to /login exactly like an unauthenticated page visit
  // would be, and a redirect isn't a valid image response, so the logo
  // silently failed to render anywhere on signed-out pages (homepage,
  // login, signup). Any future public/ asset folder needs the same
  // treatment, or it will fail the same way.
  const isPublicPath =
    request.nextUrl.pathname === '/' || PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  // Public auth pages never need to know whether the visitor is logged in,
  // and — critically for /auth/reset-password — skipping the Supabase call
  // here avoids a session-refresh attempt that could clear a stale cookie
  // and, with it, the PKCE code verifier the reset page still needs to read.
  if (isPublicPath) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Governed Capability Framework / Executive Operating Dashboard, 23
  // July 2026 — this is not a customer-facing surface. An authenticated
  // customer is a genuinely different case from a signed-out visitor,
  // so this checks separately, after the ordinary auth check above:
  // logged in, but not the founder, is redirected to their own real
  // landing page rather than back to /login (which would incorrectly
  // suggest they aren't authenticated at all).
  if (request.nextUrl.pathname.startsWith('/executive') || request.nextUrl.pathname.startsWith('/api/executive')) {
    const founderUserIds = (process.env.FOUNDER_USER_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
    if (!founderUserIds.includes(user.id)) {
      if (request.nextUrl.pathname.startsWith('/api/executive')) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/morning-brief';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
