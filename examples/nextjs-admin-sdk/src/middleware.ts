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
    // Preserve query string so a deep-link with filters/pagination
    // (e.g. /dashboard/members?role=teaching_assistant&page=2) survives
    // the sign-in detour. Hash fragments aren't recoverable here —
    // browsers don't send them to the server, so they're lost regardless.
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
