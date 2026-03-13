/**
 * Auth.js (next-auth v5) configuration.
 *
 * Registers a custom OAuth 2.0 provider for Loopwise Connect that supports:
 *   - Authorization Code flow with PKCE (S256)
 *   - Automatic token refresh via the `jwt` callback
 *
 * The school domain is read from LOOPWISE_SCHOOL_DOMAIN at runtime, so a
 * single deployment can serve multiple schools by swapping the env variable.
 */

import NextAuth from "next-auth";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import { refreshAccessToken } from "@/lib/loopwise";

// ---------------------------------------------------------------------------
// UserInfo shape returned by GET /api/oauth/userinfo
// ---------------------------------------------------------------------------
interface LoopwiseProfile {
  sub: string; // unique user ID
  name: string;
  email: string;
  avatar_url: string | null;
  role: string; // e.g. "student", "teacher", "admin"
}

// ---------------------------------------------------------------------------
// Custom Loopwise provider factory
// ---------------------------------------------------------------------------
function LoopwiseProvider(
  options: OAuthUserConfig<LoopwiseProfile>
): OAuthConfig<LoopwiseProfile> {
  const schoolDomain = process.env.LOOPWISE_SCHOOL_DOMAIN;
  if (!schoolDomain) {
    throw new Error("LOOPWISE_SCHOOL_DOMAIN environment variable is required");
  }

  const base = `https://${schoolDomain}`;

  return {
    id: "loopwise",
    name: "Loopwise Connect",
    type: "oauth",

    // Authorization endpoint — users are redirected here to approve access.
    authorization: {
      url: `${base}/oauth/authorize`,
      params: {
        scope: "openid profile email",
        // Auth.js automatically appends code_challenge / code_challenge_method
        // when `checks: ["pkce"]` is set below.
      },
    },

    // Token endpoint — server-side exchange of authorization code for tokens.
    token: `${base}/api/oauth/token`,

    // UserInfo endpoint — fetch the authenticated user's profile.
    userinfo: `${base}/api/oauth/userinfo`,

    // Enable PKCE and state checks.
    checks: ["pkce", "state"],

    // Map the userinfo response to an Auth.js Profile.
    profile(profile: LoopwiseProfile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.avatar_url ?? undefined,
        role: profile.role,
      };
    },

    ...options,
  };
}

// ---------------------------------------------------------------------------
// Auth.js instance
// ---------------------------------------------------------------------------
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    LoopwiseProvider({
      clientId: process.env.LOOPWISE_CLIENT_ID!,
      clientSecret: process.env.LOOPWISE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    /**
     * Persist the OAuth tokens and school metadata in the JWT so they are
     * available on every authenticated request without a database.
     */
    async jwt({ token, account, profile }) {
      // First sign-in: Auth.js passes `account` and `profile`.
      if (account && profile) {
        return {
          ...token,
          access_token: account.access_token as string,
          refresh_token: account.refresh_token as string,
          // expires_at is an epoch timestamp in seconds.
          expires_at: account.expires_at as number,
          school_id: (account as Record<string, unknown>).school_id as string,
          school_subdomain: (account as Record<string, unknown>)
            .school_subdomain as string,
          scope: account.scope as string,
          role: (profile as LoopwiseProfile).role,
        };
      }

      // Subsequent requests: refresh the access token if it has expired.
      const expiresAt = token.expires_at as number | undefined;
      const isExpired = expiresAt && Date.now() / 1000 > expiresAt - 30;

      if (!isExpired) {
        // Token is still valid — return unchanged.
        return token;
      }

      const refreshed = await refreshAccessToken({
        access_token: token.access_token as string,
        refresh_token: token.refresh_token as string,
        expires_at: expiresAt!,
        school_id: token.school_id as string,
        school_subdomain: token.school_subdomain as string,
        scope: token.scope as string,
      });

      if (!refreshed) {
        // Refresh failed — mark the token as invalid to force re-login.
        return { ...token, error: "RefreshTokenError" };
      }

      return {
        ...token,
        ...refreshed,
        error: undefined,
      };
    },

    /**
     * Expose a safe subset of the JWT to the client-side session object.
     * Never include access_token or refresh_token here.
     */
    async session({ session, token }) {
      return {
        ...session,
        school_id: token.school_id as string | undefined,
        school_subdomain: token.school_subdomain as string | undefined,
        scope: token.scope as string | undefined,
        role: token.role as string | undefined,
        // Surface token errors so the UI can prompt re-login.
        error: token.error as string | undefined,
      };
    },
  },
});

// ---------------------------------------------------------------------------
// Augment next-auth types so TypeScript knows about our extra session fields.
// ---------------------------------------------------------------------------
declare module "next-auth" {
  interface Session {
    school_id?: string;
    school_subdomain?: string;
    scope?: string;
    role?: string;
    error?: string;
  }
}
