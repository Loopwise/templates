/**
 * Build a `LoopwiseAdmin` client for the current request, using the
 * signed-in user's OAuth access token. Token refresh is handled by
 * better-auth's `getAccessToken` API — the SDK never sees an expired
 * token under normal operation. Returns `null` if the caller has no
 * Loopwise session (no token to use); callers redirect to `/` then.
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
    // 401 retry path: re-fetch via better-auth (which will refresh if
    // the stored token is now expired).
    refreshAccessToken: async () => {
      const { accessToken: fresh } = await auth.api.getAccessToken({
        body: { providerId: 'loopwise' },
        headers: requestHeaders,
      });
      return fresh;
    },
  });
}
