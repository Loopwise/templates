import http from "node:http";
import crypto from "node:crypto";
import { URL, URLSearchParams } from "node:url";

const PORT = 4000;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const SCHOOL_DOMAIN = process.env.LOOPWISE_SCHOOL_DOMAIN ?? "demo.teachify.tw";
const CLIENT_ID = process.env.LOOPWISE_CLIENT_ID ?? "";

if (!CLIENT_ID) {
  console.error("Missing required env: LOOPWISE_CLIENT_ID");
  process.exit(1);
}

const BASE_URL = `https://${SCHOOL_DOMAIN}`;

// --- PKCE helpers ---

function generateVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// In-memory store: state -> { verifier }  (use Redis in production)
const pending = new Map<string, { verifier: string }>();

// --- Request handlers ---

function handleIndex(res: http.ServerResponse): void {
  const verifier = generateVerifier();
  const challenge = generateChallenge(verifier);
  const state = crypto.randomBytes(16).toString("hex");

  pending.set(state, { verifier });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "openid profile email",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });

  const authorizeUrl = `${BASE_URL}/oauth/authorize?${params}`;

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`<!doctype html>
<html><body>
  <h1>Loopwise Connect — Minimal OAuth Demo</h1>
  <a href="${authorizeUrl}">Login with Loopwise</a>
</body></html>`);
}

async function handleCallback(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const url = new URL(req.url!, `http://localhost:${PORT}`);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`OAuth error: ${error} — ${url.searchParams.get("error_description") ?? ""}`);
    return;
  }

  const session = pending.get(state);
  if (!session) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Unknown or expired state parameter.");
    return;
  }
  pending.delete(state);

  // Exchange authorization code for tokens
  const tokenRes = await fetch(`${BASE_URL}/api/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: session.verifier,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end(`Token exchange failed (${tokenRes.status}): ${body}`);
    return;
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string };

  // Fetch user info with the access token
  const userRes = await fetch(`${BASE_URL}/api/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const user = await userRes.json();

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(user, null, 2));
}

// --- Server ---

const server = http.createServer((req, res) => {
  const path = new URL(req.url!, `http://localhost:${PORT}`).pathname;

  if (path === "/") {
    handleIndex(res);
  } else if (path === "/callback") {
    handleCallback(req, res).catch((err) => {
      console.error(err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal server error");
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`School domain: ${SCHOOL_DOMAIN}`);
});
