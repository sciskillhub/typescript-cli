/**
 * Skill Command
 *
 * List and search skills with taxonomy filters
 */

import { Command } from "commander";
import { getClient } from "../lib/api.js";
import {
  colors,
  error,
  formatTable,
  info,
  spinner,
} from "../utils/ui.js";

export function registerSkillCommand(program: Command): void {
  program
    .command("skill")
    .alias("skills")
    .description("List or search skills by query and taxonomy")
    .option("-q, --query <query>", "Filter skills by query text")
    .option("--object <values...>", "Filter by object (e.g. 'Methods and Techniques')")
    .option("--stage <values...>", "Filter by stage (e.g. 'Data Processing')")
    .option("--task <values...>", "Filter by tasks (e.g. 'Quality Control')")
    .option("--domain <values...>", "Filter by domains (e.g. 'Life Sciences')")
    .option("--sort <field>", "Sort by: name, stars, recent, score", "name")
    .option("--order <dir>", "Sort order: asc, desc", "asc")
    .option("-l, --limit <n>", "Number of results", "20")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const client = getClient();
      const limit = parseInt(options.limit, 10) || 20;
      const spin = options.json
        ? undefined
        : spinner(getLoadingText(options));

      try {
        const skills = await client.listCatalogSkills({
          query: options.query,
          limit,
          object: options.object,
          stage: options.stage,
          tasks: options.task,
          domains: options.domain,
          sort: options.sort,
          order: options.order,
        });

        spin?.stop();

        if (skills.length === 0) {
          if (options.json) {
            console.log(JSON.stringify([], null, 2));
            return;
          }
          info("No skills found.");
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(skills, null, 2));
          return;
        }

        console.log();
        console.log(colors.bold(`Found ${skills.length} skills:`));
        console.log();

        const rows = skills.map((skill, idx) => {
          const parts = skill.slug.split("/");
          const author = parts[1] || "";
          const skillPath = parts.slice(2).join("/") || "";

          return [
            colors.dim(`${idx + 1}.`),
            colors.bold(truncate(skill.name, 28)),
            truncate(skill.object || "-", 20),
            truncate(skill.stage || "-", 16),
            truncate(author, 16),
            colors.code(truncate(skillPath, 36)),
          ];
        });

        console.log(formatTable(rows, {
          headers: ["#", "Name", "Object", "Stage", "Author", "Path"],
        }));

        console.log();
        info(`Install with: ${colors.code("sciskill install <author>/<path>")}`);
        console.log();
      } catch (err) {
        spin?.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

function getLoadingText(options: Record<string, unknown>): string {
  const parts: string[] = [];
  if (options.query) parts.push(`query "${options.query}"`);
  const obj = options.object as string[] | undefined;
  const stage = options.stage as string[] | undefined;
  const task = options.task as string[] | undefined;
  const domain = options.domain as string[] | undefined;
  if (obj?.length) parts.push(`object: ${obj.join(", ")}`);
  if (stage?.length) parts.push(`stage: ${stage.join(", ")}`);
  if (task?.length) parts.push(`tasks: ${task.join(", ")}`);
  if (domain?.length) parts.push(`domains: ${domain.join(", ")}`);

  if (parts.length === 0) return "Fetching skills...";
  return `Searching skills by ${parts.join(", ")}...`;
}

function truncate(str: string, maxLen: number): string {
  if (!str) return "-";
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + "…";
}
