'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export function SignInButton({ callbackURL }: { callbackURL: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    // Redirects the browser to Loopwise's authorize page on success.
    const { error } = await authClient.signIn.social({ provider: 'loopwise', callbackURL });
    if (error) {
      setError(error.message ?? 'Sign-in failed');
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="block w-full rounded-md bg-black px-4 py-3 text-center text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {pending ? 'Redirecting…' : 'Sign in with Loopwise'}
      </button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </>
  );
}
