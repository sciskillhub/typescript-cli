/**
 * CLI Configuration Management
 * 
 * Stores user config and auth tokens in ~/.skillhub/
 */

import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";

// Config stored in ~/.skillhub/config.json
const CONFIG_DIR = join(homedir(), ".skillhub");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const AUTH_FILE = join(CONFIG_DIR, "auth.json");
const LOCAL_DEV_API_URL = "http://localhost:3002/";
const LEGACY_REMOTE_API_URL = "https://skillhub.club/api/v1";

export interface UserConfig {
  apiUrl: string;
  defaultVisibility: "private" | "unlisted" | "public";
}

export interface AuthData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: {
    id: string;
    username: string;
    email: string;
    tier: string;
  };
}

// Ensure config directory exists
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Get user configuration
 */
export function getConfig(): UserConfig {
  ensureConfigDir();
  
  const defaults: UserConfig = {
    apiUrl: LOCAL_DEV_API_URL,
    defaultVisibility: "private",
  };

  if (!existsSync(CONFIG_FILE)) {
    return defaults;
  }

  try {
    const content = readFileSync(CONFIG_FILE, "utf-8");
    return { ...defaults, ...JSON.parse(content) };
  } catch {
    return defaults;
  }
}

/**
 * Save user configuration
 */
export function saveConfig(config: Partial<UserConfig>): void {
  ensureConfigDir();
  const current = getConfig();
  const updated = { ...current, ...config };
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
}

/**
 * Get auth data
 */
export function getAuth(): AuthData | null {
  ensureConfigDir();

  if (!existsSync(AUTH_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(AUTH_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Save auth data
 */
export function saveAuth(auth: AuthData): void {
  ensureConfigDir();
  writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2), { mode: 0o600 });
}

/**
 * Clear auth data (logout)
 */
export function clearAuth(): void {
  if (existsSync(AUTH_FILE)) {
    rmSync(AUTH_FILE);
  }
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  const auth = getAuth();
  return !!auth?.accessToken;
}

/**
 * Get access token
 */
export function getAccessToken(): string | null {
  const auth = getAuth();
  if (!auth?.accessToken) {
    return null;
  }

  // Check if token is expired
  if (auth.expiresAt && Date.now() > auth.expiresAt - 60000) {
    // Token expired, need to refresh or re-login
    // For now, just return null - refresh will be handled by commands
    return null;
  }

  return auth.accessToken;
}

/**
 * Get API URL
 */
export function getApiUrl(): string {
  const envApiUrl = process.env.SCISKILLHUB_API_URL?.trim();
  if (envApiUrl) {
    return normalizeApiUrl(envApiUrl);
  }

  const configApiUrl = getConfig().apiUrl;
  if (!configApiUrl || configApiUrl === LEGACY_REMOTE_API_URL) {
    return normalizeApiUrl(LOCAL_DEV_API_URL);
  }

  return normalizeApiUrl(configApiUrl);
}

function normalizeApiUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "http://localhost:3002/api/v1";
  }

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.replace(/\/+$/, "");

    if (!pathname || pathname === "/") {
      url.pathname = "/api/v1";
    } else if (!pathname.endsWith("/api/v1")) {
      url.pathname = `${pathname}/api/v1`.replace(/\/{2,}/g, "/");
    } else {
      url.pathname = pathname;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    const normalized = trimmed.replace(/\/+$/, "");
    if (normalized.endsWith("/api/v1")) {
      return normalized;
    }
    return `${normalized}/api/v1`;
  }
}

// ============================================
// Local Skill Config (.skillhub.json)
// ============================================

export interface LocalSkillConfig {
  skill_id?: string;
  name?: string;
  slug?: string;
  description?: string;
  description_zh?: string;
  category?: string;
  tags?: string[];
  visibility?: "private" | "unlisted" | "public";
  ignore?: string[];
}

const LOCAL_CONFIG_FILE = ".skillhub.json";

/**
 * Get local skill config from current directory
 */
export function getLocalConfig(dir: string = process.cwd()): LocalSkillConfig | null {
  const configPath = join(dir, LOCAL_CONFIG_FILE);
  
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Save local skill config
 */
export function saveLocalConfig(config: LocalSkillConfig, dir: string = process.cwd()): void {
  const configPath = join(dir, LOCAL_CONFIG_FILE);
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Check if current directory is a skill project
 */
export function isSkillProject(dir: string = process.cwd()): boolean {
  return existsSync(join(dir, LOCAL_CONFIG_FILE));
}

/**
 * Get config directory path
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}
