/**
 * Tax Command
 *
 * Two modes:
 *   1. `tax` — list taxonomy enumerations (object, stage, task, domain)
 *   2. `tax --tasks --object X --stage Y --domain Z` — query tasks by filters
 *
 * Cached locally for 24h (taxonomy only), use --refresh to force update.
 */

import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getClient } from "../lib/api.js";
import {
  colors,
  error,
  info,
  spinner,
} from "../utils/ui.js";

const CACHE_DIR = join(homedir(), ".sciskillhub");
const CACHE_FILE = join(CACHE_DIR, "taxonomy.json");
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface TaxonomyData {
  object_options: string[];
  stage_options: string[];
  task_options: string[];
  domain_options: string[];
  cached_at: number;
}

async function getTaxonomy(refresh: boolean): Promise<TaxonomyData> {
  if (!refresh && existsSync(CACHE_FILE)) {
    try {
      const raw = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
      if (raw.cached_at && Date.now() - raw.cached_at < CACHE_TTL) {
        return raw;
      }
    } catch {}
  }

  const client = getClient();
  const taxonomy = await client.getTaxonomy();
  const data: TaxonomyData = { ...taxonomy, cached_at: Date.now() };

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));

  return data;
}

export function registerTaxCommand(program: Command): void {
  program
    .command("tax")
    .alias("taxonomy")
    .description("List taxonomy values, or query tasks by filters")
    // Mode: query tasks
    .option("--tasks", "Query tasks by object/stage/domain filters")
    .option("--object <value>", "Filter by object (used with --tasks)")
    .option("--stage <value>", "Filter by stage (used with --tasks)")
    .option("--domain <values...>", "Filter by domain (used with --tasks)")
    // Mode: list taxonomy
    .option("--object-list", "Show only object values")
    .option("--stage-list", "Show only stage values")
    .option("--task-list", "Show only task values")
    .option("--domain-list", "Show only domain values")
    // General options
    .option("--refresh", "Force refresh taxonomy cache")
    .option("--limit <n>", "Number of tasks to return (used with --tasks)", "100")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      try {
        // ── Mode 1: Query tasks by filters ──
        if (options.tasks) {
          return await queryTasks(options);
        }

        // ── Mode 2: List taxonomy values ──
        return await listTaxonomy(options);
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

async function queryTasks(options: Record<string, unknown>): Promise<void> {
  const client = getClient();
  const limit = parseInt(options.limit as string, 10) || 100;

  const filters: string[] = [];
  if (options.object) filters.push(`object: ${options.object}`);
  if (options.stage) filters.push(`stage: ${options.stage}`);
  if (options.domain) filters.push(`domain: ${(options.domain as string[]).join(", ")}`);

  const spin = spinner(
    filters.length > 0
      ? `Querying tasks (${filters.join(", ")})...`
      : "Querying tasks..."
  );

  const result = await client.getAgentTasks({
    object: options.object as string | undefined,
    stage: options.stage as string | undefined,
    domains: options.domain as string[] | undefined,
    limit,
  });

  spin.stop();

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log();
  console.log(colors.bold(`Tasks (${result.total} total)`));
  if (options.object) console.log(`  ${colors.dim("Object:")} ${options.object}`);
  if (options.stage) console.log(`  ${colors.dim("Stage:")} ${options.stage}`);
  if (options.domain) console.log(`  ${colors.dim("Domains:")} ${(options.domain as string[]).join(", ")}`);
  console.log();

  if (result.tasks.length === 0) {
    info("No tasks found for the given filters.");
    console.log();
    return;
  }

  for (const task of result.tasks) {
    console.log(`  ${colors.dim("•")} ${task.name} ${colors.dim(`(${task.count})`)}`);
  }

  console.log();
  info(`Next step: ${colors.code("sciskill browse skills --object '...' --stage '...' --task '...'")}`);
  console.log();
}

async function listTaxonomy(options: Record<string, unknown>): Promise<void> {
  const spin = spinner(options.refresh ? "Refreshing taxonomy values..." : "Loading taxonomy values...");

  const taxonomy = await getTaxonomy(!!options.refresh);
  spin.stop();

  const hasFilter = options.objectList || options.stageList || options.taskList || options.domainList;

  if (options.json) {
    if (hasFilter) {
      const filtered: Record<string, string[]> = {};
      if (options.objectList) filtered.object = taxonomy.object_options;
      if (options.stageList) filtered.stage = taxonomy.stage_options;
      if (options.taskList) filtered.task = taxonomy.task_options;
      if (options.domainList) filtered.domain = taxonomy.domain_options;
      console.log(JSON.stringify(filtered, null, 2));
    } else {
      console.log(JSON.stringify(taxonomy, null, 2));
    }
    return;
  }

  console.log();

  const sections: Array<{ label: string; flag: string; values: string[] }> = [
    { label: "Object", flag: "objectList", values: taxonomy.object_options },
    { label: "Stage", flag: "stageList", values: taxonomy.stage_options },
    { label: "Domain", flag: "domainList", values: taxonomy.domain_options },
    { label: "Task", flag: "taskList", values: taxonomy.task_options },
  ];

  for (const section of sections) {
    // Skip Task by default; only show with --task-list
    if (section.flag === "taskList" && !options.taskList) continue;
    if (hasFilter && !options[section.flag]) continue;
    console.log(colors.bold(`${section.label} (--${section.flag.replace("List", "").toLowerCase()})`));
    for (const v of section.values) {
      console.log(`  ${colors.dim("•")} ${v}`);
    }
    console.log();
  }

  info(`Query tasks: ${colors.code("sciskill tax --tasks --object 'Research Capabilities' --stage 'Study Design'")}`);
  info(`Browse skills: ${colors.code("sciskill browse skills --domain 'Life Sciences'")}`);
  console.log();
}
