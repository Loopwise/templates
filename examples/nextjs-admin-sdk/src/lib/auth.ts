/**
 * Better Auth instance, configured with the Loopwise OAuth plugin.
 *
 * `LOOPWISE_CLIENT_ID` / `LOOPWISE_CLIENT_SECRET` are intentionally
 * optional at boot — the README's first step is "start the dev server,
 * read the printed redirect URI, create the OAuth client, fill .env,
 * restart". The server must be able to boot without credentials in
 * order to print the URI in the first place. The Loopwise plugin is
 * only registered once both creds are present; until then sign-in
 * returns 404 (which the landing page surfaces clearly).
 */

import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { getLoopwiseRedirectURI, loopwise } from '@loopwise/admin-sdk/better-auth';
import { prisma } from './db';
import { required } from './env';

const BETTER_AUTH_URL = required('BETTER_AUTH_URL');
const LOOPWISE_BASE_URL = required('LOOPWISE_BASE_URL');

const LOOPWISE_CLIENT_ID = process.env.LOOPWISE_CLIENT_ID;
const LOOPWISE_CLIENT_SECRET = process.env.LOOPWISE_CLIENT_SECRET;

const REDIRECT_URI = getLoopwiseRedirectURI({ baseURL: BETTER_AUTH_URL });
// eslint-disable-next-line no-console -- intentional boot log
console.log(`[loopwise] OAuth redirect URI to register: ${REDIRECT_URI}`);

if (!LOOPWISE_CLIENT_ID || !LOOPWISE_CLIENT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    '[loopwise] LOOPWISE_CLIENT_ID / LOOPWISE_CLIENT_SECRET not set. ' +
      'Sign-in is disabled until both are filled in .env.local and the server restarts.',
  );
}

const loopwisePlugin =
  LOOPWISE_CLIENT_ID && LOOPWISE_CLIENT_SECRET
    ? loopwise({
        clientId: LOOPWISE_CLIENT_ID,
        clientSecret: LOOPWISE_CLIENT_SECRET,
        baseURL: LOOPWISE_BASE_URL,

        // Map the OIDC `sub` claim into our user row at sign-up. With this,
        // querying `user.teachifyUserId` directly returns the Loopwise user
        // id — no need to join the `account` table after the fact.
        mapProfileToUser: (profile) => ({
          teachifyUserId: profile.sub as string,
        }),

        // Default scopes are `openid profile email` — enough for SSO.
        // Uncomment and enable the matching scopes on your OAuth client
        // to call admin GraphQL via the SDK:
        //
        // scopes: ['openid', 'profile', 'email', 'courses:read', 'members:read'],
      })
    : null;

const plugins: NonNullable<BetterAuthOptions['plugins']> = loopwisePlugin
  ? [loopwisePlugin]
  : [];

export const auth = betterAuth({
  baseURL: BETTER_AUTH_URL,
  secret: required('BETTER_AUTH_SECRET'),
  database: prismaAdapter(prisma, { provider: 'sqlite' }),

  // Declare the custom column we'll populate from the OAuth profile.
  // Prisma schema must include the matching `teachifyUserId String?` field.
  user: {
    additionalFields: {
      teachifyUserId: { type: 'string', required: false },
    },
  },

  plugins,
});
