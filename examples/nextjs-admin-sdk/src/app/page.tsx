/**
 * Landing page (`/`).
 *
 * Unauthenticated: shows a "Sign in with Loopwise" button. Authenticated:
 * shows the signed-in user + links into the dashboard demos.
 */

import Link from 'next/link';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  // `next` is set by the middleware when an unauthenticated request hits
  // a protected route — wire it through to better-auth's `callbackURL`
  // so the user lands back at the page they were trying to reach.
  //
  // Validate that `next` is a same-origin relative path: must start with
  // `/` but NOT `//` (scheme-relative URLs like `//evil.example/foo` are
  // an open-redirect vector — browsers treat them as cross-origin).
  const { next } = await searchParams;
  const isSafeNext = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//');
  const callbackURL = isSafeNext ? next : '/dashboard';

  // The OAuth authorize endpoint for our provider — better-auth's
  // genericOAuth mounts this at /api/auth/sign-in/oauth2/<providerId>.
  const signInHref = `/api/auth/sign-in/oauth2/loopwise?callbackURL=${encodeURIComponent(callbackURL)}`;
  const signOutHref = '/api/auth/sign-out';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Loopwise Admin SDK</h1>
          <p className="mt-2 text-sm text-gray-500">
            Next.js + better-auth + <code>@loopwise/admin-sdk</code>
          </p>
        </header>

        {session ? (
          <section className="space-y-6">
            <div className="rounded-md border border-gray-200 p-4 text-sm dark:border-gray-800">
              <p className="font-medium">{session.user.name ?? '(no name)'}</p>
              <p className="text-gray-500">{session.user.email ?? '(no email)'}</p>
              {/* `teachifyUserId` was populated at sign-up via the
                  `mapProfileToUser` callback in lib/auth.ts. */}
              {'teachifyUserId' in session.user &&
                typeof session.user.teachifyUserId === 'string' && (
                  <p className="mt-1 text-xs text-gray-400">
                    Teachify user id:{' '}
                    <code className="text-gray-600">{session.user.teachifyUserId}</code>
                  </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/dashboard"
                className="rounded-md bg-black px-4 py-2 text-center text-sm font-medium text-white dark:bg-white dark:text-black"
              >
                Open dashboard
              </Link>
              <form action={signOutHref} method="POST">
                <button
                  type="submit"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-700"
                >
                  Sign out
                </button>
              </form>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <a
              href={signInHref}
              className="block rounded-md bg-black px-4 py-3 text-center text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Sign in with Loopwise
            </a>
            <p className="text-center text-xs text-gray-500">
              Uses Authorization Code + PKCE. Your access token never reaches
              the browser — it lives server-side in the session store.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
