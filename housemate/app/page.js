import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Root page — redirects based on auth state.
 * If logged in → /dashboard (middleware will handle further house check)
 * If not logged in → /login
 */
export default async function RootPage() {
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
