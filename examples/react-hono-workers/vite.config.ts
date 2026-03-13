import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The SPA source lives in src/client (that is where index.html is).
  root: "src/client",
  // Build output goes to dist/client (relative to project root) so
  // wrangler.toml [assets] can pick it up.
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
  // During `vite dev` (not used in production — wrangler handles serving),
  // proxy API calls to the local Wrangler dev server.
  server: {
    proxy: {
      "/api": "http://localhost:8787",
      "/auth": "http://localhost:8787",
    },
  },
});
