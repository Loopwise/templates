/**
 * Loopwise Connect OAuth helpers.
 *
 * Covers:
 *   - PKCE code_verifier / code_challenge generation (S256)
 *   - Token refresh utility (called by Auth.js jwt callback)
 */

// ---------------------------------------------------------------------------
// PKCE
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random code_verifier (43–128 chars, URL-safe).
 * https://datatracker.ietf.org/doc/html/rfc7636#section-4.1
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Derive the code_challenge from a code_verifier using SHA-256 (S256 method).
 * https://datatracker.ietf.org/doc/html/rfc7636#section-4.2
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

/** Base64url encoding without padding, as required by RFC 7636. */
function base64UrlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

export interface LoopwiseTokens {
  access_token: string;
  refresh_token: string;
  /** Epoch seconds when the access token expires. */
  expires_at: number;
  school_id: string;
  school_subdomain: string;
  scope: string;
}

/**
 * Exchange a refresh_token for a new access_token.
 *
 * Called from the Auth.js `jwt` callback whenever the access token has expired.
 * Returns null if the refresh fails (e.g. the refresh token itself has expired),
 * which will force the user to re-authenticate.
 */
export async function refreshAccessToken(
  tokens: LoopwiseTokens
): Promise<LoopwiseTokens | null> {
  const schoolDomain = process.env.LOOPWISE_SCHOOL_DOMAIN;
  if (!schoolDomain) {
    throw new Error("LOOPWISE_SCHOOL_DOMAIN is not set");
  }

  const url = `https://${schoolDomain}/api/oauth/token`;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: process.env.LOOPWISE_CLIENT_ID!,
    client_secret: process.env.LOOPWISE_CLIENT_SECRET!,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    console.error(
      "[loopwise] Token refresh failed:",
      response.status,
      await response.text()
    );
    return null;
  }

  const refreshed = await response.json();

  return {
    access_token: refreshed.access_token,
    // The server may rotate the refresh token; fall back to the current one.
    refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
    // Convert expires_in (seconds from now) to an absolute epoch timestamp.
    expires_at: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600),
    school_id: refreshed.school_id ?? tokens.school_id,
    school_subdomain: refreshed.school_subdomain ?? tokens.school_subdomain,
    scope: refreshed.scope ?? tokens.scope,
  };
}
