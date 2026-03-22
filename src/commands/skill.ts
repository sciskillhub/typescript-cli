/**
 * Skill Command
 *
 * List and search skills by subject/tag
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
    .description("List or search skills by subject, tag, and query")
    .option("-q, --query <query>", "Filter skills by query text")
    .option("-s, --subject <subject>", "Filter skills by subject")
    .option("-t, --tag <tag>", "Filter skills by tag")
    .option("-l, --limit <n>", "Number of results", "20")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const client = getClient();
      const limit = parseInt(options.limit, 10) || 20;
      const spin = options.json
        ? undefined
        : spinner(getLoadingText(options.query, options.subject, options.tag));

      try {
        const skills = await client.listCatalogSkills({
          query: options.query,
          subject: options.subject,
          tag: options.tag,
          limit,
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
        console.log(colors.bold("Matching Skills"));
        if (options.subject) {
          console.log(colors.dim(`Subject: ${options.subject}`));
        }
        if (options.tag) {
          console.log(colors.dim(`Tag: ${options.tag}`));
        }
        console.log();

        const rows = skills.map((skill, idx) => [
          colors.dim(`${idx + 1}.`),
          colors.bold(truncate(skill.name, 24)),
          colors.code(truncate(skill.slug, 52)),
          truncate(skill.category || "-", 16),
          truncate((skill.tags || []).join(", ") || "-", 28),
        ]);

        console.log(formatTable(rows, {
          headers: ["#", "Name", "Slug", "Subject", "Tags"],
        }));

        console.log();
        console.log(colors.dim(`Showing ${skills.length} skill(s)`));
        console.log();
      } catch (err) {
        spin?.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

function getLoadingText(query?: string, subject?: string, tag?: string): string {
  const parts: string[] = [];
  if (query) parts.push(`query "${query}"`);
  if (subject) parts.push(`subject "${subject}"`);
  if (tag) parts.push(`tag "${tag}"`);

  if (parts.length === 0) {
    return "Fetching skills...";
  }

  return `Searching skills by ${parts.join(", ")}...`;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + "…";
}
