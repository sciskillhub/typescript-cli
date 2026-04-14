/**
 * Local skill scanning utilities
 *
 * Shared between list (local installed) and inspect commands.
 */

import { existsSync, readdirSync, statSync, lstatSync, readlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { AGENTS, type AgentKey } from "../commands/install.js";

export interface InstalledSkill {
  name: string;
  path: string;
  agentKey: AgentKey;
  configFile: string;
  hasSkillFile: boolean;
  isSymlink: boolean;
  storeTarget: string | null;
  size: number;
  modifiedAt: Date | null;
}

export function listAgentSkills(
  agentKey: AgentKey,
  scope: "personal" | "project" = "personal"
): InstalledSkill[] {
  const agent = AGENTS[agentKey];
  const basePath =
    scope === "personal"
      ? join(homedir(), agent.personalPath)
      : join(process.cwd(), agent.projectPath);

  if (!existsSync(basePath)) {
    return [];
  }

  const skills: InstalledSkill[] = [];
  const entries = readdirSync(basePath, { withFileTypes: true });

  for (const entry of entries) {
    const skillPath = join(basePath, entry.name);

    // Handle both real directories and symlinks to directories
    let isDir = entry.isDirectory();
    let isSymlink = entry.isSymbolicLink();
    let realPath = skillPath;

    if (isSymlink) {
      try {
        const target = readlinkSync(skillPath);
        // Resolve relative symlinks
        realPath = target.startsWith("/")
          ? target
          : join(basePath, target);
        // Check if symlink target is a directory
        isDir = existsSync(realPath) && statSync(realPath).isDirectory();
      } catch {}
    }

    if (!isDir) continue;

    const skillFile = join(realPath, agent.configFile);
    const hasSkillFile = existsSync(skillFile);

    let size = 0;
    let modifiedAt: Date | null = null;

    try {
      const stat = statSync(realPath);
      modifiedAt = stat.mtime;

      const calcSize = (dir: string): number => {
        let total = 0;
        const files = readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const filePath = join(dir, file.name);
          if (file.isDirectory()) {
            total += calcSize(filePath);
          } else if (file.isFile()) {
            try {
              total += statSync(filePath).size;
            } catch {}
          }
        }
        return total;
      };

      size = calcSize(realPath);
    } catch {}

    let storeTarget: string | null = null;
    if (isSymlink) {
      try {
        storeTarget = readlinkSync(skillPath);
      } catch {}
    }

    skills.push({
      name: entry.name,
      path: skillPath,
      agentKey,
      configFile: agent.configFile,
      hasSkillFile,
      isSymlink,
      storeTarget,
      size,
      modifiedAt,
    });
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function listAllAgentSkills(
  scope: "personal" | "project" = "personal"
): Map<AgentKey, InstalledSkill[]> {
  const result = new Map<AgentKey, InstalledSkill[]>();
  for (const key of Object.keys(AGENTS) as AgentKey[]) {
    const skills = listAgentSkills(key, scope);
    if (skills.length > 0) {
      result.set(key, skills);
    }
  }
  return result;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
