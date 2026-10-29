'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-700"
    >
      Sign out
    </button>
  );
}
