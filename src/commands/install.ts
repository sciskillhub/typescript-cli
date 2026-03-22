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
import { getClient, UserSkillDetail } from "../lib/api.js";
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
    .option("-p, --platform <platform>", "Target platform (claude, cursor, codex, gemini, copilot, windsurf, cline, roo, opencode)")
    .option("--project", "Install to project directory (default: personal)")
    .option("-d, --dir <path>", "Custom install directory")
    .option("-y, --yes", "Skip confirmation prompts")
    .option("--list-platforms", "List all supported platforms")
    .action(async (skill: string, options) => {
      // List platforms
      if (options.listPlatforms) {
        console.log();
        console.log(colors.bold("Supported Platforms:"));
        console.log();
        for (const [key, platform] of Object.entries(AGENTS)) {
          console.log(`  ${colors.code(key.padEnd(12))} ${platform.name}`);
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
    platform?: string;
    project?: boolean;
    dir?: string;
    yes?: boolean;
  }
): Promise<void> {
  const client = getClient();

  let skillDetail: UserSkillDetail;

  // First, try to get skill directly by slug
  const spin = spinner(`Fetching skill: ${colors.code(skillRef)}`);

  try {
    skillDetail = await client.getPublicSkill(skillRef);
    spin.stop();
  } catch (err) {
    // If not found, search by name
    spin.stop();

    if (err instanceof Error && err.message.includes("404")) {
      // Search for skills by name using catalog
      const searchSpin = spinner(`Searching for "${colors.code(skillRef)}"...`);
      const searchResults = await client.listCatalogSkills({
        query: skillRef,
        limit: 10,
      });
      searchSpin.stop();

      if (searchResults.length === 0) {
        error(`No skills found matching: ${skillRef}`);
        console.log();
        info("Try searching for skills:");
        console.log(`  ${colors.code("sciskillhub list skill --query <query>")}`);
        process.exit(1);
      }

      if (searchResults.length === 1) {
        // Only one result, use it
        const found = searchResults[0];
        const fetchSpin = spinner(`Found: ${colors.bold(found.name)}`);
        skillDetail = await client.getPublicSkill(found.slug);
        fetchSpin.stop();
      } else {
        // Multiple results, let user choose
        if (options.yes) {
          error(`Multiple skills found matching "${skillRef}". Please be more specific or run without -y flag to choose.`);
          console.log();
          for (const result of searchResults) {
            console.log(`  ${colors.code(result.slug)}`);
            console.log(`    ${result.name}${result.description ? `: ${result.description}` : ""}`);
          }
          process.exit(1);
        }

        console.log();
        console.log(colors.bold(`Found ${searchResults.length} skills matching "${skillRef}":`));
        console.log();

        const choices = searchResults.map((skill) => {
          const shortSlug = skill.slug.split("/").slice(-2).join("/");
          return {
            title: skill.name,
            value: skill.slug,
            description: `${shortSlug}${skill.category ? ` • ${skill.category}` : ""}`,
          };
        });

        const { selectedSlug } = await prompts({
          type: "select",
          name: "selectedSlug",
          message: "Select a skill to install:",
          choices,
          initial: 0,
        }, {
          onCancel: () => {
            info("Cancelled.");
            process.exit(0);
          },
        });

        const fetchSpin = spinner(`Fetching skill: ${colors.code(selectedSlug)}`);
        skillDetail = await client.getPublicSkill(selectedSlug);
        fetchSpin.stop();
      }
    } else {
      throw err;
    }
  }

  const skillName = skillDetail.name;
  const skillSlug = skillDetail.slug;

  console.log();
  console.log(colors.bold(`📦 ${skillName}`));
  console.log(colors.dim(`   ${skillSlug}`));
  console.log();

  // Determine target platform
  let targetPlatform: AgentKey;

  if (options.platform) {
    const platform = options.platform.toLowerCase() as AgentKey;
    if (!AGENTS[platform]) {
      error(`Unknown platform: ${options.platform}`);
      console.log(`Supported: ${Object.keys(AGENTS).join(", ")}`);
      process.exit(1);
    }
    targetPlatform = platform;
  } else if (!options.yes) {
    // Prompt for platform selection
    const platformChoices = Object.entries(AGENTS).map(([key, platform]) => ({
      title: `${platform.name}`,
      value: key,
      description: `Install to ${platform.personalPath}`,
    }));

    const { platform } = await prompts({
      type: "select",
      name: "platform",
      message: "Select target platform:",
      choices: platformChoices,
      initial: 0,
    }, {
      onCancel: () => {
        info("Cancelled.");
        process.exit(0);
      },
    });

    targetPlatform = platform as AgentKey;
  } else {
    // Default to claude
    targetPlatform = "claude";
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
    installPath = join(process.cwd(), AGENTS[targetPlatform].projectPath);
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
          description: `~/${AGENTS[targetPlatform].personalPath}`,
        },
        {
          title: "Project (current directory)",
          value: "project",
          description: `./${AGENTS[targetPlatform].projectPath}`,
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
      installPath = join(homedir(), AGENTS[targetPlatform].personalPath);
    } else {
      installPath = join(process.cwd(), AGENTS[targetPlatform].projectPath);
    }
  } else {
    // Default to personal
    installLocation = "personal";
    installPath = join(homedir(), AGENTS[targetPlatform].personalPath);
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
  const skillFilePath = join(skillDir, AGENTS[targetPlatform].configFile);
  writeFileSync(skillFilePath, content);

  // Success output
  console.log();
  success(`Installed ${colors.bold(skillName)} to ${colors.code(AGENTS[targetPlatform].name)}`);
  console.log();
  console.log(colors.dim("  Location:"), skillDir);
  console.log(colors.dim("  File:    "), AGENTS[targetPlatform].configFile);
  console.log();

  // Show next steps
  const boxContent = installLocation === "personal"
    ? `The skill is now available globally.\nRestart your agent to use it.`
    : `The skill is installed in this project.\nIt will be available when working in this directory.`;

  console.log(box(boxContent, colors.success("✓ Installed")));
  console.log();
}
