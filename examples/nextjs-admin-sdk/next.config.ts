import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep the boot log readable — the lib/auth.ts module prints the
  // redirect URI you need to register on the OAuth client.
  logging: { fetches: { fullUrl: false } },
};

export default nextConfig;
