/**
 * List Command
 * 
 * List user's skills
 */

import { Command } from "commander";
import { isLoggedIn } from "../lib/config.js";
import { getClient, ensureAuthenticated } from "../lib/api.js";
import { registerTagCommand } from "./tag.js";
import { registerSubjectCommand } from "./subject.js";
import { registerSkillCommand } from "./skill.js";
import { 
  success, 
  error, 
  info, 
  spinner, 
  colors,
  formatTable,
  formatStatus,
  formatVisibility,
  formatDate,
} from "../utils/ui.js";

export function registerListCommand(program: Command): void {
  const listCommand = program
    .command("list")
    .alias("ls")
    .description("List your skills or browse metadata")
    .option("-a, --all", "Show all details")
    .action(async (options) => {
      // Check login
      if (!isLoggedIn()) {
        error("Not logged in. Run 'skillhub login' first.");
        process.exit(1);
      }

      ensureAuthenticated();
      const client = getClient();

      const spin = spinner("Fetching skills...");
      try {
        const skills = await client.listMySkills();
        spin.stop();

        if (skills.length === 0) {
          info("No skills found.");
          console.log();
          info(`Run 'skillhub init' to create a new skill.`);
          return;
        }

        console.log();
        console.log(colors.bold(`Your Skills (${skills.length}):`));
        console.log();

        if (options.all) {
          // Detailed view
          for (const skill of skills) {
            console.log(colors.bold(skill.name));
            console.log(formatTable([
              [colors.dim("  Slug:"), skill.slug],
              [colors.dim("  Status:"), formatStatus(skill.status)],
              [colors.dim("  Visibility:"), formatVisibility(skill.visibility)],
              [colors.dim("  Version:"), `v${skill.current_version}`],
              [colors.dim("  Category:"), skill.category || "-"],
              [colors.dim("  Updated:"), formatDate(skill.updated_at)],
            ]));
            console.log();
          }
        } else {
          // Compact table view
          const rows = skills.map((skill) => [
            colors.bold(skill.name),
            colors.dim(skill.slug),
            formatStatus(skill.status),
            `v${skill.current_version}`,
            formatDate(skill.updated_at),
          ]);

          console.log(formatTable(rows, {
            headers: ["Name", "Slug", "Status", "Version", "Updated"],
          }));
          console.log();
        }
      } catch (err) {
        spin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  registerTagCommand(listCommand);
  registerSubjectCommand(listCommand);
  registerSkillCommand(listCommand);
}
