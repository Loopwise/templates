/**
 * Landing page (`/`).
 *
 * - Unauthenticated: shows a "Sign in with Loopwise" button.
 * - Authenticated: shows the user's name, email, role, and school info,
 *   plus a link to the protected dashboard.
 *
 * This is a React Server Component — it reads the session server-side
 * with no client-side JavaScript required.
 */

import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Loopwise Connect
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Next.js OAuth 2.0 Example
          </p>
        </div>

        {session ? (
          // -----------------------------------------------------------------
          // Authenticated state
          // -----------------------------------------------------------------
          <div className="space-y-6">
            {/* Token error banner */}
            {session.error === "RefreshTokenError" && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                Your session has expired. Please sign in again.
              </div>
            )}

            {/* User card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Signed-in User
              </h2>
              <dl className="space-y-2 text-sm">
                <Row label="Name" value={session.user?.name} />
                <Row label="Email" value={session.user?.email} />
                <Row label="Role" value={session.role} />
              </dl>
            </div>

            {/* School card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                School
              </h2>
              <dl className="space-y-2 text-sm">
                <Row label="School ID" value={session.school_id} />
                <Row label="Subdomain" value={session.school_subdomain} />
                <Row label="Granted Scopes" value={session.scope} />
              </dl>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
              >
                Go to Dashboard
              </Link>

              {/* Sign-out is a server action — no JS required. */}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
                className="flex-1"
              >
                <button
                  type="submit"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        ) : (
          // -----------------------------------------------------------------
          // Unauthenticated state
          // -----------------------------------------------------------------
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="mb-6 text-sm text-gray-600">
              Sign in with your Loopwise school account to continue.
            </p>

            {/* Sign-in is a server action — triggers the OAuth redirect. */}
            <form
              action={async () => {
                "use server";
                await signIn("loopwise", { redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Sign in with Loopwise
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Small helper component for definition-list rows.
// ---------------------------------------------------------------------------
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
