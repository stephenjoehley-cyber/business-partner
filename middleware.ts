import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isDemoMode } from '@/lib/demo/config';

const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/forgot-password', '/auth/reset-password'];
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

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
