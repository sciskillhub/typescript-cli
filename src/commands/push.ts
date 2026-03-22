/**
 * Push Command
 * 
 * Upload local files to remote skill
 */

import { Command } from "commander";
import prompts from "prompts";
import { 
  isSkillProject, 
  getLocalConfig, 
  saveLocalConfig,
  isLoggedIn,
  getAuth,
} from "../lib/config.js";
import { getClient, ensureAuthenticated } from "../lib/api.js";
import { scanFiles, compareFiles, formatBytes, hasRequiredFiles } from "../lib/files.js";
import { 
  success, 
  error, 
  info, 
  warn, 
  spinner, 
  colors, 
  formatTable,
  formatStatus,
} from "../utils/ui.js";

export function registerPushCommand(program: Command): void {
  program
    .command("push")
    .description("Push local files to remote skill")
    .option("-m, --message <msg>", "Change summary message")
    .option("-f, --force", "Force push without confirmation")
    .option("--create", "Create new skill if not exists")
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

      // Check required files
      const required = hasRequiredFiles(cwd);
      if (!required.valid) {
        error(`Missing required files: ${required.missing.join(", ")}`);
        info("Create a SKILL.md file with your skill content.");
        process.exit(1);
      }

      const config = getLocalConfig(cwd)!;
      
      // Scan local files
      const spin = spinner("Scanning files...");
      let localFiles;
      try {
        // Get file size limit based on user tier
        const auth = getAuth();
        const maxFileSize = auth?.user?.tier === "pro" ? 1024 * 1024 : 100 * 1024; // 1MB or 100KB
        
        localFiles = await scanFiles({ 
          dir: cwd, 
          maxFileSize,
          includeContent: true,
        });
        spin.stop();
      } catch (err) {
        spin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }

      if (localFiles.length === 0) {
        error("No files found to push.");
        info("Make sure you have .md, .py, .sh, .js, .ts, .json, .yaml, or .txt files.");
        process.exit(1);
      }

      ensureAuthenticated();
      const client = getClient();

      // Check if skill exists remotely
      let remoteStatus = null;
      if (config.skill_id) {
        const statusSpin = spinner("Checking remote status...");
        try {
          remoteStatus = await client.getSkillStatus(config.skill_id);
          statusSpin.stop();
        } catch {
          statusSpin.stop();
          // Skill might not exist or we don't have access
          if (!options.create) {
            warn("Could not find remote skill. Use --create to create a new one.");
          }
        }
      }

      // Compare files
      let changes;
      if (remoteStatus) {
        changes = compareFiles(localFiles, remoteStatus.files);
      } else {
        changes = {
          added: localFiles,
          modified: [] as typeof localFiles,
          deleted: [] as string[],
          unchanged: [] as string[],
        };
      }

      const hasChanges = 
        changes.added.length > 0 || 
        changes.modified.length > 0 || 
        changes.deleted.length > 0;

      if (!hasChanges && remoteStatus) {
        success("Everything up to date!");
        return;
      }

      // Show summary
      console.log();
      console.log(colors.bold("Changes to push:"));
      console.log();

      if (changes.added.length > 0) {
        console.log(colors.success(`  + ${changes.added.length} new file(s)`));
        changes.added.forEach((f) => {
          console.log(colors.success(`    + ${f.filepath}`));
        });
      }

      if (changes.modified.length > 0) {
        console.log(colors.warning(`  ~ ${changes.modified.length} modified file(s)`));
        changes.modified.forEach((f) => {
          console.log(colors.warning(`    ~ ${f.filepath}`));
        });
      }

      if (changes.deleted.length > 0) {
        console.log(colors.error(`  - ${changes.deleted.length} deleted file(s)`));
        changes.deleted.forEach((p) => {
          console.log(colors.error(`    - ${p}`));
        });
      }

      const totalSize = localFiles.reduce((sum, f) => sum + f.file_size, 0);
      console.log();
      console.log(colors.dim(`  Total: ${localFiles.length} files, ${formatBytes(totalSize)}`));
      console.log();

      // Confirm push
      if (!options.force) {
        const { confirm } = await prompts({
          type: "confirm",
          name: "confirm",
          message: remoteStatus 
            ? "Push these changes?" 
            : `Create new skill "${config.name}"?`,
          initial: true,
        });

        if (!confirm) {
          info("Cancelled.");
          return;
        }
      }

      // Get change message
      let message = options.message;
      if (!message && !options.force) {
        const { msg } = await prompts({
          type: "text",
          name: "msg",
          message: "Change summary (optional):",
        });
        message = msg;
      }

      // Push files
      const pushSpin = spinner("Pushing files...");
      try {
        const result = await client.pushSkill({
          skill_id: config.skill_id,
          name: config.name,
          description: config.description,
          description_zh: config.description_zh,
          category: config.category,
          tags: config.tags,
          files: localFiles.map((f) => ({
            filepath: f.filepath,
            content: f.content,
            content_hash: f.content_hash,
          })),
          change_summary: message,
          source: "cli",
        });

        pushSpin.stop();

        // Update local config with remote info
        saveLocalConfig({
          ...config,
          skill_id: result.skill.id,
          slug: result.skill.slug,
        }, cwd);

        success(`Pushed successfully!`);
        console.log();
        console.log(formatTable([
          [colors.dim("Skill:"), colors.bold(result.skill.slug)],
          [colors.dim("Version:"), `v${result.version}`],
          [colors.dim("Files:"), `${result.file_count}`],
          [colors.dim("Size:"), formatBytes(result.total_size)],
          [colors.dim("Status:"), formatStatus(result.skill.status)],
        ]));
        console.log();

        if (result.skill.status === "draft") {
          info(`Run 'skillhub publish' to make your skill public.`);
        }
      } catch (err) {
        pushSpin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
