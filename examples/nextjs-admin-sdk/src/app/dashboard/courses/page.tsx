/**
 * `/dashboard/courses` — calls `admin.courses.list()` via the SDK.
 *
 * Requires `courses:read` on the OAuth client. If you see a scope error
 * here, enable it on the OAuth client AND uncomment the `scopes` line
 * in `src/lib/auth.ts`, then sign out + sign in again.
 */

import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoopwiseError } from '@loopwise/admin-sdk';
import { getAdminClient } from '@/lib/admin';

export default async function CoursesPage() {
  const admin = await getAdminClient(await headers());
  if (!admin) redirect('/');

  try {
    const { nodes, nodesCount, currentPage, totalPages } = await admin.courses.list({
      perPage: 20,
    });

    return (
      <main className="mx-auto max-w-3xl p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Courses</h1>
            <p className="text-sm text-gray-500">
              {nodesCount} total • page {currentPage} of {totalPages}
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
            ← Dashboard
          </Link>
        </header>

        <ul className="space-y-2">
          {nodes.map((course) => (
            <li
              key={course.id}
              className="rounded-md border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="font-medium">{course.name}</div>
              <div className="mt-1 text-xs text-gray-500">
                {course.courseType} • {course.contentType}
              </div>
              {course.description && (
                <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                  {course.description}
                </p>
              )}
            </li>
          ))}
          {nodes.length === 0 && (
            <li className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              No courses yet on this school.
            </li>
          )}
        </ul>
      </main>
    );
  } catch (error) {
    return <SdkErrorBlock error={error} />;
  }
}

function SdkErrorBlock({ error }: { error: unknown }) {
  if (error instanceof LoopwiseError) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Couldn&apos;t load courses</h1>
        <pre className="mt-4 overflow-x-auto rounded-md bg-red-50 p-4 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
          {`[${error.code}] ${error.message}`}
        </pre>
        {error.code === 'GRAPHQL' && (
          <p className="mt-4 text-sm text-gray-500">
            Likely cause: missing <code>courses:read</code> scope. Enable it on
            your OAuth client, uncomment <code>scopes</code> in{' '}
            <code>src/lib/auth.ts</code>, then sign out + sign in.
          </p>
        )}
      </main>
    );
  }
  throw error;
}
