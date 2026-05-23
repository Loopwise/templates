/**
 * Protect `/dashboard/*` — anything under there needs a Loopwise session.
 * Other routes (landing page, API, static assets) are public.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const url = new URL('/', request.url);
    // Preserve query string + hash so a deep-link with filters/pagination
    // (e.g. /dashboard/members?role=teaching_assistant&page=2) survives the
    // sign-in detour and lands back at the exact same view.
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
