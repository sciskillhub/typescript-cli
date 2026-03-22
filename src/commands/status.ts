/**
 * Status Command
 * 
 * Show local vs remote diff
 */

import { Command } from "commander";
import { 
  isSkillProject, 
  getLocalConfig,
  isLoggedIn,
} from "../lib/config.js";
import { getClient, ensureAuthenticated } from "../lib/api.js";
import { scanFiles, compareFiles, formatBytes } from "../lib/files.js";
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
  formatDate,
} from "../utils/ui.js";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show local vs remote status")
    .action(async () => {
      const cwd = process.cwd();

      // Check if initialized
      if (!isSkillProject(cwd)) {
        info("Not a skill project. Run 'skillhub init' to initialize.");
        return;
      }

      const config = getLocalConfig(cwd)!;
      
      console.log();
      console.log(colors.bold(config.name || "Unnamed Skill"));
      console.log();

      // Show local config
      console.log(formatTable([
        [colors.dim("Local config:"), ""],
        [colors.dim("  Name:"), config.name || "-"],
        [colors.dim("  Slug:"), config.slug || "(not pushed)"],
        [colors.dim("  Category:"), config.category || "-"],
        [colors.dim("  Visibility:"), config.visibility || "private"],
      ]));
      console.log();

      if (!config.skill_id) {
        warn("Not linked to remote. Run 'skillhub push' to create remote skill.");
        return;
      }

      // Check login for remote status
      if (!isLoggedIn()) {
        warn("Not logged in. Run 'skillhub login' to see remote status.");
        return;
      }

      ensureAuthenticated();
      const client = getClient();

      // Scan local files
      const localSpin = spinner("Scanning local files...");
      let localFiles;
      try {
        localFiles = await scanFiles({ dir: cwd, includeContent: false });
        localSpin.stop();
      } catch (err) {
        localSpin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }

      // Get remote status
      const remoteSpin = spinner("Fetching remote status...");
      let remoteStatus;
      try {
        remoteStatus = await client.getSkillStatus(config.skill_id);
        remoteSpin.stop();
      } catch (err) {
        remoteSpin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }

      // Show remote info
      console.log(formatTable([
        [colors.dim("Remote:"), ""],
        [colors.dim("  Status:"), formatStatus(remoteStatus.skill.status)],
        [colors.dim("  Visibility:"), formatVisibility(remoteStatus.skill.visibility)],
        [colors.dim("  Version:"), `v${remoteStatus.current_version}`],
        [colors.dim("  Updated:"), formatDate(remoteStatus.updated_at)],
      ]));
      console.log();

      // Compare files
      const changes = compareFiles(localFiles, remoteStatus.files);

      const hasChanges = 
        changes.added.length > 0 || 
        changes.modified.length > 0 || 
        changes.deleted.length > 0;

      if (!hasChanges) {
        success("Everything up to date with remote.");
        return;
      }

      // Show changes
      console.log(colors.bold("Changes:"));
      console.log();

      if (changes.added.length > 0) {
        console.log(colors.success(`  New files (${changes.added.length}):`));
        changes.added.forEach((f) => {
          console.log(colors.success(`    + ${f.filepath}`));
        });
      }

      if (changes.modified.length > 0) {
        console.log(colors.warning(`  Modified (${changes.modified.length}):`));
        changes.modified.forEach((f) => {
          console.log(colors.warning(`    ~ ${f.filepath}`));
        });
      }

      if (changes.deleted.length > 0) {
        console.log(colors.error(`  Deleted (${changes.deleted.length}):`));
        changes.deleted.forEach((p) => {
          console.log(colors.error(`    - ${p}`));
        });
      }

      if (changes.unchanged.length > 0) {
        console.log(colors.dim(`  Unchanged: ${changes.unchanged.length} file(s)`));
      }

      console.log();
      info(`Run 'skillhub push' to sync changes to remote.`);
    });
}
