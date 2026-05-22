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

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL!; // e.g. http://localhost:3000

// Log the redirect URI you need to register on the OAuth client.
// Note the `/oauth2/` segment — that's specific to better-auth's
// generic-oauth plugin (different from many OAuth tutorial defaults).
console.log(
  `[loopwise] Register this redirect URI on the OAuth client:`,
  getLoopwiseRedirectURI({ baseURL: BETTER_AUTH_URL }),
);

export const auth = betterAuth({
  baseURL: BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: prismaAdapter(new PrismaClient(), { provider: 'sqlite' }),

  plugins: [
    loopwise({
      clientId: process.env.LOOPWISE_CLIENT_ID!,
      clientSecret: process.env.LOOPWISE_CLIENT_SECRET!,
      baseURL: process.env.LOOPWISE_BASE_URL!,   // e.g. https://demo.teachify.tw

      // Default scopes are `openid profile email` (enough for SSO).
      // To call admin GraphQL, add the scopes you need AND enable
      // them on the OAuth client in your school's admin UI.
      // scopes: ['openid', 'profile', 'email', 'courses:read', 'members:read'],
    }),
  ],
});
```

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

### 5. Read admin data

```ts
// somewhere on the server, after the user signs in
import { headers } from 'next/headers';
import { createAdminClient } from '@loopwise/admin-sdk';
import { auth } from '@/lib/auth';

const { accessToken } = await auth.api.getAccessToken({
  body: { providerId: 'loopwise' },
  headers: await headers(),
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
  is `/api/auth/oauth2/callback/loopwise` (note the `oauth2/`
  segment) — easiest way to get this right is to print it via
  `getLoopwiseRedirectURI()` and paste the output.
- **Scope changes don't take effect.** better-auth caches the granted
  scopes on the `account` row. Sign out + sign in again to pick up
  any change to the requested scope set.

## What's next

- Full working app: [`examples/nextjs-admin-sdk`](../examples/nextjs-admin-sdk)
- SDK package on npm: [`@loopwise/admin-sdk`](https://www.npmjs.com/package/@loopwise/admin-sdk)
- OAuth protocol reference: [`docs/oauth-flow.md`](./oauth-flow.md)
- Full developer docs: [docs.loopwise.com](https://docs.loopwise.com/)
