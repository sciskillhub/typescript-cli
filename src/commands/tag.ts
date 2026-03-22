/**
 * Tag Command
 *
 * List and search popular tags
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

export function registerTagCommand(program: Command): void {
  program
    .command("tag [query]")
    .alias("tags")
    .description("List or search popular tags")
    .option("-l, --limit <n>", "Number of results", "20")
    .option("-s, --subject <subject>", "Filter tags by subject")
    .option("--json", "Output as JSON")
    .action(async (query: string | undefined, options) => {
      const client = getClient();
      const limit = parseInt(options.limit, 10) || 20;
      const spin = options.json
        ? undefined
        : spinner(getLoadingText(query, options.subject));

      try {
        const tags = await client.listTags(options.subject);
        const filtered = filterByQuery(tags, query).slice(0, limit);

        spin?.stop();

        if (filtered.length === 0) {
          if (options.json) {
            console.log(JSON.stringify([], null, 2));
            return;
          }
          info(query ? `No tags found matching "${query}".` : "No tags found.");
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(filtered, null, 2));
          return;
        }

        console.log();
        console.log(colors.bold("Popular Tags"));
        if (options.subject) {
          console.log(colors.dim(`Subject: ${options.subject}`));
        }
        console.log();

        const rows = filtered.map((tag, idx) => [
          colors.dim(`${idx + 1}.`),
          colors.bold(tag.name),
          String(tag.count),
        ]);

        console.log(formatTable(rows, {
          headers: ["#", "Tag", "Count"],
        }));

        console.log();
        console.log(colors.dim(`Showing ${filtered.length} tag(s)`));
        console.log();
      } catch (err) {
        spin?.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

function getLoadingText(query?: string, subject?: string): string {
  if (query && subject) {
    return `Searching tags for "${query}" in subject "${subject}"...`;
  }
  if (query) {
    return `Searching tags for "${query}"...`;
  }
  if (subject) {
    return `Fetching tags for subject "${subject}"...`;
  }
  return "Fetching tags...";
}

function filterByQuery(
  items: Array<{ name: string; count: number }>,
  query?: string
): Array<{ name: string; count: number }> {
  if (!query?.trim()) {
    return items;
  }

  const keyword = query.trim().toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(keyword));
}
