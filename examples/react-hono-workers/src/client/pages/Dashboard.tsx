/**
 * Dashboard.tsx — Protected page shown after sign-in.
 *
 * Fetches the current user's profile from /api/me (the Worker proxy route)
 * and displays school and profile information. Token refresh is handled
 * transparently by the server — the browser never needs to manage tokens.
 */

import { useEffect, useState } from "react";

interface UserInfo {
  sub: string;
  email: string;
  name: string;
  role: string;
  school_id: string;
  school_subdomain: string;
  [key: string]: unknown;
}

interface MeResponse {
  user: UserInfo;
  school: {
    id: string;
    subdomain: string;
  };
}

interface DashboardProps {
  onLogout: () => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "success"; data: MeResponse }
  | { status: "error"; message: string };

export default function Dashboard({ onLogout }: DashboardProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    fetch("/api/me")
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json<MeResponse>();
      })
      .then((data) => setState({ status: "success", data }))
      .catch((err: unknown) =>
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        }),
      );
  }, []);

  async function handleLogout() {
    await fetch("/auth/logout", { method: "POST" });
    onLogout();
    // Navigate to home — a hard redirect clears any local state cleanly.
    window.location.href = "/";
  }

  return (
    <div className="page">
      <nav className="navbar">
        <span className="logo-text">Loopwise Connect</span>
        <button className="button button-secondary" onClick={handleLogout}>
          Sign out
        </button>
      </nav>

      <main className="dashboard-main">
        <h1>Dashboard</h1>

        {state.status === "loading" && (
          <p className="text-muted">Loading your profile...</p>
        )}

        {state.status === "error" && (
          <div className="alert alert-error" role="alert">
            <strong>Error:</strong> {state.message}
          </div>
        )}

        {state.status === "success" && (
          <>
            <section className="card profile-card">
              <h2>Profile</h2>
              <dl className="definition-list">
                <dt>Name</dt>
                <dd>{state.data.user.name}</dd>

                <dt>Email</dt>
                <dd>{state.data.user.email}</dd>

                <dt>Role</dt>
                <dd>
                  <span className="badge">{state.data.user.role}</span>
                </dd>

                <dt>User ID</dt>
                <dd className="mono">{state.data.user.sub}</dd>
              </dl>
            </section>

            <section className="card school-card">
              <h2>School</h2>
              <dl className="definition-list">
                <dt>School ID</dt>
                <dd className="mono">{state.data.school.id}</dd>

                <dt>Subdomain</dt>
                <dd className="mono">{state.data.school.subdomain}</dd>
              </dl>
            </section>

            <section className="card raw-card">
              <h2>Raw UserInfo Response</h2>
              <p className="text-muted">
                All fields returned by the <code>/api/oauth/userinfo</code> endpoint:
              </p>
              <pre className="code-block">
                {JSON.stringify(state.data.user, null, 2)}
              </pre>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
