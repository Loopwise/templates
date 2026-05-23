/**
 * Better Auth instance, configured with the Loopwise OAuth plugin.
 *
 * The `loopwise()` factory from `@loopwise/admin-sdk/better-auth` is a thin
 * branded wrapper around better-auth's `genericOAuth` plugin — it pre-fills
 * Doorkeeper discovery, PKCE, refresh-token request, and per-audience
 * provider ids. You supply credentials + the school URL.
 *
 * On boot we log the redirect URI to register on the OAuth client. Paste
 * the printed string into your OAuth application's "Redirect URI" field;
 * note the `/oauth2/callback/` segment (different from many OAuth
 * tutorials).
 */

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { getLoopwiseRedirectURI, loopwise } from '@loopwise/admin-sdk/better-auth';
import { PrismaClient } from '@prisma/client';
import { required } from './env';

const prisma = new PrismaClient();

const BETTER_AUTH_URL = required('BETTER_AUTH_URL');
const LOOPWISE_CLIENT_ID = required('LOOPWISE_CLIENT_ID');
const LOOPWISE_CLIENT_SECRET = required('LOOPWISE_CLIENT_SECRET');
const LOOPWISE_BASE_URL = required('LOOPWISE_BASE_URL');

// Print at module load so the URI is visible the moment `next dev` boots.
// In production this fires once per server process — useful when
// rotating client credentials, harmless otherwise.
const REDIRECT_URI = getLoopwiseRedirectURI({ baseURL: BETTER_AUTH_URL });
// eslint-disable-next-line no-console -- intentional boot log
console.log(`[loopwise] OAuth redirect URI to register: ${REDIRECT_URI}`);

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

  plugins: [
    loopwise({
      clientId: LOOPWISE_CLIENT_ID,
      clientSecret: LOOPWISE_CLIENT_SECRET,
      baseURL: LOOPWISE_BASE_URL,

      // Map the OIDC `sub` claim into our user row at sign-up. With this,
      // querying `user.teachifyUserId` directly returns the Loopwise user
      // id — no need to join the `account` table after the fact.
      mapProfileToUser: (profile) => ({
        teachifyUserId: profile.sub as string,
      }),

      // Default scopes are `openid profile email` — enough for SSO. Uncomment
      // and enable the matching scopes on your OAuth client to call admin
      // GraphQL via the SDK:
      //
      // scopes: ['openid', 'profile', 'email', 'courses:read', 'members:read'],
    }),
  ],
});
