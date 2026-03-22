/**
 * Subject Command
 *
 * List and search available subjects
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

export function registerSubjectCommand(program: Command): void {
  program
    .command("subject [query]")
    .alias("subjects")
    .alias("category")
    .alias("categories")
    .description("List or search available subjects")
    .option("-l, --limit <n>", "Number of results", "20")
    .option("--json", "Output as JSON")
    .action(async (query: string | undefined, options) => {
      const client = getClient();
      const limit = parseInt(options.limit, 10) || 20;
      const spin = options.json
        ? undefined
        : spinner(query ? `Searching subjects for "${query}"...` : "Fetching subjects...");

      try {
        const subjects = await client.listSubjects();
        const filtered = filterByQuery(subjects, query).slice(0, limit);

        spin?.stop();

        if (filtered.length === 0) {
          if (options.json) {
            console.log(JSON.stringify([], null, 2));
            return;
          }
          info(query ? `No subjects found matching "${query}".` : "No subjects found.");
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(filtered, null, 2));
          return;
        }

        console.log();
        console.log(colors.bold("Available Subjects"));
        console.log();

        const rows = filtered.map((subject, idx) => [
          colors.dim(`${idx + 1}.`),
          colors.bold(subject.name),
          colors.code(subject.slug),
          String(subject.skill_count),
        ]);

        console.log(formatTable(rows, {
          headers: ["#", "Subject", "Slug", "Skills"],
        }));

        console.log();
        console.log(colors.dim(`Showing ${filtered.length} subject(s)`));
        console.log();
      } catch (err) {
        spin?.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

function filterByQuery<T extends { name: string; slug: string; description?: string }>(
  items: T[],
  query?: string
): T[] {
  if (!query?.trim()) {
    return items;
  }

  const keyword = query.trim().toLowerCase();
  return items.filter((item) =>
    item.name.toLowerCase().includes(keyword) ||
    item.slug.toLowerCase().includes(keyword) ||
    item.description?.toLowerCase().includes(keyword)
  );
}
