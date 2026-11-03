# `@loopwise/admin-sdk` Quickstart

Read your Loopwise school's admin data (courses, members, orders…)
from your own app, with full OAuth + token refresh handled for you.

This is the 5-minute version. For a working app you can `git clone` +
`pnpm install`, jump straight to [`examples/nextjs-admin-sdk`](../examples/nextjs-admin-sdk).

---

## When to use this vs the OAuth-only templates

| You want to… | Use |
|---|---|
| Let your users sign in with their Loopwise account (and that's it) | [`examples/nextjs`](../examples/nextjs) |
| …and read/write data from their school (courses, members, …) | **Admin SDK** (this doc + [`examples/nextjs-admin-sdk`](../examples/nextjs-admin-sdk)) |

The admin SDK is built **on top of** the same OAuth flow shown in the
SSO templates. The difference is: it ships typed accessors for the
admin GraphQL surface (`admin.courses.list()`, `admin.members.list()`)
and a thin [better-auth](https://better-auth.com) plugin that wires
PKCE + refresh + audience routing for you.

## The 5-minute setup

### 1. Create an OAuth client in your Loopwise school

Sign in to your school admin and open
`https://<your-school>/oauth/applications/new`. Fill:

| Field | Value |
|---|---|
| Name | anything that identifies your app |
| Redirect URI | the URL the SDK helper prints at server boot (see step 3) |
| Scopes | `openid`, `profile`, `email` for SSO; add `courses:read`, `members:read`, etc. for admin API access |

Note both the `client_id` and `client_secret` — you'll paste them into
your app's env in step 4.

### 2. Install

```bash
pnpm add @loopwise/admin-sdk better-auth
```

(or `npm` / `yarn` / `bun` equivalent)

`@loopwise/admin-sdk` 0.1.0-beta.5 requires `better-auth` 1.7.7 or
later. Earlier versions are affected by
[GHSA-965c-763c-88jm](https://github.com/better-auth/better-auth/security/advisories/GHSA-965c-763c-88jm).

You'll also need a database for better-auth's session store —
Prisma + SQLite is the easiest starting point; see the [Next.js example](../examples/nextjs-admin-sdk)
for a working `schema.prisma`.

### 3. Configure better-auth + Loopwise

```ts
// lib/auth.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { getLoopwiseRedirectURI, loopwise } from '@loopwise/admin-sdk/better-auth';
import { PrismaClient } from '@prisma/client';

// Throw a clear, actionable error if a required env var is missing —
// preferable to `process.env.X!` blowing up later with a cryptic
// `Cannot read properties of undefined` inside better-auth.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

const BETTER_AUTH_URL = required('BETTER_AUTH_URL'); // e.g. http://localhost:3000

// Log the redirect URI you need to register on the OAuth client:
// <BETTER_AUTH_URL>/api/auth/callback/loopwise
console.log(
  `[loopwise] Register this redirect URI on the OAuth client:`,
  getLoopwiseRedirectURI({ baseURL: BETTER_AUTH_URL }),
);

export const auth = betterAuth({
  baseURL: BETTER_AUTH_URL,
  secret: required('BETTER_AUTH_SECRET'),
  database: prismaAdapter(new PrismaClient(), { provider: 'sqlite' }),

  plugins: [
    loopwise({
      clientId: required('LOOPWISE_CLIENT_ID'),
      clientSecret: required('LOOPWISE_CLIENT_SECRET'),
      baseURL: required('LOOPWISE_BASE_URL'),   // e.g. https://demo.teachify.tw

      // Default scopes are `openid profile email` (enough for SSO).
      // To call admin GraphQL, add the scopes you need AND enable
      // them on the OAuth client in your school's admin UI.
      // scopes: ['openid', 'profile', 'email', 'courses:read', 'members:read'],
    }),
  ],
});
```

> The full template at [`examples/nextjs-admin-sdk`](../examples/nextjs-admin-sdk)
> takes this one step further: it makes `LOOPWISE_CLIENT_ID` /
> `LOOPWISE_CLIENT_SECRET` optional at boot so the dev server can start
> and print the redirect URI before the OAuth client exists. For a
> single-file quickstart, requiring them up front is clearer.

### 4. Fill your `.env`

```bash
# from step 1
LOOPWISE_CLIENT_ID=...
LOOPWISE_CLIENT_SECRET=...

# your school's URL
LOOPWISE_BASE_URL=https://demo.teachify.tw

# this app's public URL
BETTER_AUTH_URL=http://localhost:3000

# session-cookie signing secret
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
```

Then start your dev server. The boot log prints the redirect URI;
copy that URL into the OAuth client's "Redirect URI" field if you
hadn't already.

### 5. Sign in

The Loopwise provider is a regular better-auth social provider, so the
browser starts the flow with `signIn.social`:

```ts
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();

// in a client component's click handler
await authClient.signIn.social({ provider: 'loopwise', callbackURL: '/dashboard' });
```

### 6. Read admin data

```ts
// somewhere on the server, after the user signs in
import { headers } from 'next/headers';
import { createAdminClient } from '@loopwise/admin-sdk';
import { auth } from '@/lib/auth';

const requestHeaders = await headers();

// getAccessToken selects the account by its better-auth row id.
const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
const loopwiseAccount = accounts.find((a) => a.providerId === 'loopwise');
if (!loopwiseAccount) throw new Error('Not signed in with Loopwise');

const { accessToken } = await auth.api.getAccessToken({
  body: { accountId: loopwiseAccount.id },
  headers: requestHeaders,
});

const admin = createAdminClient({ accessToken, baseURL: process.env.LOOPWISE_BASE_URL! });

// Typed resource:
const { nodes: courses } = await admin.courses.list({ perPage: 20 });

// Anything not yet typed — drop to the raw GraphQL escape hatch:
const data = await admin.graphql<{ events: { id: string; title: string }[] }>({
  query: `{ events(perPage: 10) { id title } }`,
});
```

`auth.api.getAccessToken({...})` automatically refreshes the token if
better-auth's stored copy has expired. The access token never reaches
the browser.

---

## Common gotchas

- **`error=invalid_scope` on first sign-in.** Your OAuth client doesn't
  have all the scopes the plugin is requesting enabled. Either reduce
  the `scopes` array to match what's enabled, or enable the missing
  scopes in your school's admin UI and try again.
- **`redirect_uri_mismatch`.** The redirect URI registered on the OAuth
  client doesn't exactly match what the server is sending. The path
  is `/api/auth/callback/loopwise` — easiest way to get this right is
  to print it via `getLoopwiseRedirectURI()` and paste the output.
- **Sign-in broke after upgrading to better-auth 1.7.** Before 1.7 the
  callback was `/api/auth/oauth2/callback/loopwise`. A redirect URI
  registered with that path must be re-registered with the new one on
  every OAuth client (and every environment) you use; remove the old
  URI once the upgrade is live. Also replace `signIn.oauth2(...)` with
  `signIn.social({ provider: 'loopwise' })` and pass `accountId` (not
  `providerId`) to `getAccessToken`.
- **Scope changes don't take effect.** better-auth caches the granted
  scopes on the `account` row. Sign out + sign in again to pick up
  any change to the requested scope set.

## What's next

- Full working app: [`examples/nextjs-admin-sdk`](../examples/nextjs-admin-sdk)
- SDK package on npm: [`@loopwise/admin-sdk`](https://www.npmjs.com/package/@loopwise/admin-sdk)
- OAuth protocol reference: [`docs/oauth-flow.md`](./oauth-flow.md)
- Full developer docs: [docs.loopwise.com](https://docs.loopwise.com/)
