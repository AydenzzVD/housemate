import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Next.js Middleware — Auth Session Refresh, Route Protection & Onboarding Guard
 *
 * Routing logic:
 * 1. Unauthenticated users → /login (unless on /login or /register)
 * 2. Authenticated users on /login or /register → /dashboard
 * 3. Authenticated users WITHOUT a house → /onboarding (if visiting protected routes)
 * 4. Authenticated users WITH a house → block /onboarding (redirect to /dashboard)
 */
export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // Skip middleware for static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return supabaseResponse;
  }

  try {
    // Always refresh the session (keeps auth token alive)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAuthRoute = pathname === '/login' || pathname === '/register';
    const isOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
    const isProtectedRoute = !isAuthRoute && !isOnboardingRoute && pathname !== '/';

    // — RULE 1: Unauthenticated → force to /login
    if (!user && (isProtectedRoute || isOnboardingRoute)) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // — RULE 2: Authenticated + visiting /login or /register → /dashboard
    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    if (user) {
      // Check house membership: first try the fast cookie, then fallback to DB
      const hasCookie = request.cookies.get('hm_has_house')?.value === '1';
      let hasHouse = hasCookie;

      if (!hasCookie) {
        // Fallback: query DB (this only happens when cookie is absent, e.g. first login)
        const { data: membership } = await supabase
          .from('house_members')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        hasHouse = !!membership;

        // If they have a house but no cookie, set the cookie so future requests are fast
        if (hasHouse) {
          const response = NextResponse.redirect(request.nextUrl);
          response.cookies.set('hm_has_house', '1', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30,
            path: '/',
          });
          // Re-process by redirecting to same URL (with cookie now set)
          // Just let it fall through with the hasHouse value we computed
        }
      }

      // — RULE 3: Authenticated + has house + visiting /onboarding → /dashboard
      if (hasHouse && isOnboardingRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }

      // — RULE 4: Authenticated + NO house + visiting protected route → /onboarding
      if (!hasHouse && isProtectedRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      }
    }
  } catch (err) {
    console.warn('Middleware error:', err?.message ?? err);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
