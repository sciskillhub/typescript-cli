/**
 * CLI Authentication
 * 
 * Implements device flow for CLI login (similar to GitHub CLI)
 * User opens browser, enters code, CLI polls for token
 */

import { createServer } from "http";
import { URL } from "url";
import open from "open";
import { getApiUrl, saveAuth, clearAuth, getAuth } from "./config.js";
import { resetClient } from "./api.js";

const OAUTH_CONFIG = {
  clientId: "skillhub-cli",
  callbackPort: 54322,
  scopes: ["read", "write", "skills"],
};

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

/**
 * Start OAuth login flow using local callback server
 */
export async function login(): Promise<{
  success: boolean;
  user?: { id: string; username: string; email: string; tier: string };
  error?: string;
}> {
  const apiUrl = getApiUrl();
  const state = generateState();

  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      if (!req.url?.startsWith("/callback")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const url = new URL(req.url, `http://localhost:${OAUTH_CONFIG.callbackPort}`);
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(getErrorHtml(error));
        server.close();
        resolve({ success: false, error });
        return;
      }

      if (returnedState !== state) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(getErrorHtml("State mismatch - possible CSRF attack"));
        server.close();
        resolve({ success: false, error: "State mismatch" });
        return;
      }

      if (code) {
        try {
          const token = await exchangeCodeForToken(
            code,
            `http://localhost:${OAUTH_CONFIG.callbackPort}/callback`
          );

          // Get user info
          const user = await fetchUserInfo(token.access_token);

          // Save auth
          saveAuth({
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: Date.now() + token.expires_in * 1000,
            user,
          });

          resetClient();

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(getSuccessHtml(user.username));
          server.close();
          resolve({ success: true, user });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(getErrorHtml(errorMsg));
          server.close();
          resolve({ success: false, error: errorMsg });
        }
      }
    });

    server.listen(OAUTH_CONFIG.callbackPort, async () => {
      const authUrl = buildAuthorizationUrl(
        state,
        `http://localhost:${OAUTH_CONFIG.callbackPort}/callback`
      );

      // Open browser
      await open(authUrl);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      resolve({ success: false, error: "Login timeout" });
    }, 5 * 60 * 1000);
  });
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
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
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

function getSuccessHtml(username: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SkillHub CLI - Login Successful</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      margin: 0; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
    }
    .card { 
      background: white; 
      padding: 40px 60px; 
      border-radius: 16px; 
      text-align: center; 
      box-shadow: 0 10px 40px rgba(0,0,0,0.2); 
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #22c55e; margin-bottom: 8px; }
    p { color: #666; margin: 8px 0; }
    .username { font-weight: 600; color: #333; }
    .hint { font-size: 14px; color: #999; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10003;</div>
    <h1>Login Successful!</h1>
    <p>Welcome, <span class="username">${username}</span></p>
    <p class="hint">You can close this window and return to your terminal.</p>
  </div>
</body>
</html>`;
}

function getErrorHtml(error: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SkillHub CLI - Login Failed</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      margin: 0; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
    }
    .card { 
      background: white; 
      padding: 40px 60px; 
      border-radius: 16px; 
      text-align: center; 
      box-shadow: 0 10px 40px rgba(0,0,0,0.2); 
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #ef4444; margin-bottom: 8px; }
    p { color: #666; }
    .error { 
      background: #fef2f2; 
      color: #991b1b; 
      padding: 12px 20px; 
      border-radius: 8px; 
      margin-top: 16px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10007;</div>
    <h1>Login Failed</h1>
    <p>Please try again from your terminal.</p>
    <div class="error">${error}</div>
  </div>
</body>
</html>`;
}
