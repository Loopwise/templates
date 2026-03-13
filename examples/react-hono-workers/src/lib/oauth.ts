/**
 * oauth.ts — PKCE helpers, token exchange, and token refresh.
 *
 * All functions run inside the Cloudflare Workers runtime (V8 isolate).
 * We use the Web Crypto API (available globally) instead of Node's crypto.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  // Loopwise-specific fields included in the token response.
  school_id: string;
  school_subdomain: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  name: string;
  role: string;
  school_id: string;
  school_subdomain: string;
  [key: string]: unknown;
}

export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

/** Generate a cryptographically random string of `length` bytes (URL-safe base64). */
function randomBase64url(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  // btoa + URL-safe character substitution
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/** Compute SHA-256 of a string and return the result as URL-safe base64. */
async function sha256Base64url(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Generate PKCE parameters for the authorization request.
 * Returns the code_verifier (kept secret, stored server-side),
 * the code_challenge (sent to the authorization endpoint),
 * and a random `state` value (CSRF protection).
 */
export async function generatePKCE(): Promise<PKCEParams> {
  // RFC 7636 recommends a verifier of 43-128 chars. 32 random bytes → 43 chars.
  const codeVerifier = randomBase64url(32);
  const codeChallenge = await sha256Base64url(codeVerifier);
  const state = randomBase64url(16);

  return { codeVerifier, codeChallenge, state };
}

// ---------------------------------------------------------------------------
// Authorization URL builder
// ---------------------------------------------------------------------------

/**
 * Build the authorization URL that the user is redirected to.
 */
export function buildAuthorizationUrl(
  schoolDomain: string,
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state: string,
  scope = "openid email profile",
): string {
  const url = new URL(`${schoolDomain}/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

/**
 * Exchange an authorization code for access + refresh tokens.
 * Called server-side only — the client_secret never leaves the Worker.
 */
export async function exchangeCodeForTokens(
  schoolDomain: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const response = await fetch(`${schoolDomain}/api/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${body}`);
  }

  return response.json<TokenResponse>();
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

/**
 * Use a refresh_token to obtain a new access_token.
 * Called automatically by the /api/me route when the access token has expired.
 */
export async function refreshAccessToken(
  schoolDomain: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<TokenResponse> {
  const response = await fetch(`${schoolDomain}/api/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${body}`);
  }

  return response.json<TokenResponse>();
}

// ---------------------------------------------------------------------------
// UserInfo fetch
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated user's profile from the Loopwise userinfo endpoint.
 */
export async function fetchUserInfo(
  schoolDomain: string,
  accessToken: string,
): Promise<UserInfo> {
  const response = await fetch(`${schoolDomain}/api/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`UserInfo request failed (${response.status}): ${body}`);
  }

  return response.json<UserInfo>();
}
