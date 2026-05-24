/**
 * `/dashboard/members` — calls `admin.members.list()` via the SDK.
 *
 * Requires `members:read` on the OAuth client. Returns students by
 * default; pass `role: 'teaching_assistant'` to list TAs instead.
 */

import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoopwiseError } from '@loopwise/admin-sdk';
import { getAdminClient } from '@/lib/admin';

export default async function MembersPage() {
  const admin = await getAdminClient(await headers());
  if (!admin) redirect('/');

  try {
    const { nodes, nodesCount, currentPage, totalPages } = await admin.members.list({
      perPage: 25,
    });

    return (
      <main className="mx-auto max-w-3xl p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Members</h1>
            <p className="text-sm text-gray-500">
              {nodesCount} total • page {currentPage} of {totalPages}
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
            ← Dashboard
          </Link>
        </header>

        <ul className="space-y-2">
          {nodes.map((m) => (
            <li
              key={m.id}
              className="rounded-md border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="font-medium">{m.name ?? '(no name)'}</div>
              <div className="mt-1 text-xs text-gray-500">
                {m.email ?? '(no email)'}
                {m.lastSignInAt &&
                  ` • last seen ${new Date(m.lastSignInAt * 1000).toLocaleDateString()}`}
              </div>
            </li>
          ))}
          {nodes.length === 0 && (
            <li className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              No members yet.
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
        <h1 className="text-2xl font-bold">Couldn&apos;t load members</h1>
        <pre className="mt-4 overflow-x-auto rounded-md bg-red-50 p-4 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
          {`[${error.code}] ${error.message}`}
        </pre>
        {error.code === 'GRAPHQL' && (
          <p className="mt-4 text-sm text-gray-500">
            Likely cause: missing <code>members:read</code> scope. Enable it on
            your OAuth client, uncomment <code>scopes</code> in{' '}
            <code>src/lib/auth.ts</code>, then sign out + sign in.
          </p>
        )}
      </main>
    );
  }
  throw error;
}
