/**
 * File utilities for CLI
 * 
 * Handles file scanning, hashing, and filtering
 */

import { createHash } from "crypto";
import { readFileSync, statSync, existsSync } from "fs";
import { join, relative, extname, basename } from "path";
import { globby } from "globby";
import ignoreModule from "ignore";
const ignore = ignoreModule.default ?? ignoreModule;
import { getLocalConfig } from "./config.js";

// Allowed file extensions for skills
export const ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".py",
  ".sh",
  ".js",
  ".ts",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".txt",
  ".mjs",
  ".cjs",
]);

// Files/patterns to always ignore
const DEFAULT_IGNORE_PATTERNS = [
  ".git/**",
  ".git",
  "node_modules/**",
  "node_modules",
  ".skillhub.json",
  ".DS_Store",
  "*.log",
  "dist/**",
  "build/**",
  ".env",
  ".env.*",
  "*.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
];

export interface FileInfo {
  filepath: string;  // Relative path
  content: string;
  content_hash: string;
  file_size: number;
}

export interface ScanOptions {
  dir?: string;
  maxFileSize?: number;  // In bytes, default 100KB
  includeContent?: boolean;
}

/**
 * Calculate SHA-256 hash of content
 */
export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

/**
 * Check if a file extension is allowed
 */
export function isAllowedExtension(filepath: string): boolean {
  const ext = extname(filepath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Scan directory for skill files
 */
export async function scanFiles(options: ScanOptions = {}): Promise<FileInfo[]> {
  const dir = options.dir || process.cwd();
  const maxFileSize = options.maxFileSize || 100 * 1024; // 100KB default
  const includeContent = options.includeContent !== false;

  // Get local config for custom ignore patterns
  const localConfig = getLocalConfig(dir);
  const customIgnore = localConfig?.ignore || [];

  // Create ignore filter
  const ig = ignore().add([...DEFAULT_IGNORE_PATTERNS, ...customIgnore]);

  // Find all files
  const allFiles = await globby("**/*", {
    cwd: dir,
    dot: false,
    onlyFiles: true,
    absolute: false,
  });

  const files: FileInfo[] = [];
  const errors: string[] = [];

  for (const relPath of allFiles) {
    // Check ignore patterns
    if (ig.ignores(relPath)) {
      continue;
    }

    // Check extension
    if (!isAllowedExtension(relPath)) {
      continue;
    }

    const absPath = join(dir, relPath);

    try {
      const stat = statSync(absPath);
      
      // Check file size
      if (stat.size > maxFileSize) {
        errors.push(`${relPath}: File too large (${formatBytes(stat.size)} > ${formatBytes(maxFileSize)})`);
        continue;
      }

      const content = readFileSync(absPath, "utf-8");
      const hash = hashContent(content);

      files.push({
        filepath: relPath,
        content: includeContent ? content : "",
        content_hash: hash,
        file_size: stat.size,
      });
    } catch (err) {
      errors.push(`${relPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (errors.length > 0) {
    console.warn("Warnings during file scan:");
    errors.forEach((e) => console.warn(`  - ${e}`));
  }

  return files;
}

/**
 * Compare local files with remote files
 */
export function compareFiles(
  localFiles: FileInfo[],
  remoteFiles: { filepath: string; content_hash: string }[]
): {
  added: FileInfo[];
  modified: FileInfo[];
  deleted: string[];
  unchanged: string[];
} {
  const remoteMap = new Map(remoteFiles.map((f) => [f.filepath, f.content_hash]));
  const localMap = new Map(localFiles.map((f) => [f.filepath, f]));

  const added: FileInfo[] = [];
  const modified: FileInfo[] = [];
  const deleted: string[] = [];
  const unchanged: string[] = [];

  // Check local files
  for (const file of localFiles) {
    const remoteHash = remoteMap.get(file.filepath);
    if (!remoteHash) {
      added.push(file);
    } else if (remoteHash !== file.content_hash) {
      modified.push(file);
    } else {
      unchanged.push(file.filepath);
    }
  }

  // Check for deleted files
  for (const remotePath of remoteMap.keys()) {
    if (!localMap.has(remotePath)) {
      deleted.push(remotePath);
    }
  }

  return { added, modified, deleted, unchanged };
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Check if required files exist
 */
export function hasRequiredFiles(dir: string = process.cwd()): {
  valid: boolean;
  missing: string[];
  found: string[];
} {
  const requiredPatterns = ["SKILL.md", "skill.md", "README.md", "readme.md"];
  const found: string[] = [];

  for (const pattern of requiredPatterns) {
    if (existsSync(join(dir, pattern))) {
      found.push(pattern);
    }
  }

  // At least SKILL.md or README.md should exist
  const hasMain = found.some((f) => 
    f.toLowerCase() === "skill.md" || f.toLowerCase() === "readme.md"
  );

  return {
    valid: hasMain,
    missing: hasMain ? [] : ["SKILL.md or README.md"],
    found,
  };
}

/**
 * Get the main skill file content
 */
export function getMainSkillFile(dir: string = process.cwd()): {
  filename: string;
  content: string;
} | null {
  const candidates = ["SKILL.md", "skill.md", "README.md", "readme.md"];

  for (const filename of candidates) {
    const filepath = join(dir, filename);
    if (existsSync(filepath)) {
      return {
        filename,
        content: readFileSync(filepath, "utf-8"),
      };
    }
  }

  return null;
}
