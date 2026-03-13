/**
 * App.tsx — Root component with routing and auth state management.
 *
 * Auth state is kept here and passed down via props. For a larger app
 * you would use React Context or a state manager, but for this reference
 * implementation we keep it simple.
 */

import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.js";
import Dashboard from "./pages/Dashboard.js";

export interface AuthState {
  loading: boolean;
  authenticated: boolean;
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ loading: true, authenticated: false });

  // Check session status on mount by calling the lightweight /auth/status
  // endpoint. This avoids sending the user to the login page on every refresh.
  useEffect(() => {
    fetch("/auth/status")
      .then((res) => res.json<{ authenticated: boolean }>())
      .then((data) => setAuth({ loading: false, authenticated: data.authenticated }))
      .catch(() => setAuth({ loading: false, authenticated: false }));
  }, []);

  if (auth.loading) {
    return (
      <div className="loading-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home authenticated={auth.authenticated} />} />
      <Route
        path="/dashboard"
        element={
          auth.authenticated ? (
            <Dashboard onLogout={() => setAuth({ loading: false, authenticated: false })} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      {/* Redirect anything else to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
