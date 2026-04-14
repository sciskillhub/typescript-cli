/**
 * SciSkillHub API Client
 *
 * Self-contained API client for SciSkillHub
 */

// ============================================
// Types
// ============================================

export interface UserSkillSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  description_zh?: string;
  visibility: "private" | "unlisted" | "public";
  version: string;
  current_version: string;
  downloads: number;
  status: "draft" | "published" | "unlisted";
  similarity?: number;
  simple_score?: number;
  simple_rating?: number | string;
  github_stars?: number;
  created_at: string;
  updated_at: string;
}

export interface SkillInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  description_zh?: string;
  visibility: "private" | "unlisted" | "public";
  status: "draft" | "published" | "unlisted";
}

export interface UserSkillDetail {
  skill: SkillInfo;
  files: SkillFileInfo[];
  skill_md_raw?: string;
  author?: {
    id: string;
    username: string;
  };
  // Top-level convenience properties (same as skill.*)
  id: string;
  name: string;
  slug: string;
  description?: string;
  description_zh?: string;
  visibility: "private" | "unlisted" | "public";
  status: "draft" | "published" | "unlisted";
}

export interface SkillFileInfo {
  path?: string;
  filepath: string;
  content: string;
  sha?: string;
  content_hash: string;
}

export interface CreateSkillInput {
  name: string;
  slug: string;
  description?: string;
  description_zh?: string;
  visibility?: "private" | "unlisted" | "public";
}

export interface UpdateSkillInput {
  name?: string;
  description?: string;
  description_zh?: string;
  visibility?: "private" | "unlisted" | "public";
}

export interface PushSkillInput {
  skill_id?: string;
  name?: string;
  description?: string;
  description_zh?: string;
  files: Array<{
    filepath: string;
    content: string;
    content_hash?: string;
  }>;
  change_summary?: string;
  source?: string;
}

export interface PushSkillResult {
  success: boolean;
  version: string;
  file_count: number;
  total_size: number;
  skill: SkillInfo;
}

export interface PullSkillResult {
  files: SkillFileInfo[];
  version: string;
  skill: SkillInfo;
}

export interface SkillStatusResult {
  local_version: string | null;
  remote_version: string;
  current_version: string;
  updated_at: string;
  ahead: number;
  behind: number;
  diverged: boolean;
  files: SkillFileInfo[];
  skill: SkillInfo & { visibility: "private" | "unlisted" | "public" };
}

export interface PublishResult {
  success: boolean;
  slug: string;
  published_at: string;
  public_url?: string;
}

export interface VersionInfo {
  version: string;
  message?: string;
  created_at: string;
  author: string;
}

export interface VersionsResult {
  versions: VersionInfo[];
  total: number;
}

export interface RollbackResult {
  success: boolean;
  rolled_back_to: string;
}

export interface PublicCatalogOptions {
  sortBy?: string;
  limit?: number;
  object?: string[];
  stage?: string[];
  tasks?: string[];
  domains?: string[];
}

export interface CountedName {
  name: string;
  count: number;
}

export interface SubjectSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  skill_count: number;
}

export interface StatsResult {
  database: {
    type: string;
    status: string;
    totalSkills: number;
    categories: number;
    lastUpdated: string | null;
  };
}

export interface CatalogListResult {
  skills: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    object?: string | null;
    stage?: string | null;
    tasks?: string[] | null;
    domains?: string[] | null;
    github_stars?: number | null;
    simple_score?: number | null;
    simple_rating?: number | string | null;
    composite_score?: number | null;
    author?: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface PublicCatalogResult {
  trending: UserSkillSummary[];
  latest: UserSkillSummary[];
  top: UserSkillSummary[];
  skills: UserSkillSummary[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
  };
}

export interface ClientOptions {
  baseUrl: string;
  token?: string;
}

// ============================================
// API Client Class
// ============================================

export class SciSkillHubClient {
  private baseUrl: string;
  private token?: string;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error (${response.status}): ${error}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  // ============================================
  // User Skills (Authenticated)
  // ============================================

  async listSkills(): Promise<UserSkillSummary[]> {
    return this.request<UserSkillSummary[]>("GET", "/skills");
  }

  async getSkill(idOrSlug: string): Promise<UserSkillDetail> {
    return this.request<UserSkillDetail>("GET", `/skills/${idOrSlug}`);
  }

  /** List only the current user's skills */
  async listMySkills(): Promise<UserSkillSummary[]> {
    return this.request<UserSkillSummary[]>("GET", "/me/skills");
  }

  /** Get a specific skill owned by the current user */
  async getMySkill(idOrSlug: string): Promise<UserSkillDetail> {
    return this.request<UserSkillDetail>("GET", `/me/skills/${idOrSlug}`);
  }

  async createSkill(input: CreateSkillInput): Promise<UserSkillDetail> {
    return this.request<UserSkillDetail>("POST", "/skills", input);
  }

  async updateSkill(
    idOrSlug: string,
    input: UpdateSkillInput
  ): Promise<UserSkillDetail> {
    return this.request<UserSkillDetail>(
      "PATCH",
      `/skills/${idOrSlug}`,
      input
    );
  }

  async deleteSkill(idOrSlug: string): Promise<void> {
    await this.request<void>("DELETE", `/skills/${idOrSlug}`);
  }

  // ============================================
  // File Operations
  // ============================================

  async pushFiles(
    idOrSlug: string,
    input: PushSkillInput
  ): Promise<PushSkillResult> {
    return this.request<PushSkillResult>(
      "POST",
      `/skills/${idOrSlug}/push`,
      input
    );
  }

  /** Push skill with full input object */
  async pushSkill(input: PushSkillInput): Promise<PushSkillResult> {
    return this.request<PushSkillResult>("POST", "/skills/push", input);
  }

  async pullFiles(idOrSlug: string): Promise<PullSkillResult> {
    return this.request<PullSkillResult>("GET", `/skills/${idOrSlug}/pull`);
  }

  /** Pull skill with optional version */
  async pullSkill(skillId: string, version?: number): Promise<PullSkillResult> {
    const path = version
      ? `/skills/${skillId}/pull?version=${version}`
      : `/skills/${skillId}/pull`;
    return this.request<PullSkillResult>("GET", path);
  }

  async getStatus(idOrSlug: string): Promise<SkillStatusResult> {
    return this.request<SkillStatusResult>("GET", `/skills/${idOrSlug}/status`);
  }

  /** Alias for getStatus */
  async getSkillStatus(skillId: string): Promise<SkillStatusResult> {
    return this.request<SkillStatusResult>("GET", `/skills/${skillId}/status`);
  }

  // ============================================
  // Publishing
  // ============================================

  async publishSkill(idOrSlug: string): Promise<PublishResult> {
    return this.request<PublishResult>(
      "POST",
      `/skills/${idOrSlug}/publish`
    );
  }

  async unpublishSkill(idOrSlug: string): Promise<PublishResult> {
    return this.request<PublishResult>(
      "POST",
      `/skills/${idOrSlug}/unpublish`
    );
  }

  // ============================================
  // Versions
  // ============================================

  async listVersions(
    idOrSlug: string,
    page = 1,
    perPage = 20
  ): Promise<VersionsResult> {
    return this.request<VersionsResult>(
      "GET",
      `/skills/${idOrSlug}/versions?page=${page}&per_page=${perPage}`
    );
  }

  async rollback(
    idOrSlug: string,
    version: string
  ): Promise<RollbackResult> {
    return this.request<RollbackResult>(
      "POST",
      `/skills/${idOrSlug}/rollback`,
      { version }
    );
  }

  // ============================================
  // Discovery (Public)
  // ============================================

  async search(
    query: string,
    options?: { page?: number; perPage?: number; limit?: number }
  ): Promise<UserSkillSummary[]> {
    const params = new URLSearchParams({ q: query });
    if (options?.page) params.set("page", String(options.page));
    if (options?.perPage) params.set("per_page", String(options.perPage));
    if (options?.limit) params.set("limit", String(options.limit));
    return this.request<UserSkillSummary[]>("GET", `/search?${params}`);
  }

  /** Public search endpoint - returns array of skills */
  async publicSearch(
    query: string,
    options?: { page?: number; perPage?: number; limit?: number }
  ): Promise<UserSkillSummary[]> {
    const body: Record<string, unknown> = {
      query,
      limit: options?.limit || 10,
    };

    const response = await this.request<{ results: UserSkillSummary[] }>(
      "POST",
      "/skills/search",
      body
    );
    return response.results || [];
  }

  async trending(
    period: "24h" | "7d" | "30d" = "24h",
    limit = 20
  ): Promise<UserSkillSummary[]> {
    return this.request<UserSkillSummary[]>(
      "GET",
      `/public/trending?period=${period}&limit=${limit}`
    );
  }

  async latest(limit = 20): Promise<UserSkillSummary[]> {
    return this.request<UserSkillSummary[]>("GET", `/public/latest?limit=${limit}`);
  }

  async top(limit = 20): Promise<UserSkillSummary[]> {
    return this.request<UserSkillSummary[]>("GET", `/public/top?limit=${limit}`);
  }

  /** Get taxonomy options (object, stage, task, domain) */
  async getTaxonomy(): Promise<{
    object_options: string[];
    stage_options: string[];
    task_options: string[];
    domain_options: string[];
  }> {
    return this.request("GET", "/agent/skills/taxonomy");
  }

  /** Query tasks by object + stage + domains */
  async getAgentTasks(options: {
    object?: string;
    stage?: string;
    domains?: string[];
    page?: number;
    limit?: number;
  }): Promise<{
    object: string;
    stage: string;
    domains: string[];
    page: number;
    limit: number;
    total: number;
    tasks: Array<{ name: string; count: number }>;
  }> {
    const params = new URLSearchParams();
    if (options.object) params.set("object", options.object);
    if (options.stage) params.set("stage", options.stage);
    for (const d of options.domains ?? []) params.append("domains", d);
    if (options.page) params.set("page", String(options.page));
    if (options.limit) params.set("limit", String(options.limit));
    return this.request("GET", `/agent/skills/tasks?${params}`);
  }

  /** Get public catalog */
  async getPublicCatalog(options?: PublicCatalogOptions): Promise<PublicCatalogResult> {
    const params = new URLSearchParams();
    if (options?.sortBy) params.set("sortBy", options.sortBy);
    if (options?.limit) params.set("limit", String(options.limit));
    const query = params.toString();
    return this.request<PublicCatalogResult>("GET", `/public/catalog${query ? `?${query}` : ""}`);
  }

  /** Get a public skill by slug */
  async getPublicSkill(slug: string): Promise<UserSkillDetail> {
    return this.request<UserSkillDetail>("GET", `/public/skills/${slug}`);
  }

  async recommend(
    task?: string,
    query?: string,
    limit = 10
  ): Promise<UserSkillSummary[]> {
    const params = new URLSearchParams();
    if (task) params.set("task", task);
    if (query) params.set("query", query);
    params.set("limit", String(limit));
    return this.request<UserSkillSummary[]>(
      "GET",
      `/recommend?${params}`
    );
  }

  async getStats(): Promise<StatsResult> {
    return this.request<StatsResult>("GET", "/stats");
  }

  async listCatalogSkills(options?: {
    query?: string;
    limit?: number;
    object?: string[];
    stage?: string[];
    tasks?: string[];
    domains?: string[];
    sort?: string;
    order?: "asc" | "desc";
  }): Promise<CatalogListResult["skills"]> {
    const limit = options?.limit ?? 20;
    const pageSize = 100;
    let offset = 0;
    const collected: CatalogListResult["skills"] = [];

    while (true) {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
      });
      if (options?.sort) params.set("sort", options.sort);
      if (options?.order) params.set("order", options.order);
      for (const v of options?.object ?? []) params.append("object", v);
      for (const v of options?.stage ?? []) params.append("stage", v);
      for (const v of options?.tasks ?? []) params.append("tasks", v);
      for (const v of options?.domains ?? []) params.append("domains", v);

      const response = await this.request<CatalogListResult>(
        "GET",
        `/skills/catalog?${params}`
      );

      collected.push(...response.skills);

      if (!response.pagination?.has_more || response.skills.length === 0) {
        break;
      }

      if (!options?.query && collected.length >= limit) {
        break;
      }

      offset += response.skills.length;
    }

    const filtered = filterCatalogSkills(collected, options?.query);
    return filtered.slice(0, limit);
  }

  // ============================================
  // Installation
  // ============================================

  async install(skillSlug: string): Promise<{ files: SkillFileInfo[] }> {
    return this.request<{ files: SkillFileInfo[] }>(
      "GET",
      `/skills/${skillSlug}/install`
    );
  }

  // ============================================
  // User Info
  // ============================================

  async getCurrentUser(): Promise<{
    id: string;
    username: string;
    email: string;
    tier: string;
  }> {
    return this.request("GET", "/me");
  }
}

// ============================================
// Factory Function
// ============================================

export function createClient(options: ClientOptions): SciSkillHubClient {
  return new SciSkillHubClient(options);
}

function filterCatalogSkills(
  skills: CatalogListResult["skills"],
  query?: string
): CatalogListResult["skills"] {
  if (!query?.trim()) {
    return skills;
  }

  const keyword = query.trim().toLowerCase();

  return skills
    .map((skill) => ({
      skill,
      score: scoreCatalogSkill(skill, keyword),
    }))
    .filter((entry) => entry.score !== null)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return (a.score ?? 99) - (b.score ?? 99);
      }
      return a.skill.name.localeCompare(b.skill.name);
    })
    .map((entry) => entry.skill);
}

function scoreCatalogSkill(
  skill: CatalogListResult["skills"][number],
  keyword: string
): number | null {
  const name = skill.name.toLowerCase();
  const slug = skill.slug.toLowerCase();
  const description = (skill.description || "").toLowerCase();

  if (name === keyword || slug === keyword || slug.endsWith(`/${keyword}`)) {
    return 0;
  }

  if (name.startsWith(keyword) || slug.includes(`/${keyword}`)) {
    return 1;
  }

  if (name.includes(keyword) || slug.includes(keyword)) {
    return 2;
  }

  if (description.includes(keyword)) {
    return 3;
  }

  return null;
}
