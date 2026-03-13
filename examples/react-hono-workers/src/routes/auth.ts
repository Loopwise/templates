/**
 * auth.ts — OAuth routes: /auth/login, /auth/callback, /auth/logout
 *
 * These routes run entirely server-side in the Cloudflare Worker.
 * The client (browser) never sees tokens or the client_secret.
 */

import { Hono } from "hono";
import {
  generatePKCE,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
} from "../lib/oauth.js";
import {
  createSession,
  destroySession,
  getSession,
} from "../lib/session.js";

const auth = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------------------------
// GET /auth/login
// ---------------------------------------------------------------------------
// Kick off the Authorization Code + PKCE flow:
// 1. Generate PKCE params and a random `state` value.
// 2. Store (state → code_verifier) in KV so the callback can look it up.
// 3. Redirect the browser to the Loopwise authorization endpoint.

auth.get("/login", async (c) => {
  const { LOOPWISE_SCHOOL_DOMAIN, LOOPWISE_CLIENT_ID, APP_BASE_URL, SESSIONS } =
    c.env;

  const { codeVerifier, codeChallenge, state } = await generatePKCE();
  const redirectUri = `${APP_BASE_URL}/auth/callback`;

  // Store the code_verifier indexed by state for 10 minutes.
  // The callback must present the same state to retrieve it.
  await SESSIONS.put(`pkce:${state}`, codeVerifier, { expirationTtl: 600 });

  const authUrl = buildAuthorizationUrl(
    LOOPWISE_SCHOOL_DOMAIN,
    LOOPWISE_CLIENT_ID,
    redirectUri,
    codeChallenge,
    state,
  );

  return c.redirect(authUrl, 302);
});

// ---------------------------------------------------------------------------
// GET /auth/callback
// ---------------------------------------------------------------------------
// Handle the redirect back from the authorization server:
// 1. Validate the `state` parameter (CSRF check).
// 2. Retrieve the code_verifier from KV using the state.
// 3. Exchange the authorization code for tokens.
// 4. Create a server-side session in KV, set a session cookie.
// 5. Redirect to the app dashboard.

auth.get("/callback", async (c) => {
  const {
    LOOPWISE_SCHOOL_DOMAIN,
    LOOPWISE_CLIENT_ID,
    LOOPWISE_CLIENT_SECRET,
    APP_BASE_URL,
    SESSION_SECRET,
    SESSIONS,
  } = c.env;

  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // The authorization server may return an error (e.g. user denied access).
  if (errorParam) {
    const description = url.searchParams.get("error_description") ?? errorParam;
    return c.redirect(`/?error=${encodeURIComponent(description)}`, 302);
  }

  if (!code || !state) {
    return c.redirect("/?error=missing_code_or_state", 302);
  }

  // Retrieve and immediately delete the code_verifier (one-time use).
  const codeVerifier = await SESSIONS.get(`pkce:${state}`);
  if (!codeVerifier) {
    // State is unknown or already used — possible CSRF attempt.
    return c.redirect("/?error=invalid_state", 302);
  }
  await SESSIONS.delete(`pkce:${state}`);

  try {
    const redirectUri = `${APP_BASE_URL}/auth/callback`;
    const tokens = await exchangeCodeForTokens(
      LOOPWISE_SCHOOL_DOMAIN,
      LOOPWISE_CLIENT_ID,
      LOOPWISE_CLIENT_SECRET,
      redirectUri,
      code,
      codeVerifier,
    );

    // Determine whether we're running over HTTPS (to set Secure cookie flag).
    const isSecure = new URL(c.req.url).protocol === "https:";

    const setCookie = await createSession(SESSIONS, SESSION_SECRET, tokens, isSecure);

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/dashboard",
        "Set-Cookie": setCookie,
      },
    });
  } catch (err) {
    console.error("Token exchange error:", err);
    return c.redirect("/?error=token_exchange_failed", 302);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------
// Destroy the server-side session and clear the browser cookie.

auth.post("/logout", async (c) => {
  const { SESSION_SECRET, SESSIONS } = c.env;
  const cookieHeader = c.req.header("cookie") ?? null;
  const clearCookie = await destroySession(SESSIONS, SESSION_SECRET, cookieHeader);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearCookie,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /auth/status (lightweight session check for the SPA)
// ---------------------------------------------------------------------------
// Returns { authenticated: true/false } without proxying to Loopwise.
// The React app calls this on mount to decide which page to render.

auth.get("/status", async (c) => {
  const { SESSION_SECRET, SESSIONS } = c.env;
  const cookieHeader = c.req.header("cookie") ?? null;
  const result = await getSession(SESSIONS, SESSION_SECRET, cookieHeader);

  return c.json({ authenticated: result !== null });
});

export default auth;
