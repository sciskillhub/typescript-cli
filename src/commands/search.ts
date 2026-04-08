/**
 * Search Command
 * 
 * Search for skills in the public directory
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

export function registerSearchCommand(program: Command): void {
  program
    .command("search <query>")
    .alias("s")
    .alias("find")
    .description("Search for skills")
    .option("-l, --limit <n>", "Number of results", "10")
    .option("-c, --category <cat>", "Filter by category")
    .option("--json", "Output as JSON")
    .action(async (query: string, options) => {
      const client = getClient();
      const limit = parseInt(options.limit, 10) || 10;

      const spin = spinner(`Searching for "${query}"...`);

      try {
        // Use public API (no auth required)
        const results = await client.publicSearch(query, {
          limit,
          category: options.category,
        });

        spin.stop();

        if (results.length === 0) {
          info("No skills found matching your query.");
          console.log();
          info("Try different keywords or browse trending skills:");
          console.log(`  ${colors.code("skillhub trending")}`);
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        console.log();
        console.log(colors.bold(`Found ${results.length} skill${results.length > 1 ? "s" : ""}:`));
        console.log();

        // Slug format: source/author/skill-path
        // Display as table: Skill Name | Author | Source
        const rows = results.map((skill, idx) => {
          const parts = skill.slug.split("/");
          const source = parts[0] || "";
          const author = parts[1] || "";
          const skillPath = parts.slice(2).join("/") || "";

          const match = skill.similarity
            ? colors.dim(`${Math.round(skill.similarity * 100)}%`)
            : "";

          return [
            colors.dim(`${idx + 1}.`),
            colors.bold(skill.name),
            colors.code(author),
            colors.dim(source),
            skillPath,
            match,
          ];
        });

        console.log();
        console.log(formatTable(rows, {
          headers: ["#", "Skill Name", "Author", "Source", "Path", "Match"],
        }));

        console.log();
        info(`Install with: ${colors.code("sciskillhub install <author>/<path>")}`);
        console.log();
        info(`Example: ${colors.code(`sciskillhub install ${results[0]?.slug.split("/").slice(1).join("/")} --agent claude`)}`);
        console.log();

      } catch (err) {
        spin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
