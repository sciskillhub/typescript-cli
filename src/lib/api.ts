/**
 * API Client wrapper for CLI
 *
 * Wraps the client with CLI-specific config
 */

import { SciSkillHubClient, createClient } from "./client.js";
import { getAuth, getApiUrl, saveAuth, clearAuth } from "./config.js";

let clientInstance: SciSkillHubClient | null = null;

/**
 * Get the API client instance
 */
export function getClient(): SciSkillHubClient {
  if (!clientInstance) {
    const auth = getAuth();
    clientInstance = createClient({
      baseUrl: getApiUrl(),
      token: auth?.accessToken,
    });
  }
  return clientInstance;
}

/**
 * Reset the client (e.g., after login/logout)
 */
export function resetClient(): void {
  clientInstance = null;
}

/**
 * Set the client token
 */
export function setClientToken(token: string): void {
  const client = getClient();
  client.setToken(token);
}

/**
 * Ensure user is authenticated, throw if not
 */
export function ensureAuthenticated(): void {
  const auth = getAuth();
  if (!auth?.accessToken) {
    throw new Error("Not logged in. Run 'sciskillhub login' first.");
  }
}

/**
 * Try to refresh the token
 */
export async function refreshToken(): Promise<boolean> {
  const auth = getAuth();
  if (!auth?.refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${getApiUrl()}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: auth.refreshToken,
        client_id: "sciskillhub-cli",
      }),
    });

    if (!response.ok) {
      clearAuth();
      resetClient();
      return false;
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    saveAuth({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || auth.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      user: auth.user,
    });

    resetClient();
    return true;
  } catch {
    clearAuth();
    resetClient();
    return false;
  }
}

// Re-export types from client for convenience
export type {
  UserSkillSummary,
  UserSkillDetail,
  SkillFileInfo,
  CreateSkillInput,
  UpdateSkillInput,
  PushSkillInput,
  PushSkillResult,
  PullSkillResult,
  SkillStatusResult,
  PublishResult,
  VersionInfo,
  VersionsResult,
  RollbackResult,
  CountedName,
  SubjectSummary,
  StatsResult,
  CatalogListResult,
} from "./client.js";
