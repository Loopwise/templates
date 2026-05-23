/**
 * Build a `LoopwiseAdmin` client for the current request, using the
 * signed-in user's OAuth access token. Token refresh is handled by
 * better-auth's `getAccessToken` API — the SDK never sees an expired
 * token under normal operation.
 *
 * Usage in a server component:
 *
 *   import { headers } from 'next/headers';
 *   import { getAdminClient } from '@/lib/admin';
 *
 *   const admin = await getAdminClient(await headers());
 *   if (!admin) redirect('/');
 *   const { courses } = await admin.graphql<{...}>({ query: '...' });
 */

import { createAdminClient, type LoopwiseAdmin } from '@loopwise/admin-sdk';
import { auth } from './auth';
import { required } from './env';

const LOOPWISE_BASE_URL = required('LOOPWISE_BASE_URL');

export async function getAdminClient(
  requestHeaders: Headers,
): Promise<LoopwiseAdmin | null> {
  // `getAccessToken` auto-refreshes if the stored token is expired and
  // writes the new token back to the `account` table — so the SDK call
  // below always sees a fresh token.
  let accessToken: string;
  try {
    const result = await auth.api.getAccessToken({
      body: { providerId: 'loopwise' },
      headers: requestHeaders,
    });
    accessToken = result.accessToken;
  } catch {
    // No session, or the user revoked Loopwise on their authorized-apps
    // page. Caller decides whether to redirect to sign-in.
    return null;
  }

  return createAdminClient({
    accessToken,
    baseURL: LOOPWISE_BASE_URL,
    // If the cached token in better-auth's `account` table is missed and
    // upstream returns 401, refresh by going back through better-auth.
    refreshAccessToken: async () => {
      const { accessToken: fresh } = await auth.api.getAccessToken({
        body: { providerId: 'loopwise' },
        headers: requestHeaders,
      });
      return fresh;
    },
  });
}
