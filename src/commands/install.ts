/**
 * Install Command
 * 
 * Install a skill to local agent (Claude, Cursor, Codex, etc.)
 * Similar to: npx skills add <owner/repo>
 */

import { Command } from "commander";
import prompts from "prompts";
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { createReadStream } from "fs";
import { createWriteStream, promises as fsPromises } from "fs";
import { getClient, UserSkillDetail } from "../lib/api.js";
import { getApiUrl } from "../lib/config.js";
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
  openclaw: {
    name: "OpenClaw",
    personalPath: ".openclaw/skills",
    projectPath: "skills",
    configFile: "SKILL.md",
  },
  junie: {
    name: "Junie",
    personalPath: ".junie/skills",
    projectPath: ".junie/skills",
    configFile: "SKILL.md",
  },
  kiro: {
    name: "Kiro",
    personalPath: ".kiro/skills",
    projectPath: ".kiro/skills",
    configFile: "SKILL.md",
  },
  augment: {
    name: "Augment Code",
    personalPath: ".augment/skills",
    projectPath: ".augment/skills",
    configFile: "SKILL.md",
  },
  warp: {
    name: "Warp",
    personalPath: ".warp/skills",
    projectPath: ".warp/skills",
    configFile: "SKILL.md",
  },
  goose: {
    name: "Goose",
    personalPath: ".config/goose/skills",
    projectPath: ".config/goose/skills",
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
    .option(
      "-p, --platform <platform>",
      "Target platform (claude, cursor, codex, gemini, copilot, windsurf, cline, roo, opencode, openclaw, junie, kiro, augment, warp, goose)"
    )
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

  // Track the skill to install
  let skillSlug: string;
  let skillName: string;

  // Helper to try installing with different slug formats
  async function tryInstall(slug: string): Promise<{ success: boolean; slug: string }> {
    try {
      await client.install(slug);
      return { success: true, slug };
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) {
        return { success: false, slug };
      }
      throw err;
    }
  }

  // Generate candidate slugs to try
  function getCandidateSlugs(ref: string): string[] {
    const candidates: string[] = [];

    // 1. Full slug as provided
    candidates.push(ref);

    // 2. Try adding open-source/ prefix (author/path -> open-source/author/path)
    if (!ref.startsWith("open-source/") && !ref.startsWith("user-")) {
      candidates.push(`open-source/${ref}`);
    }

    return candidates;
  }

  // First, try direct install with candidate slugs
  const candidates = getCandidateSlugs(skillRef);
  let foundSlug: string | null = null;

  for (const candidate of candidates) {
    const spin = spinner(`Trying ${colors.code(candidate)}...`);
    const result = await tryInstall(candidate);
    spin.stop();

    if (result.success) {
      foundSlug = candidate;
      break;
    }
  }

  if (foundSlug) {
    skillSlug = foundSlug;
    skillName = foundSlug.split("/").pop() || foundSlug;
  } else {
    // If direct install failed, search for matching skills
    const searchSpin = spinner(`Searching for "${colors.code(skillRef)}"...`);
    const allResults = await client.listCatalogSkills({
      query: skillRef,
      limit: 100,
    });

    // Filter results:
    // 1. Exact name match, OR
    // 2. Slug contains the ref (for partial path matching)
    const refLower = skillRef.toLowerCase();
    const matches = allResults.filter(skill => {
      const nameMatch = skill.name.toLowerCase() === refLower;
      const slugMatch = skill.slug.toLowerCase().includes(refLower);
      const pathMatch = skill.slug.toLowerCase().endsWith(`/${refLower}`);
      return nameMatch || slugMatch || pathMatch;
    });

    searchSpin.stop();

    if (matches.length === 0) {
      error(`No skills found matching: ${skillRef}`);
      console.log();
      info("To search for skills, use:");
      console.log(`  ${colors.code("sciskillhub search <query>")}`);
      process.exit(1);
    }

    let selectedSkill: typeof matches[0];

    if (matches.length === 1) {
      selectedSkill = matches[0];
    } else {
      // Multiple matches, let user choose
      if (options.yes) {
        error(`Multiple skills found matching "${skillRef}". Please run without -y flag to choose.`);
        console.log();
        for (const result of matches.slice(0, 10)) {
          console.log(`  ${colors.code(result.slug)}`);
          console.log(`    ${result.name}${result.description ? `: ${result.description.substring(0, 60)}...` : ""}`);
        }
        process.exit(1);
      }

      console.log();
      console.log(colors.bold(`Found ${matches.length} skills matching "${skillRef}":`));
      console.log();

      const choices = matches.slice(0, 20).map((skill) => {
        const parts = skill.slug.split("/");
        const author = parts[1] || "";
        const skillPath = parts.slice(2).join("/") || "";
        return {
          title: skill.name,
          value: skill.slug,
          description: `${author}/${skillPath}${skill.category ? ` • ${skill.category}` : ""}`,
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

      selectedSkill = matches.find(s => s.slug === selectedSlug)!;
    }

    skillSlug = selectedSkill.slug;
    skillName = selectedSkill.name;
  }

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

  // Create skill directory - use skill name only, not full slug path
  const skillDirName = skillSlug.split("/").pop() || skillName;
  const skillDir = join(installPath, skillDirName);

  // Check if already exists
  if (existsSync(skillDir)) {
    // Check if it's the same skill or a different one with same name
    const existingSkillFile = join(skillDir, AGENTS[targetPlatform].configFile);
    let isSameSkill = false;

    if (existsSync(existingSkillFile)) {
      try {
        const content = readFileSync(existingSkillFile, "utf-8");
        // Check if the file mentions the same slug
        isSameSkill = content.includes(skillSlug) || content.includes(skillName);
      } catch {
        // Can't read file, assume different
      }
    }

    if (!options.yes) {
      if (isSameSkill) {
        const { overwrite } = await prompts({
          type: "confirm",
          name: "overwrite",
          message: `Skill "${skillName}" already exists. Reinstall?`,
          initial: false,
        });

        if (!overwrite) {
          info("Cancelled.");
          return;
        }
      } else {
        // Different skill with same name
        console.log();
        warn(`A different skill named "${skillName}" already exists at:`);
        console.log(`  ${colors.dim(skillDir)}`);
        console.log();
        console.log(`You are trying to install:`);
        console.log(`  ${colors.code(skillSlug)}`);
        console.log();

        const { action } = await prompts({
          type: "select",
          name: "action",
          message: "What would you like to do?",
          choices: [
            { title: "Overwrite existing skill", value: "overwrite" },
            { title: "Cancel installation", value: "cancel" },
          ],
          initial: 1,
        });

        if (action === "cancel") {
          info("Cancelled.");
          return;
        }
      }
    } else {
      if (isSameSkill) {
        warn(`Reinstalling skill "${skillName}" at ${skillDir}`);
      } else {
        warn(`Overwriting different skill "${skillName}" at ${skillDir}`);
      }
    }
  }

  // Get skill content from the download endpoint (returns ZIP file)
  const installSpin = spinner("Downloading skill content...");

  const apiUrl = getApiUrl();
  const downloadUrl = `${apiUrl}/download/${skillSlug}`;

  let zipBuffer: Buffer;
  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      installSpin.stop();
      error(`Failed to download skill: ${response.status} ${response.statusText}`);
      process.exit(1);
    }
    const arrayBuffer = await response.arrayBuffer();
    zipBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    installSpin.stop();
    if (err instanceof Error) {
      error(`Failed to download skill: ${err.message}`);
    } else {
      error("Failed to download skill.");
    }
    process.exit(1);
  }

  installSpin.stop();

  // Extract ZIP file to skill directory
  const extractSpin = spinner("Extracting skill files...");

  const { execSync } = await import("child_process");
  const tmpZipPath = join(process.cwd(), `.tmp_skill_${Date.now()}.zip`);
  writeFileSync(tmpZipPath, zipBuffer);

  // Create skill directory
  mkdirSync(skillDir, { recursive: true });

  // Extract ZIP to skill directory
  try {
    execSync(`unzip -o "${tmpZipPath}" -d "${skillDir}"`, { stdio: "ignore" });
  } catch (err) {
    extractSpin.stop();
    error("Failed to extract skill files. Make sure 'unzip' command is available.");
    info("Install unzip using: sudo apt-get install unzip (Linux) or brew install unzip (macOS)");
    process.exit(1);
  }

  // Clean up temp ZIP file
  fsPromises.unlink(tmpZipPath).catch(() => {});

  extractSpin.stop();

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
