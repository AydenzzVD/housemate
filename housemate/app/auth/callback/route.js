import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Auth Callback Route Handler
 *
 * Handles email confirmation, magic links, and OAuth callbacks from Supabase.
 * Exchanges the URL `code` parameter for an active user session cookie.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardUrl = `${origin}${next}`;
      return NextResponse.redirect(forwardUrl);
    }
  }

  // Return user to login with error if verification failed
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
