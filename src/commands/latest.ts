/**
 * Latest Command
 * 
 * Show recently added skills
 */

import { Command } from "commander";
import { getClient } from "../lib/api.js";
import { 
  error, 
  info, 
  spinner, 
  colors,
  formatTable,
} from "../utils/ui.js";

export function registerLatestCommand(program: Command): void {
  program
    .command("latest")
    .alias("new")
    .alias("recent")
    .description("Show recently added skills")
    .option("-l, --limit <n>", "Number of results", "20")
    .option("-c, --category <cat>", "Filter by category")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const client = getClient();
      const limit = parseInt(options.limit, 10) || 20;

      const spin = spinner("Fetching latest skills...");

      try {
        // Use public API (no auth required)
        const response = await client.getPublicCatalog({
          sortBy: "recent",
          limit,
          category: options.category,
        });

        spin.stop();

        const skills = response.skills;

        if (skills.length === 0) {
          info("No skills found.");
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(skills, null, 2));
          return;
        }

        console.log();
        console.log(colors.bold("✨ Latest Skills"));
        console.log();

        // Display results
        const rows = skills.map((skill, idx) => {
          const score = skill.simple_rating || "-";
          const stars = skill.github_stars 
            ? `⭐ ${formatNumber(skill.github_stars)}`
            : "";
          
          return [
            colors.dim(`${idx + 1}.`),
            colors.bold(truncate(skill.name, 25)),
            colors.code(truncate(skill.slug, 30)),
            truncate(skill.category || "-", 15),
            score,
            stars,
          ];
        });

        console.log(formatTable(rows, {
          headers: ["#", "Name", "Slug", "Category", "Rating", "Stars"],
        }));

        console.log();
        info(`Install with: ${colors.code("skillhub install <slug>")}`);
        console.log();

      } catch (err) {
        spin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + "…";
}
