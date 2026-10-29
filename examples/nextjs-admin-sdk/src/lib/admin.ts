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
  // `getAccessToken` selects the account by better-auth's account row id,
  // not by provider, so look up the user's Loopwise account first.
  let accountId: string;
  let accessToken: string;
  try {
    const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
    const loopwiseAccount = accounts.find((a) => a.providerId === 'loopwise');
    if (!loopwiseAccount) return null;
    accountId = loopwiseAccount.id;

    // Auto-refreshes if the stored token is expired and writes the new
    // token back to the `account` table.
    const result = await auth.api.getAccessToken({
      body: { accountId },
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
        body: { accountId },
        headers: requestHeaders,
      });
      return fresh;
    },
  });
}
