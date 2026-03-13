/**
 * Next.js middleware — protect routes that require authentication.
 *
 * Auth.js exports an `auth` middleware helper that reads the session cookie.
 * Any unauthenticated request to a protected path is redirected to the
 * sign-in page automatically.
 */

import { auth } from "@/auth";

export default auth((req) => {
  // If the user is not signed in, `req.auth` is null.
  // Auth.js will redirect to the sign-in page automatically for protected routes.
  const isAuthenticated = !!req.auth;

  if (!isAuthenticated && req.nextUrl.pathname.startsWith("/dashboard")) {
    const signInUrl = new URL("/api/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(signInUrl);
  }
});

// Only run middleware on these paths (skip static assets and API routes
// that are not related to auth).
export const config = {
  matcher: ["/dashboard/:path*"],
};
