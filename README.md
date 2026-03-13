# Loopwise Connect Templates

Official integration templates for [Loopwise Connect](https://connect.loopwise.com) OAuth 2.0.

Each school on Loopwise acts as an independent OAuth 2.0 authorization server. These templates show how to integrate with it using different tech stacks.

## Templates

| Template | Stack | Description |
|----------|-------|-------------|
| [nextjs](./examples/nextjs) | Next.js (App Router) | Full-stack integration with server-side token exchange |
| [react-hono-workers](./examples/react-hono-workers) | React + Vite + Hono.js + Cloudflare Workers | Edge-first SPA with Hono BFF handling OAuth |
| [minimal](./examples/minimal) | Node.js | ~50-line reference showing the core OAuth flow |

## Quick Start

1. Pick a template from the table above
2. Clone this repo or copy the template directory
3. Follow the template's README for setup instructions

## Documentation

- [OAuth 2.0 Flow Reference](./docs/oauth-flow.md) — Authorization Code + PKCE flow, endpoints, and scopes
- [Full Documentation](https://docs.loopwise.com/) — Complete Loopwise Connect developer docs

## License

MIT
