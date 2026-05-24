# Loopwise Connect Templates

Official integration templates for [Loopwise Connect](https://docs.loopwise.com/)
OAuth 2.0. Each school on Loopwise acts as an independent OAuth 2.0
authorization server; these templates show how to integrate with it
using different tech stacks.

## Pick by use case

| You want to… | Use this template |
|---|---|
| Add "Sign in with Loopwise" SSO to your app | [`nextjs`](./examples/nextjs) (App Router + next-auth) — [`react-hono-workers`](./examples/react-hono-workers) (Vite SPA + Cloudflare Workers BFF) |
| Sign in **and** read/write your school's admin data (courses, members, …) | [`nextjs-admin-sdk`](./examples/nextjs-admin-sdk) (App Router + better-auth + `@loopwise/admin-sdk`) |
| See the smallest possible OAuth reference implementation | [`minimal`](./examples/minimal) (~50 lines of Node.js) |

Stack-agnostic? Read the [OAuth flow reference](./docs/oauth-flow.md) and
build on top — the same Loopwise endpoints work everywhere.

## All templates

| Template | Stack | Highlights |
|---|---|---|
| [`nextjs-admin-sdk`](./examples/nextjs-admin-sdk) | Next.js 15 + better-auth + Prisma | Full SSO + `@loopwise/admin-sdk` for admin GraphQL. Boots with a printed redirect URI so OAuth setup is zero-guess. |
| [`nextjs`](./examples/nextjs) | Next.js 15 + next-auth v5 | Classic SSO. Token refresh, protected routes, no admin data access. |
| [`react-hono-workers`](./examples/react-hono-workers) | React + Vite + Hono + Cloudflare Workers | Edge-first SPA with a Worker-based BFF holding the OAuth tokens. |
| [`minimal`](./examples/minimal) | Plain Node.js | ~50-line PKCE reference. Read this to understand the protocol. |

## Quick start

1. Pick a template from the **Pick by use case** table above.
2. Clone the repo or copy the template directory into your project.
3. Follow the template's own README for setup steps.

If you're building an integration that needs admin data, the
[Admin SDK quickstart](./docs/admin-sdk-quickstart.md) walks through
the shape end-to-end in 5 minutes.

## Documentation

- [OAuth 2.0 flow reference](./docs/oauth-flow.md) — Authorization Code
  + PKCE, endpoints, scopes
- [Admin SDK quickstart](./docs/admin-sdk-quickstart.md) — `@loopwise/admin-sdk`
  in 5 minutes
- [Full developer docs](https://docs.loopwise.com/)

## License

MIT
