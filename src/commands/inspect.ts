/**
 * Inspect Command
 *
 * Show local skill metadata and files for the current directory.
 * Also can list installed skills for a specific agent.
 */

import { Command } from "commander";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getLocalConfig, isSkillProject } from "../lib/config.js";
import { AGENTS, type AgentKey } from "./install.js";
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

interface InstalledSkill {
  name: string;
  path: string;
  configFile: string;
  hasSkillFile: boolean;
  size: number;
  modifiedAt: Date | null;
}

function listAgentSkills(agentKey: AgentKey, scope: "personal" | "project" = "personal"): InstalledSkill[] {
  const agent = AGENTS[agentKey];
  const basePath = scope === "personal"
    ? join(homedir(), agent.personalPath)
    : join(process.cwd(), agent.projectPath);

  if (!existsSync(basePath)) {
    return [];
  }

  const skills: InstalledSkill[] = [];
  const entries = readdirSync(basePath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillPath = join(basePath, entry.name);
    const skillFile = join(skillPath, agent.configFile);
    const hasSkillFile = existsSync(skillFile);

    let size = 0;
    let modifiedAt: Date | null = null;

    try {
      const stat = statSync(skillPath);
      modifiedAt = stat.mtime;

      // Calculate total size recursively
      const calcSize = (dir: string): number => {
        let total = 0;
        const files = readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const filePath = join(dir, file.name);
          if (file.isDirectory()) {
            total += calcSize(filePath);
          } else if (file.isFile()) {
            try {
              total += statSync(filePath).size;
            } catch {}
          }
        }
        return total;
      };

      size = calcSize(skillPath);
    } catch {}

    skills.push({
      name: entry.name,
      path: skillPath,
      configFile: agent.configFile,
      hasSkillFile,
      size,
      modifiedAt,
    });
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

async function listInstalledSkills(
  agentInfo: { key: AgentKey; name: string; personalPath: string; projectPath: string; configFile: string },
  options: { project?: boolean; json?: boolean }
): Promise<void> {
  const scope = options.project ? "project" : "personal";
  const skills = listAgentSkills(agentInfo.key, scope);
  const basePath = scope === "personal"
    ? join(homedir(), agentInfo.personalPath)
    : join(process.cwd(), agentInfo.projectPath);

  if (options.json) {
    console.log(JSON.stringify({
      agent: agentInfo.key,
      scope,
      path: basePath,
      count: skills.length,
      skills: skills.map(s => ({
        name: s.name,
        path: s.path,
        hasSkillFile: s.hasSkillFile,
        size: s.size,
        modifiedAt: s.modifiedAt?.toISOString() || null,
      })),
    }, null, 2));
    return;
  }

  console.log();
  console.log(colors.bold(`${agentInfo.name} Skills (${scope})`));
  console.log(colors.dim(`  Path: ${scope === "personal" ? "~" : "."}/${scope === "personal" ? agentInfo.personalPath : agentInfo.projectPath}`));
  console.log();

  if (skills.length === 0) {
    info(`No skills installed for ${agentInfo.name} in ${scope} directory.`);
    console.log();
    info(`Install a skill with: ${colors.code(`sciskillhub install <skill> --agent ${agentInfo.key}`)}`);
    return;
  }

  const rows = skills.map((skill, idx) => [
    colors.dim(`${idx + 1}.`),
    colors.bold(skill.name),
    skill.hasSkillFile ? colors.success("✓") : colors.warning("✗"),
    formatSkillBytes(skill.size),
    skill.modifiedAt ? formatSkillDate(skill.modifiedAt) : "-",
  ]);

  console.log(formatTable(rows, {
    headers: ["#", "Name", "File", "Size", "Modified"],
  }));
  console.log();
  info(`Total: ${skills.length} skill${skills.length !== 1 ? "s" : ""} installed`);
}

function formatSkillBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSkillDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function registerInspectCommand(program: Command): void {
  program
    .command("inspect")
    .description("Inspect local skill in current directory or list installed skills for an agent")
    .option("-a, --agent <agent>", "Inspect for a specific agent target")
    .option("--list", "List installed skills for the specified agent")
    .option("--project", "List skills in project directory (use with --agent --list)")
    .option("--json", "Output as JSON")
    .option("--files", "Show scanned local files")
    .option("--content", "Show main SKILL.md or README.md content")
    .action(async (options) => {
      const cwd = process.cwd();
      let agentInfo:
        | { key: AgentKey; name: string; personalPath: string; projectPath: string; configFile: string }
        | null = null;

      if (options.agent) {
        const agentKey = options.agent.toLowerCase() as AgentKey;
        const agent = AGENTS[agentKey];

        if (!agent) {
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

        // If --list is specified or we're not in a skill directory, list installed skills
        if (options.list || !isSkillProject(cwd)) {
          await listInstalledSkills(agentInfo, options);
          return;
        }
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
        info("Run 'sciskillhub init' to initialize one.");
        info("Or use 'sciskillhub inspect --agent <agent> --list' to list installed skills.");
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
        [colors.dim("Category:"), config?.category || "-"],
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

      if (config?.tags?.length) {
        console.log(`${colors.dim("Tags:")} ${config.tags.join(", ")}`);
        console.log();
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
