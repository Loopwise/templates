/**
 * api.ts — Protected API routes that proxy to Loopwise.
 *
 * These routes require a valid session cookie. If the access token has
 * expired they transparently refresh it before proxying the request.
 */

import { Hono } from "hono";
import { fetchUserInfo, refreshAccessToken } from "../lib/oauth.js";
import {
  getSession,
  updateSession,
  isTokenExpired,
  type Session,
} from "../lib/session.js";

// Declare the typed context variables that the middleware will set.
// Downstream handlers can call c.get("session") / c.get("sessionId")
// with full type safety.
type Variables = {
  session: Session;
  sessionId: string;
};

const api = new Hono<{ Bindings: Env; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Middleware: require a valid session on all /api/* routes
// ---------------------------------------------------------------------------

api.use("/*", async (c, next) => {
  const { SESSION_SECRET, SESSIONS } = c.env;
  const cookieHeader = c.req.header("cookie") ?? null;
  const result = await getSession(SESSIONS, SESSION_SECRET, cookieHeader);

  if (!result) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Attach the resolved session to the context for downstream handlers.
  c.set("sessionId", result.sessionId);
  c.set("session", result.session);

  await next();
});

// ---------------------------------------------------------------------------
// GET /api/me — proxy to Loopwise userinfo
// ---------------------------------------------------------------------------
// Returns the authenticated user's profile. Handles token refresh
// transparently so the browser never needs to know about token expiry.

api.get("/me", async (c) => {
  const {
    LOOPWISE_SCHOOL_DOMAIN,
    LOOPWISE_CLIENT_ID,
    LOOPWISE_CLIENT_SECRET,
    SESSIONS,
  } = c.env;

  // Retrieve the session that was attached by the middleware above.
  let session = c.get("session");
  const sessionId = c.get("sessionId");

  // Refresh the access token if it has expired (or is about to).
  if (isTokenExpired(session)) {
    try {
      const newTokens = await refreshAccessToken(
        LOOPWISE_SCHOOL_DOMAIN,
        LOOPWISE_CLIENT_ID,
        LOOPWISE_CLIENT_SECRET,
        session.refreshToken,
      );

      await updateSession(SESSIONS, sessionId, newTokens);

      // Update the local reference so the userinfo fetch uses the new token.
      session = {
        ...session,
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + newTokens.expires_in,
      };
    } catch (err) {
      console.error("Token refresh failed:", err);
      // Refresh token is invalid or expired — force the user to re-authenticate.
      return c.json({ error: "Session expired, please log in again." }, 401);
    }
  }

  try {
    const userInfo = await fetchUserInfo(LOOPWISE_SCHOOL_DOMAIN, session.accessToken);

    return c.json({
      user: userInfo,
      school: {
        id: session.schoolId,
        subdomain: session.schoolSubdomain,
      },
    });
  } catch (err) {
    console.error("UserInfo fetch failed:", err);
    return c.json({ error: "Failed to fetch user info" }, 502);
  }
});

export default api;
