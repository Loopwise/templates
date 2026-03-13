/**
 * index.tsx — Hono app entry point (Cloudflare Workers).
 *
 * Architecture (BFF pattern):
 *   - /auth/*  → OAuth flow (PKCE, callback, logout, status)
 *   - /api/*   → Protected API routes (proxy to Loopwise)
 *   - /*       → Serve the built React SPA from static assets
 *               (handled automatically by Cloudflare's assets binding
 *                when a route does not match a Worker handler)
 */

import { Hono } from "hono";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";

const app = new Hono<{ Bindings: Env }>();

// Mount the OAuth routes under /auth.
app.route("/auth", authRoutes);

// Mount the API proxy routes under /api.
app.route("/api", apiRoutes);

// Any request that falls through to here is handled by Cloudflare's static
// assets serving (configured in wrangler.toml [assets]). The SPA's
// index.html will be served for all unmatched routes, so client-side
// routing (React Router) works correctly.
//
// During local `wrangler dev`, Wrangler automatically merges the Worker
// routes with the static asset serving — no extra configuration needed.

export default app;
