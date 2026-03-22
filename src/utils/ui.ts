/**
 * CLI UI Utilities
 * 
 * Console output styling and formatting
 */

import chalk from "chalk";
import ora, { type Ora } from "ora";

// ============================================
// Colors & Styling
// ============================================

export const colors = {
  primary: chalk.hex("#7c3aed"),    // Purple
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  dim: chalk.dim,
  bold: chalk.bold,
  code: chalk.cyan,
};

// ============================================
// Logging
// ============================================

export function log(message: string): void {
  console.log(message);
}

export function success(message: string): void {
  console.log(colors.success("✓") + " " + message);
}

export function error(message: string): void {
  console.error(colors.error("✗") + " " + message);
}

export function warn(message: string): void {
  console.warn(colors.warning("⚠") + " " + message);
}

export function info(message: string): void {
  console.log(colors.info("ℹ") + " " + message);
}

// ============================================
// Spinner
// ============================================

export function spinner(text: string): Ora {
  return ora({
    text,
    color: "magenta",
  }).start();
}

// ============================================
// Formatting
// ============================================

export function formatTable(
  rows: (string | number)[][],
  options?: { headers?: string[]; padding?: number }
): string {
  const padding = options?.padding ?? 2;
  const allRows = options?.headers ? [options.headers, ...rows] : rows;

  // Calculate column widths
  const colWidths: number[] = [];
  for (const row of allRows) {
    row.forEach((cell, i) => {
      const cellStr = String(cell);
      const len = stripAnsi(cellStr).length;
      colWidths[i] = Math.max(colWidths[i] || 0, len);
    });
  }

  // Format rows
  const lines: string[] = [];
  for (let rowIdx = 0; rowIdx < allRows.length; rowIdx++) {
    const row = allRows[rowIdx];
    const cells = row.map((cell, i) => {
      const cellStr = String(cell);
      const len = stripAnsi(cellStr).length;
      const padLen = colWidths[i] - len + padding;
      return cellStr + " ".repeat(padLen);
    });
    lines.push(cells.join(""));

    // Add separator after headers
    if (options?.headers && rowIdx === 0) {
      const sep = colWidths.map((w) => "─".repeat(w + padding)).join("");
      lines.push(colors.dim(sep));
    }
  }

  return lines.join("\n");
}

// Simple ANSI strip (for length calculation)
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

export function formatSkillName(name: string, slug?: string): string {
  if (slug) {
    return `${colors.bold(name)} ${colors.dim(`(${slug})`)}`;
  }
  return colors.bold(name);
}

export function formatStatus(status: string): string {
  switch (status) {
    case "published":
      return colors.success("published");
    case "draft":
      return colors.warning("draft");
    case "archived":
      return colors.dim("archived");
    default:
      return status;
  }
}

export function formatVisibility(visibility: string): string {
  switch (visibility) {
    case "public":
      return colors.success("public");
    case "unlisted":
      return colors.info("unlisted");
    case "private":
      return colors.dim("private");
    default:
      return visibility;
  }
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ============================================
// Boxes / Banners
// ============================================

export function box(content: string, title?: string): string {
  const lines = content.split("\n");
  const maxLen = Math.max(...lines.map((l) => stripAnsi(l).length), title ? stripAnsi(title).length : 0);
  const width = maxLen + 4;

  const top = title
    ? `╭─ ${title} ${"─".repeat(width - stripAnsi(title).length - 4)}╮`
    : `╭${"─".repeat(width - 2)}╮`;
  const bottom = `╰${"─".repeat(width - 2)}╯`;

  const body = lines.map((line) => {
    const padLen = maxLen - stripAnsi(line).length;
    return `│ ${line}${" ".repeat(padLen)} │`;
  });

  return [top, ...body, bottom].join("\n");
}

// ============================================
// CLI Banner
// ============================================

export function printBanner(): void {
  const banner = `
${colors.primary("╭─────────────────────────────────╮")}
${colors.primary("│")}   ${colors.bold("SkillHub CLI")} ${colors.dim("v0.1.0")}           ${colors.primary("│")}
${colors.primary("│")}   ${colors.dim("Create & share AI agent skills")} ${colors.primary("│")}
${colors.primary("╰─────────────────────────────────╯")}
`;
  console.log(banner);
}
