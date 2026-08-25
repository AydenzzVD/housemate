/**
 * app/api/house/set-cookie/route.js
 *
 * Sets or clears the hm_has_house HTTP-only cookie.
 * Called by onboarding pages after a successful create/join house action.
 * The cookie is used by middleware to avoid a DB query on every request.
 */
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { action } = await request.json().catch(() => ({ action: 'set' }));

  const response = NextResponse.json({ ok: true });

  if (action === 'clear') {
    response.cookies.set('hm_has_house', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
  } else {
    response.cookies.set('hm_has_house', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
  }

  return response;
}
