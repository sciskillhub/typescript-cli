/**
 * Publish Command
 * 
 * Publish/unpublish a skill to the public directory
 */

import { Command } from "commander";
import prompts from "prompts";
import { 
  isSkillProject, 
  getLocalConfig, 
  saveLocalConfig,
  isLoggedIn,
} from "../lib/config.js";
import { getClient, ensureAuthenticated } from "../lib/api.js";
import { 
  success, 
  error, 
  info, 
  warn, 
  spinner, 
  colors,
  formatTable,
  formatStatus,
  formatVisibility,
} from "../utils/ui.js";

export function registerPublishCommand(program: Command): void {
  // Publish command
  program
    .command("publish")
    .description("Publish skill to public directory")
    .option("-y, --yes", "Skip confirmation")
    .action(async (options) => {
      const cwd = process.cwd();

      // Check login
      if (!isLoggedIn()) {
        error("Not logged in. Run 'skillhub login' first.");
        process.exit(1);
      }

      // Check if initialized
      if (!isSkillProject(cwd)) {
        error("Not a skill project. Run 'skillhub init' first.");
        process.exit(1);
      }

      const config = getLocalConfig(cwd)!;
      
      if (!config.skill_id) {
        error("Skill not pushed yet. Run 'skillhub push' first.");
        process.exit(1);
      }

      ensureAuthenticated();
      const client = getClient();

      // Get current status
      const statusSpin = spinner("Checking skill status...");
      let skillData;
      try {
        skillData = await client.getMySkill(config.skill_id);
        statusSpin.stop();
      } catch (err) {
        statusSpin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }

      if (skillData.skill.status === "published") {
        info(`Skill is already published!`);
        console.log();
        console.log(colors.dim(`  URL: https://skillhub.club/skills/${skillData.skill.slug}`));
        return;
      }

      // Show skill info
      console.log();
      console.log(colors.bold("About to publish:"));
      console.log();
      console.log(formatTable([
        [colors.dim("Name:"), colors.bold(skillData.skill.name)],
        [colors.dim("Slug:"), skillData.skill.slug],
        [colors.dim("Category:"), skillData.skill.category || "-"],
        [colors.dim("Files:"), `${skillData.files.length}`],
        [colors.dim("Current:"), formatStatus(skillData.skill.status)],
      ]));
      console.log();

      // Confirm
      if (!options.yes) {
        warn("Publishing will make your skill visible to everyone.");
        const { confirm } = await prompts({
          type: "confirm",
          name: "confirm",
          message: "Publish this skill?",
          initial: true,
        });

        if (!confirm) {
          info("Cancelled.");
          return;
        }
      }

      // Publish
      const pubSpin = spinner("Publishing...");
      try {
        const result = await client.publishSkill(config.skill_id);
        pubSpin.stop();

        // Update local config
        saveLocalConfig({
          ...config,
          visibility: "public",
        }, cwd);

        success(`Published successfully!`);
        console.log();
        console.log(`  ${colors.bold("URL:")} ${colors.primary(result.public_url)}`);
        console.log();
        info("Share this URL to let others use your skill.");
      } catch (err) {
        pubSpin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // Unpublish command
  program
    .command("unpublish")
    .description("Remove skill from public directory")
    .option("-y, --yes", "Skip confirmation")
    .action(async (options) => {
      const cwd = process.cwd();

      // Check login
      if (!isLoggedIn()) {
        error("Not logged in. Run 'skillhub login' first.");
        process.exit(1);
      }

      // Check if initialized
      if (!isSkillProject(cwd)) {
        error("Not a skill project. Run 'skillhub init' first.");
        process.exit(1);
      }

      const config = getLocalConfig(cwd)!;
      
      if (!config.skill_id) {
        error("Skill not pushed yet.");
        process.exit(1);
      }

      ensureAuthenticated();
      const client = getClient();

      // Get current status
      const statusSpin = spinner("Checking skill status...");
      let skillData;
      try {
        skillData = await client.getMySkill(config.skill_id);
        statusSpin.stop();
      } catch (err) {
        statusSpin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }

      if (skillData.skill.status !== "published") {
        info(`Skill is not published. Current status: ${formatStatus(skillData.skill.status)}`);
        return;
      }

      // Confirm
      if (!options.yes) {
        warn("Unpublishing will remove your skill from the public directory.");
        const { confirm } = await prompts({
          type: "confirm",
          name: "confirm",
          message: "Unpublish this skill?",
          initial: false,
        });

        if (!confirm) {
          info("Cancelled.");
          return;
        }
      }

      // Unpublish
      const unpubSpin = spinner("Unpublishing...");
      try {
        await client.unpublishSkill(config.skill_id);
        unpubSpin.stop();

        // Update local config
        saveLocalConfig({
          ...config,
          visibility: "private",
        }, cwd);

        success(`Unpublished. Skill is now private.`);
      } catch (err) {
        unpubSpin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
