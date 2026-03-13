/**
 * Home.tsx — Landing page.
 *
 * Shows a login button when the user is not authenticated,
 * or a welcome card with a link to the dashboard when they are.
 */

import { useSearchParams } from "react-router-dom";

interface HomeProps {
  authenticated: boolean;
}

export default function Home({ authenticated }: HomeProps) {
  const [searchParams] = useSearchParams();
  // The OAuth callback or auth routes may redirect here with ?error=...
  const error = searchParams.get("error");

  return (
    <div className="page">
      <header className="hero">
        <div className="logo">
          <span className="logo-mark">LW</span>
          <span className="logo-text">Loopwise Connect</span>
        </div>
        <h1>OAuth 2.0 + PKCE Example</h1>
        <p className="subtitle">
          A reference implementation using React, Hono.js, and Cloudflare Workers.
        </p>
      </header>

      <main className="hero-main">
        {error && (
          <div className="alert alert-error" role="alert">
            <strong>Authentication error:</strong> {decodeURIComponent(error)}
          </div>
        )}

        {authenticated ? (
          <div className="card">
            <p className="card-body">You are signed in.</p>
            <a href="/dashboard" className="button button-primary">
              Go to Dashboard
            </a>
          </div>
        ) : (
          <div className="card">
            <p className="card-body">
              Click below to sign in with your Loopwise school account. You will be
              redirected to your school&apos;s authorization page and back.
            </p>
            {/* Navigating to /auth/login triggers a server-side redirect.
                We use a plain anchor (not React Router Link) intentionally. */}
            <a href="/auth/login" className="button button-primary">
              Sign in with Loopwise
            </a>
          </div>
        )}
      </main>

      <footer className="page-footer">
        <p>
          Source code on{" "}
          <a href="https://github.com/loopwise/connect-examples" target="_blank" rel="noreferrer">
            GitHub
          </a>
          . Refer to the{" "}
          <a href="https://developers.loopwise.com" target="_blank" rel="noreferrer">
            Loopwise Developer Docs
          </a>{" "}
          for the full OAuth 2.0 reference.
        </p>
      </footer>
    </div>
  );
}
