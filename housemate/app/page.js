import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Root page — redirects based on auth state.
 * If URL contains `code` (e.g. email confirmation link) → redirect to /auth/callback
 * If logged in → /dashboard (middleware will handle further house check)
 * If not logged in → /login
 */
export default async function RootPage(props) {
  const searchParams = await props?.searchParams;
  const code = searchParams?.code;

  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      redirect('/dashboard');
    } else {
      redirect('/login');
    }
  } catch {
    redirect('/login');
  }
}
