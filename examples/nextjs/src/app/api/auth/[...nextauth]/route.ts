/**
 * Auth.js route handler.
 *
 * This file mounts Auth.js onto the `/api/auth/*` path, which handles:
 *   - GET  /api/auth/signin        — render the built-in sign-in page
 *   - GET  /api/auth/signout       — render the built-in sign-out page
 *   - GET  /api/auth/callback/loopwise — receive the OAuth callback
 *   - GET  /api/auth/session       — return the current session as JSON
 *   - POST /api/auth/signin        — initiate sign-in (server action)
 *   - POST /api/auth/signout       — initiate sign-out (server action)
 *
 * No custom logic is needed here — the provider and callbacks are all
 * configured in `src/auth.ts`.
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
