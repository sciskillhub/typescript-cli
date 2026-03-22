/**
 * Install Command
 * 
 * Install a skill to local agent (Claude, Cursor, Codex, etc.)
 * Similar to: npx skills add <owner/repo>
 */

import { Command } from "commander";
import prompts from "prompts";
import { existsSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { getClient } from "../lib/api.js";
import {
  success,
  error,
  info,
  warn,
  spinner,
  colors,
  box,
} from "../utils/ui.js";

// Supported agents with their install paths
const AGENTS = {
  claude: {
    name: "Claude Code",
    personalPath: ".claude/skills",
    projectPath: ".claude/skills",
    configFile: "SKILL.md",
  },
  cursor: {
    name: "Cursor",
    personalPath: ".cursor/skills",
    projectPath: ".cursor/skills",
    configFile: "SKILL.md",
  },
  codex: {
    name: "Codex CLI",
    personalPath: ".codex/skills",
    projectPath: ".codex/skills",
    configFile: "SKILL.md",
  },
  gemini: {
    name: "Gemini CLI",
    personalPath: ".gemini/skills",
    projectPath: ".gemini/skills",
    configFile: "SKILL.md",
  },
  copilot: {
    name: "GitHub Copilot",
    personalPath: ".copilot/skills",
    projectPath: ".copilot/skills",
    configFile: "SKILL.md",
  },
  windsurf: {
    name: "Windsurf",
    personalPath: ".windsurf/skills",
    projectPath: ".windsurf/skills",
    configFile: "SKILL.md",
  },
  cline: {
    name: "Cline",
    personalPath: ".cline/skills",
    projectPath: ".cline/skills",
    configFile: "SKILL.md",
  },
  roo: {
    name: "Roo Code",
    personalPath: ".roo/skills",
    projectPath: ".roo/skills",
    configFile: "SKILL.md",
  },
  opencode: {
    name: "OpenCode",
    personalPath: ".config/opencode/skills",
    projectPath: ".opencode/skills",
    configFile: "SKILL.md",
  },
} as const;

type AgentKey = keyof typeof AGENTS;

export function registerInstallCommand(program: Command): void {
  program
    .command("install <skill>")
    .alias("add")
    .alias("i")
    .description("Install a skill to your local agent")
    .option("-a, --agent <agent>", "Target agent (claude, cursor, codex, gemini, copilot, windsurf, cline, roo, opencode)")
    .option("-p, --project", "Install to project directory (default: personal)")
    .option("-d, --dir <path>", "Custom install directory")
    .option("-y, --yes", "Skip confirmation prompts")
    .option("--list-agents", "List all supported agents")
    .action(async (skill: string, options) => {
      // List agents
      if (options.listAgents) {
        console.log();
        console.log(colors.bold("Supported Agents:"));
        console.log();
        for (const [key, agent] of Object.entries(AGENTS)) {
          console.log(`  ${colors.code(key.padEnd(12))} ${agent.name}`);
        }
        console.log();
        return;
      }

      await installSkill(skill, options);
    });
}

async function installSkill(
  skillRef: string,
  options: {
    agent?: string;
    project?: boolean;
    dir?: string;
    yes?: boolean;
  }
): Promise<void> {
  const client = getClient();

  // Parse skill reference: can be "owner/repo/skill-name", "slug", or "id"
  const spin = spinner(`Fetching skill: ${colors.code(skillRef)}`);

  try {
    // Use public API to get skill info (no auth required)
    const skillDetail = await client.getPublicSkill(skillRef);
    spin.stop();

    const skillName = skillDetail.name;
    const skillSlug = skillDetail.slug;

    console.log();
    console.log(colors.bold(`📦 ${skillName}`));
    console.log(colors.dim(`   ${skillSlug}`));
    console.log();

    // Determine target agent
    let targetAgent: AgentKey;

    if (options.agent) {
      const agent = options.agent.toLowerCase() as AgentKey;
      if (!AGENTS[agent]) {
        error(`Unknown agent: ${options.agent}`);
        console.log(`Supported: ${Object.keys(AGENTS).join(", ")}`);
        process.exit(1);
      }
      targetAgent = agent;
    } else if (!options.yes) {
      // Prompt for agent selection
      const agentChoices = Object.entries(AGENTS).map(([key, agent]) => ({
        title: `${agent.name}`,
        value: key,
        description: `Install to ${agent.personalPath}`,
      }));

      const { agent } = await prompts({
        type: "select",
        name: "agent",
        message: "Select target agent:",
        choices: agentChoices,
        initial: 0,
      }, {
        onCancel: () => {
          info("Cancelled.");
          process.exit(0);
        },
      });

      targetAgent = agent as AgentKey;
    } else {
      // Default to claude
      targetAgent = "claude";
    }

    // Determine install location (personal vs project)
    let installLocation: "personal" | "project";
    let installPath: string;

    if (options.dir) {
      // Custom directory
      installPath = options.dir;
      installLocation = "project";
    } else if (options.project) {
      // Project directory
      installLocation = "project";
      installPath = join(process.cwd(), AGENTS[targetAgent].projectPath);
    } else if (!options.yes) {
      // Prompt for location
      const { location } = await prompts({
        type: "select",
        name: "location",
        message: "Install location:",
        choices: [
          {
            title: "Personal (global)",
            value: "personal",
            description: `~/${AGENTS[targetAgent].personalPath}`,
          },
          {
            title: "Project (current directory)",
            value: "project",
            description: `./${AGENTS[targetAgent].projectPath}`,
          },
        ],
        initial: 0,
      }, {
        onCancel: () => {
          info("Cancelled.");
          process.exit(0);
        },
      });

      installLocation = location as "personal" | "project";

      if (installLocation === "personal") {
        installPath = join(homedir(), AGENTS[targetAgent].personalPath);
      } else {
        installPath = join(process.cwd(), AGENTS[targetAgent].projectPath);
      }
    } else {
      // Default to personal
      installLocation = "personal";
      installPath = join(homedir(), AGENTS[targetAgent].personalPath);
    }

    // Create skill directory
    const skillDir = join(installPath, skillSlug);

    // Check if already exists
    if (existsSync(skillDir)) {
      if (!options.yes) {
        const { overwrite } = await prompts({
          type: "confirm",
          name: "overwrite",
          message: `Skill already exists at ${skillDir}. Overwrite?`,
          initial: false,
        });

        if (!overwrite) {
          info("Cancelled.");
          return;
        }
      } else {
        warn(`Overwriting existing skill at ${skillDir}`);
      }
    }

    // Get skill content from the detail we already fetched
    const installSpin = spinner("Downloading skill content...");

    const content = skillDetail.skill_md_raw;

    installSpin.stop();

    if (!content) {
      error("Skill content is not available.");
      process.exit(1);
    }

    // Create directories
    mkdirSync(skillDir, { recursive: true });

    // Write SKILL.md
    const skillFilePath = join(skillDir, AGENTS[targetAgent].configFile);
    writeFileSync(skillFilePath, content);

    // Success output
    console.log();
    success(`Installed ${colors.bold(skillName)} to ${colors.code(AGENTS[targetAgent].name)}`);
    console.log();
    console.log(colors.dim("  Location:"), skillDir);
    console.log(colors.dim("  File:    "), AGENTS[targetAgent].configFile);
    console.log();

    // Show next steps
    const boxContent = installLocation === "personal"
      ? `The skill is now available globally.\nRestart your agent to use it.`
      : `The skill is installed in this project.\nIt will be available when working in this directory.`;

    console.log(box(boxContent, colors.success("✓ Installed")));
    console.log();

  } catch (err) {
    spin.stop();

    if (err instanceof Error && err.message.includes("404")) {
      error(`Skill not found: ${skillRef}`);
      console.log();
      info("Try searching for skills:");
      console.log(`  ${colors.code("sciskillhub search <query>")}`);
    } else {
      error(err instanceof Error ? err.message : String(err));
    }
    process.exit(1);
  }
}
