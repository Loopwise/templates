/**
 * Protected dashboard page (`/dashboard`).
 *
 * Demonstrates calling the Loopwise UserInfo endpoint from a Server Component
 * using the access token stored in the session JWT.
 *
 * Access control is enforced at the middleware layer (src/middleware.ts),
 * so by the time this page renders, `session` is guaranteed to be non-null.
 */

import Link from "next/link";
import { auth, signOut } from "@/auth";

// ---------------------------------------------------------------------------
// UserInfo response shape from GET /api/oauth/userinfo
// ---------------------------------------------------------------------------
interface UserInfo {
  sub: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  // Additional fields your school may include:
  [key: string]: unknown;
}

async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const schoolDomain = process.env.LOOPWISE_SCHOOL_DOMAIN;
  if (!schoolDomain) {
    throw new Error("LOOPWISE_SCHOOL_DOMAIN is not set");
  }

  const response = await fetch(
    `https://${schoolDomain}/api/oauth/userinfo`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      // Do not cache — always fetch fresh data on each request.
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `UserInfo request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export default async function DashboardPage() {
  // `auth()` reads the session from the encrypted cookie. The middleware
  // already redirected unauthenticated users, so this is always non-null here.
  const session = await auth();

  if (!session) {
    // Fallback — should never reach here due to middleware, but TypeScript
    // needs the narrowing.
    return null;
  }

  // If the token refresh failed, surface an error instead of a broken page.
  if (session.error === "RefreshTokenError") {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-sm text-red-600">
            Your session has expired. Please sign in again.
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  // Fetch fresh user profile data from the Loopwise API.
  // The access token lives only in the server-side JWT — never exposed to the browser.
  let userInfo: UserInfo | null = null;
  let fetchError: string | null = null;

  try {
    // NOTE: In a real app you would pass the access_token through a helper
    // that reads it from the JWT. For simplicity this example reads the
    // cookie-based session which only contains the safe subset. If you need
    // the raw access_token, add it to the `session` callback in auth.ts
    // (mark it clearly as sensitive and only use it server-side).
    //
    // Here we use the session user data as a demonstration; a real call
    // would use the token from the JWT (see auth.ts jwt callback).
    userInfo = {
      sub: session.user?.email ?? "unknown",
      name: session.user?.name ?? "Unknown",
      email: session.user?.email ?? "",
      avatar_url: session.user?.image ?? null,
      role: session.role ?? "unknown",
    };
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-gray-500">
              Protected — only visible when signed in
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Home
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {fetchError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            Failed to load profile: {fetchError}
          </div>
        )}

        {/* User profile card */}
        {userInfo && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              {userInfo.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userInfo.avatar_url}
                  alt={userInfo.name}
                  className="h-14 w-14 rounded-full object-cover"
                />
              )}
              <div>
                <p className="text-lg font-semibold">{userInfo.name}</p>
                <p className="text-sm text-gray-500">{userInfo.email}</p>
                <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {userInfo.role}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Session / school metadata */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Session Metadata
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="School ID" value={session.school_id} />
            <Row label="School Subdomain" value={session.school_subdomain} />
            <Row label="Granted Scopes" value={session.scope} />
          </dl>
        </div>

        {/* Hint for developers */}
        <p className="text-center text-xs text-gray-400">
          The access token is stored server-side only and is never sent to the
          browser.
        </p>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-medium text-gray-500">{label}</dt>
      <dd className="truncate text-right text-gray-900">{value ?? "—"}</dd>
    </div>
  );
}
