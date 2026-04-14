/**
 * Shared taxonomy filter options for browse subcommands
 */

import { Command } from "commander";

export function addTaxonomyFilters(cmd: Command): Command {
  return cmd
    .option("--object <values...>", "Filter by object (e.g. 'Methods and Techniques')")
    .option("--stage <values...>", "Filter by stage (e.g. 'Data Processing')")
    .option("--task <values...>", "Filter by tasks (e.g. 'Quality Control')")
    .option("--domain <values...>", "Filter by domains (e.g. 'Life Sciences')");
}

export interface TaxonomyFilters {
  object?: string[];
  stage?: string[];
  tasks?: string[];
  domains?: string[];
}

export function getTaxonomyFilters(options: {
  object?: string[];
  stage?: string[];
  task?: string[];
  domain?: string[];
}): TaxonomyFilters {
  const filters: TaxonomyFilters = {};
  if (options.object?.length) filters.object = options.object;
  if (options.stage?.length) filters.stage = options.stage;
  if (options.task?.length) filters.tasks = options.task;
  if (options.domain?.length) filters.domains = options.domain;
  return filters;
}

export function hasTaxonomyFilters(filters: TaxonomyFilters): boolean {
  return !!(
    filters.object?.length ||
    filters.stage?.length ||
    filters.tasks?.length ||
    filters.domains?.length
  );
}

export function truncate(str: string, maxLen: number): string {
  if (!str) return "-";
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + "…";
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

export function formatScore(score: number): string {
  const rounded = Math.round(score);
  if (rounded >= 90) return `\x1b[32m${rounded}\x1b[0m`;
  if (rounded >= 70) return `\x1b[36m${rounded}\x1b[0m`;
  if (rounded >= 50) return `\x1b[33m${rounded}\x1b[0m`;
  return `\x1b[2m${rounded}\x1b[0m`;
}

export function getRankDisplay(rank: number): string {
  switch (rank) {
    case 1: return "🥇";
    case 2: return "🥈";
    case 3: return "🥉";
    default: return `\x1b[2m${rank}.\x1b[0m`;
  }
}
