import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auth.js requires this when running behind a reverse proxy or custom domain.
  // Remove if not needed.
  // experimental: {
  //   serverActions: { allowedOrigins: ["yourdomain.com"] },
  // },
};

export default nextConfig;
