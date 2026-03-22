/**
 * Trending Command
 * 
 * Show trending/popular skills
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

export function registerTrendingCommand(program: Command): void {
  program
    .command("trending")
    .alias("hot")
    .alias("popular")
    .description("Show trending skills")
    .option("-l, --limit <n>", "Number of results", "20")
    .option("-c, --category <cat>", "Filter by category")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const client = getClient();
      const limit = parseInt(options.limit, 10) || 20;

      const spin = spinner("Fetching trending skills...");

      try {
        // Use public API (no auth required)
        const response = await client.getPublicCatalog({
          sortBy: "score",
          limit,
          category: options.category,
        });

        spin.stop();

        const skills = response.skills;

        if (skills.length === 0) {
          info("No trending skills found.");
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(skills, null, 2));
          return;
        }

        console.log();
        console.log(colors.bold("🔥 Trending Skills"));
        console.log();

        // Display as leaderboard
        const rows = skills.map((skill, idx) => {
          const rank = getRankEmoji(idx + 1);
          const score = skill.simple_score 
            ? formatScore(skill.simple_score)
            : skill.simple_rating || "-";
          const stars = skill.github_stars 
            ? `⭐ ${formatNumber(skill.github_stars)}`
            : "";
          
          return [
            rank,
            colors.bold(truncate(skill.name, 25)),
            colors.code(truncate(skill.slug, 30)),
            truncate(skill.category || "-", 15),
            score,
            stars,
          ];
        });

        console.log(formatTable(rows, {
          headers: ["#", "Name", "Slug", "Category", "Score", "Stars"],
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

function getRankEmoji(rank: number): string {
  switch (rank) {
    case 1: return "🥇";
    case 2: return "🥈";
    case 3: return "🥉";
    default: return colors.dim(`${rank}.`);
  }
}

function formatScore(score: number): string {
  const rounded = Math.round(score);
  if (rounded >= 90) return colors.success(`${rounded}`);
  if (rounded >= 70) return colors.info(`${rounded}`);
  if (rounded >= 50) return colors.warning(`${rounded}`);
  return colors.dim(`${rounded}`);
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
