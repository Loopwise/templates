---
name: React + Hono + Workers OAuth Example
description: Edge-first OAuth integration with Hono.js BFF on Cloudflare Workers
framework: React, Hono.js, Cloudflare Workers
---

# React + Hono.js + Cloudflare Workers — Loopwise Connect OAuth Example

A production-ready reference implementation of the Loopwise Connect OAuth 2.0 flow using:

- **Hono.js** as the server framework (runs on Cloudflare Workers at the edge)
- **React 19 + Vite** for the SPA frontend
- **Cloudflare KV** for server-side session storage
- **PKCE** (Proof Key for Code Exchange) for secure Authorization Code flow

## Architecture

This example follows the **BFF (Backend-for-Frontend)** pattern. The Cloudflare Worker acts as a thin server layer that handles all OAuth logic — the browser only ever holds a signed, `HttpOnly` session cookie. Tokens, secrets, and `client_secret` never reach the browser.

```
Browser                Worker (Hono)               Loopwise
  │                        │                           │
  │── GET /auth/login ──>  │                           │
  │                        │── redirect ────────────>  │
  │<── 302 ─────────────── │    /oauth/authorize        │
  │                        │                           │
  │   (user approves)      │                           │
  │                        │<── ?code=... ────────────  │
  │<── GET /auth/callback ─│                           │
  │                        │── POST /api/oauth/token > │
  │                        │<── { access_token, ... } ─│
  │<── 302 /dashboard ─────│                           │
  │   (session cookie set) │                           │
  │                        │                           │
  │── GET /api/me ───────> │── GET /api/oauth/userinfo>│
  │<── { user, school } ── │<── { sub, email, ... } ── │
```

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io) (or npm / yarn)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) with Workers enabled
- A Loopwise school with OAuth 2.0 credentials issued by Loopwise Connect

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create a KV namespace

```bash
# Create the namespace (do this once)
npx wrangler kv namespace create SESSIONS

# For local dev, create a preview namespace
npx wrangler kv namespace create SESSIONS --preview
```

Copy the `id` (and `preview_id`) values into `wrangler.toml`.

### 3. Configure secrets

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and fill in your values:

| Variable | Description |
|---|---|
| `LOOPWISE_SCHOOL_DOMAIN` | Full URL of your school, e.g. `https://yourschool.myteachify.com` |
| `LOOPWISE_CLIENT_ID` | OAuth client ID from Loopwise Connect |
| `LOOPWISE_CLIENT_SECRET` | OAuth client secret from Loopwise Connect |
| `SESSION_SECRET` | Random 32-byte hex string (run `openssl rand -hex 32`) |
| `APP_BASE_URL` | Public URL of this Worker, e.g. `http://localhost:8787` |

### 4. Register the redirect URI

In your Loopwise Connect application settings, add the following redirect URI:

```
http://localhost:8787/auth/callback
```

In production, replace `http://localhost:8787` with your actual Worker URL.

### 5. Run locally

```bash
# Build the React app, then start the Wrangler dev server
pnpm dev
```

Open [http://localhost:8787](http://localhost:8787) in your browser.

The Wrangler dev server:
- Serves Hono API routes from the Worker
- Serves the built React SPA from the `dist/client/` directory
- Binds to the real (preview) KV namespace so session storage works

### 6. Deploy to Cloudflare

```bash
# Build and deploy
pnpm deploy
```

Then set your production secrets:

```bash
npx wrangler secret put LOOPWISE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
npx wrangler secret put LOOPWISE_SCHOOL_DOMAIN
npx wrangler secret put LOOPWISE_CLIENT_ID
npx wrangler secret put APP_BASE_URL
```

## Project Structure

```
src/
  index.tsx              # Hono entry — mounts routes, exports Worker handler
  routes/
    auth.ts              # /auth/login, /auth/callback, /auth/logout, /auth/status
    api.ts               # /api/me — proxy to Loopwise userinfo
  lib/
    oauth.ts             # PKCE helpers, token exchange, refresh, userinfo fetch
    session.ts           # KV-backed session management, cookie signing
  client/
    index.html           # SPA shell
    main.tsx             # React entry point
    App.tsx              # Root component, auth state, routing
    pages/
      Home.tsx           # Landing page (login button or authenticated state)
      Dashboard.tsx      # Protected page — shows profile and school info
    style.css            # Plain CSS styles (no framework)
worker-configuration.d.ts   # TypeScript types for CF Workers environment bindings
wrangler.toml               # Worker configuration (KV binding, assets)
vite.config.ts              # Vite config (builds SPA to dist/client/)
```

## OAuth Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `{school_domain}/oauth/authorize` | GET | Authorization redirect |
| `{school_domain}/api/oauth/token` | POST | Token exchange and refresh |
| `{school_domain}/api/oauth/userinfo` | GET | Fetch user profile |

## Token Response Fields

In addition to the standard OAuth 2.0 fields, the Loopwise token response includes:

| Field | Type | Description |
|---|---|---|
| `school_id` | string | Unique identifier of the school |
| `school_subdomain` | string | School's subdomain on Loopwise |
| `access_token` | string | Short-lived access token |
| `refresh_token` | string | Long-lived refresh token |
| `expires_in` | number | Access token lifetime in seconds |
| `scope` | string | Granted scopes |

## Security Notes

- The `client_secret` is only used inside the Worker and is never sent to the browser.
- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` (in production).
- Session cookies are HMAC-SHA256 signed to prevent tampering.
- PKCE `code_verifier` values are stored in KV with a 10-minute TTL and deleted immediately after use.
- Access tokens are stored only in KV; the browser holds only a session ID.
- Expired access tokens are refreshed transparently in `/api/me`.

## License

MIT
