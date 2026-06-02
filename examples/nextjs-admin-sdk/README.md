---
name: Next.js Admin SDK Example
description: Sign in with Loopwise + read your school's admin data via @loopwise/admin-sdk
framework: Next.js
---

# Next.js + Admin SDK Example

End-to-end template showing how to use `@loopwise/admin-sdk` from a
Next.js App Router app:

- **Sign in with Loopwise** using [better-auth](https://better-auth.com) +
  the `loopwise()` plugin from `@loopwise/admin-sdk/better-auth`
- **Read admin data** (courses, members) via the SDK's typed resources in
  React Server Components
- **Map OAuth claims** to your own user table at sign-up:
  - `teachifyUserId` ← OAuth `sub`
  - `schoolId` ← OAuth `org_id` extension claim
  - `role` ← derived from `roles[0]` via a `ROLE_MAP` lookup
    (see [agent-integration guide](https://docs.loopwise.com/guides/agent-integration))

Session + accounts are stored in SQLite via Prisma. The access token
lives server-side; the browser never sees it.

## Quick start

**1. Install dependencies**

```bash
pnpm install
```

**2. Copy env file**

```bash
cp .env.example .env.local
```

Leave `LOOPWISE_CLIENT_ID` and `LOOPWISE_CLIENT_SECRET` empty for now;
fill `LOOPWISE_BASE_URL` with your school's URL
(e.g. `https://demo.teachify.tw`) and generate `BETTER_AUTH_SECRET`:

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
```

**3. Bootstrap the database**

```bash
pnpm db:push
```

Creates `dev.db` with the four better-auth tables (user, session,
account, verification) + the `teachifyUserId` / `schoolId` / `role`
additional fields on `user`.

**4. Start the dev server**

```bash
pnpm dev
```

You'll see a line like:

```
[loopwise] OAuth redirect URI to register: http://localhost:3000/api/auth/oauth2/callback/loopwise
```

**Copy that URL** — you'll paste it into the OAuth client setup in the
next step. Note the `/oauth2/callback/` segment; this is genuinely the
correct path (different from many OAuth tutorial templates).

**5. Create the OAuth client in your Loopwise school**

In a new tab, sign in to your school's admin UI and create an OAuth
application at:

```
https://<your-school>/oauth/applications/new
```

Set:

| Field | Value |
|---|---|
| Name | `nextjs-admin-sdk-example` (or anything you like) |
| Redirect URI | the URL the server printed in step 4 |
| Scopes | check `openid`, `profile`, `email` (minimum for SSO) |

For admin API access (`courses.list`, `members.list`), additionally
check `courses:read` and `members:read`.

Copy the issued `client_id` and `client_secret` into `.env.local`:

```bash
LOOPWISE_CLIENT_ID=...
LOOPWISE_CLIENT_SECRET=...
```

**6. Restart `pnpm dev`**, click "Sign in with Loopwise" → consent → land
back on the home page authenticated.

## What's where

```
src/
├── lib/
│   ├── auth.ts          ← betterAuth({ plugins: [loopwise(...)] })
│   └── admin.ts         ← getAdminClient(headers) factory
├── middleware.ts        ← protects /dashboard/*
└── app/
    ├── page.tsx                       ← landing + sign-in button
    ├── api/auth/[...all]/route.ts     ← better-auth catch-all
    └── dashboard/
        ├── page.tsx                   ← signed-in landing
        ├── courses/page.tsx           ← admin.courses.list() demo
        └── members/page.tsx           ← admin.members.list() demo
```

## Calling admin GraphQL

The SDK's typed surface covers `courses` and `members` today. For
anything else, drop down to `admin.graphql()`:

```ts
import { headers } from 'next/headers';
import { getAdminClient } from '@/lib/admin';

const admin = await getAdminClient(await headers());
if (!admin) redirect('/');

// Typed resource:
const { courses } = await admin.courses.list({ perPage: 20 });

// Raw escape hatch — fully typed via the generic:
const data = await admin.graphql<{ courses: { id: string; name: string }[] }>({
  query: `{ courses(perPage: 20) { id name } }`,
});
```

## Common gotchas

See the [Admin SDK quickstart's gotchas section](../../docs/admin-sdk-quickstart.md#common-gotchas)
for `invalid_scope`, `redirect_uri_mismatch`, and scope-cache pitfalls
that apply to every integration (not just this template).

## Production notes

- Swap SQLite for Postgres / MySQL by updating `prisma/schema.prisma`'s
  `datasource` and re-running `pnpm db:push`.
- Set `BETTER_AUTH_URL` to your production URL (e.g. `https://app.example.com`)
  before deploying — better-auth uses it to compute callback URLs.
- Re-register the production redirect URI on the OAuth client (you can
  add multiple URIs to one client).

## Further reading

- [`@loopwise/admin-sdk` README](https://www.npmjs.com/package/@loopwise/admin-sdk)
- [Better Auth docs](https://www.better-auth.com)
- OAuth flow reference: [`../../docs/oauth-flow.md`](../../docs/oauth-flow.md)
