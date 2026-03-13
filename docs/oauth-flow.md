# Loopwise Connect OAuth 2.0 Flow

Loopwise Connect implements OAuth 2.0 Authorization Code with PKCE ([RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)).

Each school operates as an independent OAuth authorization server. All OAuth endpoints are scoped to the school's domain.

## Endpoints

Replace `{school-domain}` with the school's domain (e.g., `demo.teachify.tw`).

| Endpoint | Method | URL |
|----------|--------|-----|
| Discovery | GET | `https://{school-domain}/.well-known/oauth-authorization-server` |
| Authorization | GET | `https://{school-domain}/oauth/authorize` |
| Token | POST | `https://{school-domain}/api/oauth/token` |
| UserInfo | GET/POST | `https://{school-domain}/api/oauth/userinfo` |
| Revoke | POST | `https://{school-domain}/api/oauth/revoke` |
| Introspect | POST | `https://{school-domain}/api/oauth/introspect` |
| Register | POST | `https://{school-domain}/api/oauth/register` |

## Authorization Code + PKCE Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐
│  Client   │     │    Browser    │     │ Loopwise Connect │
│  (Your    │     │              │     │  (School OAuth)  │
│   App)    │     │              │     │                  │
└─────┬─────┘     └──────┬───────┘     └────────┬─────────┘
      │                  │                      │
      │ 1. Generate PKCE │                      │
      │    code_verifier │                      │
      │    code_challenge│                      │
      │                  │                      │
      │ 2. Redirect ─────┼──────────────────────►
      │    /oauth/authorize                     │
      │    ?response_type=code                  │
      │    &client_id=...                       │
      │    &redirect_uri=...                    │
      │    &scope=openid profile email          │
      │    &state=...                           │
      │    &code_challenge=...                  │
      │    &code_challenge_method=S256          │
      │                  │                      │
      │                  │  3. User logs in      │
      │                  │     and consents      │
      │                  │                      │
      │ 4. Callback ◄────┼──────────────────────│
      │    ?code=AUTH_CODE&state=...            │
      │                  │                      │
      │ 5. POST /api/oauth/token ──────────────►│
      │    grant_type=authorization_code        │
      │    code=AUTH_CODE                       │
      │    redirect_uri=...                     │
      │    client_id=...                        │
      │    code_verifier=...                    │
      │                  │                      │
      │ 6. Token Response ◄─────────────────────│
      │    { access_token, refresh_token,       │
      │      school_id, school_subdomain }      │
      │                  │                      │
      │ 7. GET /api/oauth/userinfo ────────────►│
      │    Authorization: Bearer ACCESS_TOKEN   │
      │                  │                      │
      │ 8. UserInfo ◄───────────────────────────│
      │    { sub, name, email }                 │
      └──────────────────┴──────────────────────┘
```

### Step 1: Generate PKCE Parameters

```typescript
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
```

### Step 2: Redirect to Authorization

```
GET https://{school-domain}/oauth/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &scope=openid profile email
  &state=RANDOM_STATE
  &code_challenge=CODE_CHALLENGE
  &code_challenge_method=S256
```

### Step 5: Exchange Code for Tokens

```bash
POST https://{school-domain}/api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=https://yourapp.com/callback
&client_id=YOUR_CLIENT_ID
&code_verifier=CODE_VERIFIER
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_token": "GOffxhRhSi...",
  "scope": "openid profile email",
  "school_id": "550e8400-e29b-41d4-a716-446655440000",
  "school_subdomain": "demo"
}
```

### Token Refresh

```bash
POST https://{school-domain}/api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=REFRESH_TOKEN
&client_id=YOUR_CLIENT_ID
```

## Scopes

### Identity (OpenID Connect)

| Scope | Description |
|-------|-------------|
| `openid` | Required for identity access. Returns `sub` claim (unique user ID). |
| `profile` | Access user's display name. |
| `email` | Access user's email and verification status. |

### Data

| Scope | Description |
|-------|-------------|
| `courses:read` | Read course and enrollment data. |
| `courses:write` | Create and update courses. |
| `students:read` | Read student profiles and progress. |
| `students:write` | Update student data. |
| `curriculum:read` | Read curriculum structure (lessons, chapters, materials). |
| `curriculum:write` | Modify curriculum. |
| `orders:read` | Read order and payment data. |
| `analytics:read` | Access analytics and reporting. |
| `school:read` | Read school configuration. |

## Client Registration

Register an OAuth application in the school's admin panel:

**Settings > OAuth Applications > New Application**

You will receive:
- `client_id` — public identifier
- `client_secret` — for confidential clients only (server-side apps)
- Configure `redirect_uri` — must exactly match the URI used in authorization requests

### Public vs Confidential Clients

| Type | Use Case | Auth Method |
|------|----------|-------------|
| Public | SPAs, mobile apps, CLIs | PKCE only, no client_secret |
| Confidential | Server-side apps | client_secret_post + PKCE |

## Discovery

Fetch server metadata programmatically:

```bash
GET https://{school-domain}/.well-known/oauth-authorization-server
```

Returns all endpoint URLs, supported scopes, auth methods, and response types.
