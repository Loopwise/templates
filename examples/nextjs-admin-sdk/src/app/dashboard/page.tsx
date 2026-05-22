/**
 * Dashboard home (`/dashboard`).
 *
 * Protected by `src/middleware.ts` — by the time this renders, a session
 * is guaranteed. Shows the signed-in user's info + links to the SDK demos.
 */

import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/');

  return (
    <main className="mx-auto max-w-2xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">Signed in as {session.user.email}</p>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:underline">
          ← Home
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Admin SDK demos
        </h2>
        <ul className="space-y-2">
          <li>
            <Link
              href="/dashboard/courses"
              className="block rounded-md border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
            >
              <div className="font-medium">Courses</div>
              <div className="text-sm text-gray-500">
                <code>admin.courses.list()</code> — requires{' '}
                <code>courses:read</code> scope
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/members"
              className="block rounded-md border border-gray-200 p-4 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
            >
              <div className="font-medium">Members</div>
              <div className="text-sm text-gray-500">
                <code>admin.members.list()</code> — requires{' '}
                <code>members:read</code> scope
              </div>
            </Link>
          </li>
        </ul>
      </section>

      <p className="mt-8 text-xs text-gray-500">
        Both pages call Loopwise admin GraphQL via{' '}
        <code>@loopwise/admin-sdk</code>. If you see a permission error,
        enable the relevant scope on your OAuth client AND uncomment{' '}
        <code>scopes</code> in <code>src/lib/auth.ts</code>, then sign in
        again.
      </p>
    </main>
  );
}
