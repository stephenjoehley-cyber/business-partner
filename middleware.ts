import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isDemoMode } from '@/lib/demo/config';

const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback'];
/** Paths that only make sense with a real account — in Demo Mode there's nothing to sign in to or onboard, so these redirect straight to the one thing Demo Mode is for. */
const DEMO_REDIRECT_PATHS = ['/login', '/signup', '/onboarding'];
type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  if (isDemoMode()) {
    // No Supabase configured — there is nothing to authenticate, so
    // middleware never constructs a Supabase client or touches cookies in
    // this branch at all. Every request is implicitly "signed in" as the
    // one seeded demo owner (see lib/demo/authStub.ts); the only routing
    // job left is keeping the founder out of screens that only make sense
    // with a real account.
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

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
