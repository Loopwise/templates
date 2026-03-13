---
name: Minimal OAuth Example
description: ~50-line reference implementation of Loopwise Connect OAuth flow
framework: Node.js
---

# Minimal OAuth Example

A single-file Node.js server (~120 lines including HTML and comments) demonstrating the complete
[OAuth 2.0 Authorization Code + PKCE](../../docs/oauth-flow.md) flow against Loopwise Connect.
No third-party dependencies — only Node.js built-ins.

## How to run

1. Copy the environment file and fill in your credentials:
   ```sh
   cp .env.example .env
   # edit LOOPWISE_SCHOOL_DOMAIN and LOOPWISE_CLIENT_ID
   ```

2. Install dev dependencies and start the server:
   ```sh
   npm install   # or pnpm install
   npm run dev
   ```

3. Open [http://localhost:4000](http://localhost:4000) and click **Login with Loopwise**.

After a successful login the server displays the raw JSON from the `/api/oauth/userinfo` endpoint.

## What the code covers

- PKCE `code_verifier` / `code_challenge` generation using `node:crypto`
- Building the authorization URL with all required parameters
- `state` parameter for CSRF protection (in-memory; use Redis in production)
- Authorization code → token exchange (`POST /api/oauth/token`)
- Fetching the authenticated user's profile (`GET /api/oauth/userinfo`)

For the full protocol reference see [../../docs/oauth-flow.md](../../docs/oauth-flow.md).
