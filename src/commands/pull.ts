/**
 * Pull Command
 * 
 * Download remote files to local directory
 */

import { Command } from "commander";
import prompts from "prompts";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { 
  isSkillProject, 
  getLocalConfig, 
  saveLocalConfig,
  isLoggedIn,
} from "../lib/config.js";
import { getClient, ensureAuthenticated } from "../lib/api.js";
import { scanFiles, compareFiles, formatBytes, hashContent } from "../lib/files.js";
import { 
  success, 
  error, 
  info, 
  warn, 
  spinner, 
  colors,
} from "../utils/ui.js";

export function registerPullCommand(program: Command): void {
  program
    .command("pull")
    .description("Pull remote files to local directory")
    .option("-v, --version <number>", "Pull specific version", parseInt)
    .option("-f, --force", "Overwrite local changes without confirmation")
    .action(async (options) => {
      const cwd = process.cwd();

      // Check login
      if (!isLoggedIn()) {
        error("Not logged in. Run 'skillhub login' first.");
        process.exit(1);
      }

      // Check if initialized
      if (!isSkillProject(cwd)) {
        error("Not a skill project. Run 'skillhub init --link <skill-id>' first.");
        process.exit(1);
      }

      const config = getLocalConfig(cwd)!;
      
      if (!config.skill_id) {
        error("No skill linked. Run 'skillhub init --link <skill-id>' or 'skillhub push' first.");
        process.exit(1);
      }

      ensureAuthenticated();
      const client = getClient();

      // Scan local files first
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

      // Pull remote files
      const pullSpin = spinner("Fetching remote files...");
      let remoteData;
      try {
        remoteData = await client.pullSkill(config.skill_id, options.version);
        pullSpin.stop();
      } catch (err) {
        pullSpin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }

      // Compare with local
      const remoteFiles = remoteData.files.map((f) => ({
        filepath: f.filepath,
        content_hash: f.content_hash,
      }));

      const localForCompare = localFiles.map((f) => ({
        filepath: f.filepath,
        content: "",
        content_hash: f.content_hash,
        file_size: f.file_size,
      }));

      // Reverse comparison: find files that differ from remote
      const localMap = new Map(localFiles.map((f) => [f.filepath, f.content_hash]));
      
      const toUpdate: string[] = [];
      const toCreate: string[] = [];
      const localOnly: string[] = [];

      for (const remote of remoteData.files) {
        const localHash = localMap.get(remote.filepath);
        if (!localHash) {
          toCreate.push(remote.filepath);
        } else if (localHash !== remote.content_hash) {
          toUpdate.push(remote.filepath);
        }
      }

      // Files that exist locally but not remotely
      const remoteSet = new Set(remoteData.files.map((f) => f.filepath));
      for (const local of localFiles) {
        if (!remoteSet.has(local.filepath)) {
          localOnly.push(local.filepath);
        }
      }

      const hasChanges = toUpdate.length > 0 || toCreate.length > 0;

      if (!hasChanges) {
        success("Everything up to date!");
        return;
      }

      // Show changes
      console.log();
      console.log(colors.bold(`Pulling v${remoteData.version}:`));
      console.log();

      if (toCreate.length > 0) {
        console.log(colors.success(`  + ${toCreate.length} new file(s)`));
        toCreate.forEach((p) => console.log(colors.success(`    + ${p}`)));
      }

      if (toUpdate.length > 0) {
        console.log(colors.warning(`  ~ ${toUpdate.length} modified file(s)`));
        toUpdate.forEach((p) => console.log(colors.warning(`    ~ ${p}`)));
      }

      if (localOnly.length > 0) {
        console.log(colors.dim(`  ? ${localOnly.length} local-only file(s) (will be kept)`));
      }

      console.log();

      // Confirm
      if (!options.force && toUpdate.length > 0) {
        const { confirm } = await prompts({
          type: "confirm",
          name: "confirm",
          message: "Overwrite local files with remote versions?",
          initial: true,
        });

        if (!confirm) {
          info("Cancelled.");
          return;
        }
      }

      // Write files
      const writeSpin = spinner("Writing files...");
      try {
        for (const file of remoteData.files) {
          const filepath = join(cwd, file.filepath);
          const dir = dirname(filepath);

          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }

          writeFileSync(filepath, file.content);
        }

        writeSpin.stop();

        // Update local config
        saveLocalConfig({
          ...config,
          name: remoteData.skill.name,
          slug: remoteData.skill.slug,
          description: remoteData.skill.description,
          description_zh: remoteData.skill.description_zh,
          category: remoteData.skill.category,
          tags: remoteData.skill.tags,
          visibility: remoteData.skill.visibility as "private" | "unlisted" | "public",
        }, cwd);

        success(`Pulled v${remoteData.version} successfully!`);
        console.log();
        info(`${toCreate.length} created, ${toUpdate.length} updated`);
      } catch (err) {
        writeSpin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
