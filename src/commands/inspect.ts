/**
 * Inspect Command
 *
 * Show local skill metadata and files for the current directory.
 */

import { Command } from "commander";
import { getLocalConfig, isSkillProject } from "../lib/config.js";
import { AGENTS, type AgentKey, resolveAgentKey } from "./install.js";
import {
  getMainSkillFile,
  hasRequiredFiles,
  scanFiles,
  formatBytes as formatFileBytes,
} from "../lib/files.js";
import {
  colors,
  error,
  formatTable,
  info,
  warn,
} from "../utils/ui.js";

export function registerInspectCommand(program: Command): void {
  program
    .command("inspect")
    .description("Inspect local skill in current directory")
    .option("-a, --agent <agent>", "Show install info for a specific agent target")
    .option("--json", "Output as JSON")
    .option("--files", "Show scanned local files")
    .option("--content", "Show main SKILL.md or README.md content")
    .action(async (options) => {
      const cwd = process.cwd();
      let agentInfo:
        | { key: AgentKey; name: string; personalPath: string; projectPath: string; configFile: string }
        | null = null;

      if (options.agent) {
        const agentKey = resolveAgentKey(options.agent.toLowerCase());
        const agent = agentKey ? AGENTS[agentKey] : null;

        if (!agent || !agentKey) {
          error(`Unknown agent: ${options.agent}`);
          console.log(`Supported agents: ${Object.keys(AGENTS).join(", ")}`);
          process.exit(1);
        }

        agentInfo = {
          key: agentKey,
          name: agent.name,
          personalPath: agent.personalPath,
          projectPath: agent.projectPath,
          configFile: agent.configFile,
        };
      }

      const config = getLocalConfig(cwd);
      const requiredFiles = hasRequiredFiles(cwd);
      const mainFile = getMainSkillFile(cwd);
      const initialized = isSkillProject(cwd);

      if (!initialized && !mainFile) {
        if (options.json) {
          console.log(JSON.stringify({
            valid: false,
            initialized: false,
            message: "No local skill found in current directory.",
          }, null, 2));
          return;
        }

        info("No local skill found in current directory.");
        info("Run 'sciskill init' to initialize one.");
        info("Or use 'sciskill list --agent <agent>' to list installed skills.");
        return;
      }

      let files = [] as Awaited<ReturnType<typeof scanFiles>>;
      try {
        files = await scanFiles({ dir: cwd, includeContent: false });
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }

      const payload = {
        valid: requiredFiles.valid,
        initialized,
        agent: agentInfo,
        config: config || null,
        main_file: mainFile
          ? {
              filename: mainFile.filename,
              size: Buffer.byteLength(mainFile.content, "utf-8"),
              content: options.content ? mainFile.content : undefined,
            }
          : null,
        files: files.map((file) => ({
          filepath: file.filepath,
          size: file.file_size,
          content_hash: file.content_hash,
        })),
      };

      if (options.json) {
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      console.log();
      console.log(colors.bold(config?.name || "Local Skill"));
      console.log();

      console.log(formatTable([
        [colors.dim("Agent:"), agentInfo?.key || "-"],
        [colors.dim("Initialized:"), initialized ? colors.success("yes") : colors.warning("no")],
        [colors.dim("Valid skill files:"), requiredFiles.valid ? colors.success("yes") : colors.warning("no")],
        [colors.dim("Name:"), config?.name || "-"],
        [colors.dim("Slug:"), config?.slug || "-"],
        [colors.dim("Visibility:"), config?.visibility || "private"],
        [colors.dim("Main file:"), mainFile?.filename || "-"],
        [colors.dim("Scanned files:"), `${files.length}`],
      ]));
      console.log();

      if (agentInfo) {
        console.log(formatTable([
          [colors.dim("Agent target:"), agentInfo.name],
          [colors.dim("Agent config file:"), agentInfo.configFile],
          [colors.dim("Personal install path:"), `~/${agentInfo.personalPath}`],
          [colors.dim("Project install path:"), `./${agentInfo.projectPath}`],
        ]));
        console.log();
      }

      if (!requiredFiles.valid) {
        warn("Missing SKILL.md or README.md.");
      }

      if (options.files && files.length > 0) {
        const rows = files.map((file) => [
          colors.code(file.filepath),
          formatFileBytes(file.file_size),
        ]);

        console.log(colors.bold("Files"));
        console.log();
        console.log(formatTable(rows, {
          headers: ["Path", "Size"],
        }));
        console.log();
      }

      if (options.content) {
        if (!mainFile) {
          warn("No main skill file found.");
        } else {
          console.log(colors.bold(`Content: ${mainFile.filename}`));
          console.log();
          console.log(mainFile.content);
          console.log();
        }
      }
    });
}
