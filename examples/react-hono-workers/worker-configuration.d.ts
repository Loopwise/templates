// Types for the Cloudflare Workers environment bindings.
// These are generated / updated by running `wrangler types`.

interface Env {
  // KV namespace for session storage (bound in wrangler.toml).
  SESSIONS: KVNamespace;

  // Secrets — set via `wrangler secret put` in production,
  // or in .dev.vars for local development.
  LOOPWISE_SCHOOL_DOMAIN: string;
  LOOPWISE_CLIENT_ID: string;
  LOOPWISE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  APP_BASE_URL: string;
}
