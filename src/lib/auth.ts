/**
 * CLI Authentication
 *
 * Implements OAuth flow for CLI login (inspired by ClawHub)
 * Supports browser flow with random port and token-based headless login
 */

import { createServer } from "http";
import type { AddressInfo } from "net";
import { URL } from "url";
import open from "open";
import { getApiUrl, saveAuth, clearAuth, getAuth } from "./config.js";
import { resetClient } from "./api.js";

const OAUTH_CONFIG = {
  clientId: "sciskillhub-cli",
  scopes: ["read", "write", "skills"],
};

// Timeout for browser login flow (5 minutes)
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface AuthResult {
  success: boolean;
  user?: { id: string; username: string; email: string; tier: string };
  error?: string;
}

interface LoopbackAuthResult {
  token: string;
  state?: string;
}

/**
 * Login with browser flow (default) or token-based headless flow
 */
export async function login(token?: string): Promise<AuthResult> {
  // Headless login with token
  if (token) {
    return loginWithToken(token);
  }

  // Browser login flow (default)
  return loginWithBrowser();
}

/**
 * Login using a pre-existing token (headless mode)
 */
async function loginWithToken(token: string): Promise<AuthResult> {
  try {
    const user = await fetchUserInfo(token);
    saveAuth({
      accessToken: token,
      user,
    });
    resetClient();
    return { success: true, user };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Login using browser OAuth flow
 */
async function loginWithBrowser(): Promise<AuthResult> {
  const apiUrl = getApiUrl();
  const receiver = await startLoopbackAuthServer();
  const authUrl = buildAuthorizationUrl(receiver.state, receiver.redirectUri);

  console.log(`Opening browser: ${authUrl}`);

  try {
    await open(authUrl);
  } catch {
    return { success: false, error: "Failed to open browser. Please try again or use --token" };
  }

  try {
    const result = await receiver.waitForResult();
    const user = await fetchUserInfo(result.token);
    saveAuth({
      accessToken: result.token,
      user,
    });
    resetClient();
    return { success: true, user };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  } finally {
    receiver.close();
  }
}

/**
 * Logout - clear stored auth
 */
export async function logout(): Promise<void> {
  const auth = getAuth();

  // Try to revoke token on server
  if (auth?.accessToken) {
    try {
      await fetch(`${getApiUrl()}/oauth/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: auth.accessToken }),
      });
    } catch {
      // Ignore revoke errors
    }
  }

  clearAuth();
  resetClient();
}

/**
 * Get current user info
 */
export async function whoami(): Promise<{
  id: string;
  username: string;
  email: string;
  tier: string;
} | null> {
  const auth = getAuth();
  if (!auth?.accessToken) {
    return null;
  }

  // Return cached user if available
  if (auth.user) {
    return auth.user;
  }

  // Fetch fresh user info
  try {
    const user = await fetchUserInfo(auth.accessToken);
    
    // Update cached user
    saveAuth({
      ...auth,
      user,
    });

    return user;
  } catch {
    return null;
  }
}

// ============================================
// Loopback Auth Server (like ClawHub)
// ============================================

/**
 * Start a loopback HTTP server on a random port to receive the OAuth callback
 */
async function startLoopbackAuthServer() {
  const expectedState = generateState();

  let resolveToken: ((value: LoopbackAuthResult) => void) | null = null;
  let rejectToken: ((error: Error) => void) | null = null;
  const tokenPromise = new Promise<LoopbackAuthResult>((resolve, reject) => {
    resolveToken = resolve;
    rejectToken = reject;
  });

  const server = createServer((req, res) => {
    const method = req.method ?? "GET";
    const url = req.url ?? "/";

    // Serve the callback page
    if (method === "GET" && (url === "/" || url.startsWith("/callback"))) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(CALLBACK_HTML);
      return;
    }

    // Receive token from browser
    if (method === "POST" && url === "/token") {
      const chunks: Uint8Array[] = [];
      req.on("data", (chunk) => chunks.push(chunk as Uint8Array));
      req.on("end", () => {
        try {
          const raw = Buffer.concat(chunks).toString("utf8");
          const parsed = JSON.parse(raw) as unknown;
          if (!parsed || typeof parsed !== "object") throw new Error("invalid payload");
          const token = (parsed as { token?: unknown }).token;
          const state = (parsed as { state?: unknown }).state;
          if (typeof token !== "string" || !token.trim()) throw new Error("token required");
          if (typeof state !== "string" || state !== expectedState) {
            throw new Error("state mismatch");
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true }));
          resolveToken?.({ token: token.trim(), state });
        } catch (error) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false }));
          const message = error instanceof Error ? error.message : "invalid payload";
          rejectToken?.(new Error(message));
        } finally {
          server.close();
        }
      });
      return;
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo | null;
  if (!address) {
    server.close();
    throw new Error("Failed to bind loopback server");
  }
  const redirectUri = `http://127.0.0.1:${address.port}/callback`;

  // Set up timeout
  const timeout = setTimeout(() => {
    server.close();
    rejectToken?.(new Error("Timed out waiting for browser login"));
  }, LOGIN_TIMEOUT_MS);
  tokenPromise.finally(() => clearTimeout(timeout)).catch(() => {});

  return {
    redirectUri,
    state: expectedState,
    waitForResult: () => tokenPromise,
    close: () => server.close(),
  };
}

/**
 * Validate that a redirect URI is a safe loopback address
 */
export function isAllowedLoopbackRedirectUri(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  return (
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "::1" ||
    host === "[::1]"
  );
}

// ============================================
// Helper Functions
// ============================================

function buildAuthorizationUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OAUTH_CONFIG.scopes.join(" "),
    state,
  });

  return `${getApiUrl()}/oauth/authorize?${params}`;
}

function generateState(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex");
}

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenResponse> {
  const response = await fetch(`${getApiUrl()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: OAUTH_CONFIG.clientId,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error_description: "Unknown error" })) as { error_description?: string; error?: string };
    throw new Error(errorData.error_description || errorData.error || "Failed to exchange code");
  }

  return response.json() as Promise<TokenResponse>;
}

async function fetchUserInfo(accessToken: string): Promise<{
  id: string;
  username: string;
  email: string;
  tier: string;
}> {
  const response = await fetch(`${getApiUrl()}/user/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user info");
  }

  return response.json() as Promise<{
    id: string;
    username: string;
    email: string;
    tier: string;
  }>;
}

// HTML template served by the loopback server
// The browser POSTs the token back to /token endpoint
const CALLBACK_HTML = `<!doctype html>
<html lang="en">
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SciSkillHub CLI Login</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; padding: 24px; }
    .card { max-width: 560px; margin: 40px auto; padding: 18px 16px; border: 1px solid rgba(127,127,127,.35); border-radius: 12px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  </style>
  <body>
    <div class="card">
      <h1 style="margin: 0 0 10px; font-size: 18px;">Completing login…</h1>
      <p id="status" style="margin: 0; opacity: .8;">Waiting for token.</p>
    </div>
    <script>
      const statusEl = document.getElementById('status')
      const params = new URLSearchParams(location.hash.replace(/^#/, ''))
      const token = params.get('token')
      const state = params.get('state')
      if (!token) {
        statusEl.textContent = 'Missing token in URL. You can close this tab and try again.'
      } else if (!state) {
        statusEl.textContent = 'Missing state in URL. You can close this tab and try again.'
      } else {
        fetch('/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, state }),
        }).then(() => {
          statusEl.textContent = 'Logged in. You can close this tab.'
          setTimeout(() => window.close(), 250)
        }).catch(() => {
          statusEl.textContent = 'Failed to send token to CLI. You can close this tab and try again.'
        })
      }
    </script>
  </body>
</html>`;
