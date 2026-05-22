/**
 * Better Auth catch-all handler. Mounted at `/api/auth/[...all]` so
 * better-auth controls every path under `/api/auth/*` — sign-in,
 * sign-out, OAuth callbacks (`/api/auth/oauth2/callback/loopwise`),
 * session, etc.
 */

import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

export const { GET, POST } = toNextJsHandler(auth.handler);
