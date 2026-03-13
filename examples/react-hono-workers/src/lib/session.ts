/**
 * session.ts — KV-backed session management.
 *
 * Sessions are stored in Cloudflare KV under the key `session:{sessionId}`.
 * The browser only ever receives a signed, httpOnly session cookie containing
 * the sessionId — tokens never touch the browser.
 *
 * Cookie signing uses HMAC-SHA256 so the Worker can detect tampering without
 * a database round-trip.
 */

import type { TokenResponse } from "./oauth.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Session {
  // OAuth tokens — stored only in KV, never sent to the browser.
  accessToken: string;
  refreshToken: string;
  // Loopwise school context from the token response.
  schoolId: string;
  schoolSubdomain: string;
  // Unix timestamp (seconds) when the access token expires.
  expiresAt: number;
  // ISO timestamp for debugging / audit.
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

const COOKIE_NAME = "lw_session";
// KV TTL: 30 days (refresh tokens typically live this long).
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Derive a CryptoKey from the SESSION_SECRET env var for HMAC-SHA256. */
async function getSigningKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Sign `payload` with HMAC-SHA256 and return `payload.signature` (URL-safe). */
async function sign(payload: string, secret: string): Promise<string> {
  const key = await getSigningKey(secret);
  const encoder = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${payload}.${sigBase64}`;
}

/** Verify a signed cookie value and return the original payload, or null. */
async function verify(signed: string, secret: string): Promise<string | null> {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return null;

  const payload = signed.slice(0, lastDot);
  const sigBase64 = signed.slice(lastDot + 1);

  const key = await getSigningKey(secret);
  const encoder = new TextEncoder();

  // Re-expand the URL-safe base64 sig back to standard base64.
  const sigBytes = Uint8Array.from(
    atob(sigBase64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    encoder.encode(payload),
  );

  return valid ? payload : null;
}

// ---------------------------------------------------------------------------
// Cookie parsing
// ---------------------------------------------------------------------------

/** Parse the Cookie header and return the value for `name`, or undefined. */
function parseCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k?.trim() === name) return rest.join("=").trim();
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new session in KV from a token response.
 * Returns the Set-Cookie header value to send to the browser.
 */
export async function createSession(
  kv: KVNamespace,
  secret: string,
  tokens: TokenResponse,
  isSecure: boolean,
): Promise<string> {
  // Generate a unique session ID.
  const sessionId = crypto.randomUUID();

  const session: Session = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    schoolId: tokens.school_id,
    schoolSubdomain: tokens.school_subdomain,
    // expires_in is in seconds; convert to an absolute Unix timestamp.
    expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
    createdAt: new Date().toISOString(),
  };

  await kv.put(`session:${sessionId}`, JSON.stringify(session), {
    expirationTtl: SESSION_TTL_SECONDS,
  });

  // Sign the session ID so we can detect cookie tampering.
  const signedValue = await sign(sessionId, secret);

  const cookieParts = [
    `${COOKIE_NAME}=${signedValue}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];

  // Only set Secure in production (HTTPS).
  if (isSecure) cookieParts.push("Secure");

  return cookieParts.join("; ");
}

/**
 * Read and verify the session cookie from the request.
 * Returns the Session data, or null if the session is missing / invalid.
 */
export async function getSession(
  kv: KVNamespace,
  secret: string,
  cookieHeader: string | null,
): Promise<{ sessionId: string; session: Session } | null> {
  const rawCookie = parseCookie(cookieHeader, COOKIE_NAME);
  if (!rawCookie) return null;

  const sessionId = await verify(rawCookie, secret);
  if (!sessionId) return null;

  const raw = await kv.get(`session:${sessionId}`);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as Session;
    return { sessionId, session };
  } catch {
    return null;
  }
}

/**
 * Overwrite the token fields of an existing session (after a token refresh).
 */
export async function updateSession(
  kv: KVNamespace,
  sessionId: string,
  tokens: TokenResponse,
): Promise<void> {
  const raw = await kv.get(`session:${sessionId}`);
  if (!raw) throw new Error("Session not found");

  const session = JSON.parse(raw) as Session;
  session.accessToken = tokens.access_token;
  session.refreshToken = tokens.refresh_token;
  session.expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

  await kv.put(`session:${sessionId}`, JSON.stringify(session), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
}

/**
 * Delete a session from KV (logout).
 * Returns the Set-Cookie header that clears the browser cookie.
 */
export async function destroySession(
  kv: KVNamespace,
  secret: string,
  cookieHeader: string | null,
): Promise<string> {
  const result = await getSession(kv, secret, cookieHeader);
  if (result) {
    await kv.delete(`session:${result.sessionId}`);
  }

  // Return a header that immediately expires the cookie.
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

/**
 * Check whether the access token in a session has expired (with a 60-second
 * buffer to account for clock drift and network latency).
 */
export function isTokenExpired(session: Session): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds >= session.expiresAt - 60;
}
