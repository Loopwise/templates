---
name: Next.js OAuth Example
description: Integrate Loopwise Connect OAuth with Next.js App Router and Auth.js
framework: Next.js
---

# Next.js OAuth Example

A minimal reference implementation that shows how to add Loopwise Connect
single sign-on to a Next.js 15 App Router application using
[Auth.js](https://authjs.dev) (next-auth v5).

Features demonstrated:

- Authorization Code flow with **PKCE** (S256), handled automatically by Auth.js
- Custom Loopwise OAuth provider with per-school domain configuration
- Automatic **access token refresh** without user interaction
- Server-side session — the access token is never sent to the browser
- Protected routes via Next.js middleware

## Quick Start

**1. Clone and install dependencies**

```bash
git clone https://github.com/loopwise/connect-examples
cd connect-examples/examples/nextjs
pnpm install
```

**2. Copy the environment file**

```bash
cp .env.example .env.local
```

**3. Fill in your credentials**

Open `.env.local` and set:

| Variable | Where to find it |
|---|---|
| `LOOPWISE_SCHOOL_DOMAIN` | Your school's domain, e.g. `demo.teachify.tw` |
| `LOOPWISE_CLIENT_ID` | Loopwise Connect developer portal |
| `LOOPWISE_CLIENT_SECRET` | Loopwise Connect developer portal |
| `AUTH_SECRET` | Run `openssl rand -base64 32` to generate |
| `AUTH_URL` | `http://localhost:3000` for local development |

**4. Register the redirect URI**

In the Loopwise Connect developer portal, add the following **Redirect URI**
for your OAuth application:

```
http://localhost:3000/api/auth/callback/loopwise
```

**5. Start the development server**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Sign in with
Loopwise** and authenticate with your school account.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `LOOPWISE_SCHOOL_DOMAIN` | Yes | School domain without `https://`, e.g. `demo.teachify.tw` |
| `LOOPWISE_CLIENT_ID` | Yes | OAuth client ID from the developer portal |
| `LOOPWISE_CLIENT_SECRET` | Yes | OAuth client secret from the developer portal |
| `AUTH_SECRET` | Yes | Random secret used to encrypt the session cookie |
| `AUTH_URL` | Yes | The public base URL of this application |

## Project Structure

```
src/
  auth.ts            # Auth.js config: custom Loopwise provider + JWT callbacks
  middleware.ts      # Protects /dashboard, redirects unauthenticated users
  lib/
    loopwise.ts      # PKCE helpers and token refresh utility
  app/
    page.tsx         # Landing page — shows user + school info when signed in
    dashboard/
      page.tsx       # Protected page — fetches fresh profile from UserInfo API
    api/auth/
      [...nextauth]/
        route.ts     # Mounts Auth.js onto /api/auth/*
```

## OAuth Flow

For the complete OAuth 2.0 specification and endpoint reference, see
[../../docs/oauth-flow.md](../../docs/oauth-flow.md).

The high-level sequence for this example:

1. User clicks **Sign in** — Next.js server action calls `signIn("loopwise")`.
2. Auth.js generates a PKCE `code_verifier`, stores it in a cookie, and
   redirects to `https://{school-domain}/oauth/authorize`.
3. The user authenticates on Loopwise and approves the requested scopes.
4. Loopwise redirects back to `/api/auth/callback/loopwise` with an
   authorization `code`.
5. Auth.js exchanges the code (plus `code_verifier`) for tokens via
   `POST /api/oauth/token`.
6. Auth.js fetches the user profile via `GET /api/oauth/userinfo` and
   stores everything in an encrypted cookie.
7. The user lands on `/` — the session is read server-side and user info
   is rendered without any client-side API calls.
