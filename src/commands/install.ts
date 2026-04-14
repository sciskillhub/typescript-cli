/**
 * Install Command
 *
 * Install a skill to local agent (Claude, Cursor, Codex, etc.)
 *
 * Storage model:
 *   - Skill files are downloaded to ~/.sciskillhub/skills/<skill-name>/
 *   - When --agent is specified, a symlink is created in the agent's skill
 *     directory pointing to the central store
 *   - Without --agent, only downloads to the central store (no symlink)
 */

import { Command } from "commander";
import prompts from "prompts";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  readFileSync,
  lstatSync,
  symlinkSync,
  unlinkSync,
  rmSync,
  readlinkSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";
import { promises as fsPromises } from "fs";
import { getClient } from "../lib/api.js";
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

// Central skill store path
const SKILL_STORE = join(homedir(), ".sciskillhub", "skills");

// Supported agents with their install paths
export const AGENTS = {
  // ── Major Agents ──
  "claude-code": {
    name: "Claude Code",
    personalPath: ".claude/skills",
    projectPath: ".claude/skills",
    configFile: "SKILL.md",
  },
  cursor: {
    name: "Cursor",
    personalPath: ".cursor/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  codex: {
    name: "Codex",
    personalPath: ".codex/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  "gemini-cli": {
    name: "Gemini CLI",
    personalPath: ".gemini/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  "github-copilot": {
    name: "GitHub Copilot",
    personalPath: ".copilot/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  windsurf: {
    name: "Windsurf",
    personalPath: ".codeium/windsurf/skills",
    projectPath: ".windsurf/skills",
    configFile: "SKILL.md",
  },
  cline: {
    name: "Cline",
    personalPath: ".agents/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  warp: {
    name: "Warp",
    personalPath: ".agents/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  roo: {
    name: "Roo Code",
    personalPath: ".roo/skills",
    projectPath: ".roo/skills",
    configFile: "SKILL.md",
  },
  augment: {
    name: "Augment",
    personalPath: ".augment/skills",
    projectPath: ".augment/skills",
    configFile: "SKILL.md",
  },
  junie: {
    name: "Junie",
    personalPath: ".junie/skills",
    projectPath: ".junie/skills",
    configFile: "SKILL.md",
  },
  opencode: {
    name: "OpenCode",
    personalPath: ".config/opencode/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  openclaw: {
    name: "OpenClaw",
    personalPath: ".openclaw/skills",
    projectPath: "skills",
    configFile: "SKILL.md",
  },
  goose: {
    name: "Goose",
    personalPath: ".config/goose/skills",
    projectPath: ".goose/skills",
    configFile: "SKILL.md",
  },

  // ── Additional Agents ──
  amp: {
    name: "Amp",
    personalPath: ".config/agents/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  "kimi-cli": {
    name: "Kimi Code CLI",
    personalPath: ".config/agents/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  replit: {
    name: "Replit",
    personalPath: ".config/agents/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  universal: {
    name: "Universal",
    personalPath: ".config/agents/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  antigravity: {
    name: "Antigravity",
    personalPath: ".gemini/antigravity/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  bob: {
    name: "IBM Bob",
    personalPath: ".bob/skills",
    projectPath: ".bob/skills",
    configFile: "SKILL.md",
  },
  codebuddy: {
    name: "CodeBuddy",
    personalPath: ".codebuddy/skills",
    projectPath: ".codebuddy/skills",
    configFile: "SKILL.md",
  },
  "command-code": {
    name: "Command Code",
    personalPath: ".commandcode/skills",
    projectPath: ".commandcode/skills",
    configFile: "SKILL.md",
  },
  continue: {
    name: "Continue",
    personalPath: ".continue/skills",
    projectPath: ".continue/skills",
    configFile: "SKILL.md",
  },
  cortex: {
    name: "Cortex Code",
    personalPath: ".snowflake/cortex/skills",
    projectPath: ".cortex/skills",
    configFile: "SKILL.md",
  },
  crush: {
    name: "Crush",
    personalPath: ".config/crush/skills",
    projectPath: ".crush/skills",
    configFile: "SKILL.md",
  },
  deepagents: {
    name: "Deep Agents",
    personalPath: ".deepagents/agent/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  droid: {
    name: "Droid",
    personalPath: ".factory/skills",
    projectPath: ".factory/skills",
    configFile: "SKILL.md",
  },
  firebender: {
    name: "Firebender",
    personalPath: ".firebender/skills",
    projectPath: ".agents/skills",
    configFile: "SKILL.md",
  },
  "iflow-cli": {
    name: "iFlow CLI",
    personalPath: ".iflow/skills",
    projectPath: ".iflow/skills",
    configFile: "SKILL.md",
  },
  kilo: {
    name: "Kilo Code",
    personalPath: ".kilocode/skills",
    projectPath: ".kilocode/skills",
    configFile: "SKILL.md",
  },
  "kiro-cli": {
    name: "Kiro CLI",
    personalPath: ".kiro/skills",
    projectPath: ".kiro/skills",
    configFile: "SKILL.md",
  },
  kode: {
    name: "Kode",
    personalPath: ".kode/skills",
    projectPath: ".kode/skills",
    configFile: "SKILL.md",
  },
  mcpjam: {
    name: "MCPJam",
    personalPath: ".mcpjam/skills",
    projectPath: ".mcpjam/skills",
    configFile: "SKILL.md",
  },
  "mistral-vibe": {
    name: "Mistral Vibe",
    personalPath: ".vibe/skills",
    projectPath: ".vibe/skills",
    configFile: "SKILL.md",
  },
  mux: {
    name: "Mux",
    personalPath: ".mux/skills",
    projectPath: ".mux/skills",
    configFile: "SKILL.md",
  },
  openhands: {
    name: "OpenHands",
    personalPath: ".openhands/skills",
    projectPath: ".openhands/skills",
    configFile: "SKILL.md",
  },
  pi: {
    name: "Pi",
    personalPath: ".pi/agent/skills",
    projectPath: ".pi/skills",
    configFile: "SKILL.md",
  },
  qoder: {
    name: "Qoder",
    personalPath: ".qoder/skills",
    projectPath: ".qoder/skills",
    configFile: "SKILL.md",
  },
  "qwen-code": {
    name: "Qwen Code",
    personalPath: ".qwen/skills",
    projectPath: ".qwen/skills",
    configFile: "SKILL.md",
  },
  trae: {
    name: "Trae",
    personalPath: ".trae/skills",
    projectPath: ".trae/skills",
    configFile: "SKILL.md",
  },
  "trae-cn": {
    name: "Trae CN",
    personalPath: ".trae-cn/skills",
    projectPath: ".trae/skills",
    configFile: "SKILL.md",
  },
  zencoder: {
    name: "Zencoder",
    personalPath: ".zencoder/skills",
    projectPath: ".zencoder/skills",
    configFile: "SKILL.md",
  },
  neovate: {
    name: "Neovate",
    personalPath: ".neovate/skills",
    projectPath: ".neovate/skills",
    configFile: "SKILL.md",
  },
  pochi: {
    name: "Pochi",
    personalPath: ".pochi/skills",
    projectPath: ".pochi/skills",
    configFile: "SKILL.md",
  },
  adal: {
    name: "AdaL",
    personalPath: ".adal/skills",
    projectPath: ".adal/skills",
    configFile: "SKILL.md",
  },
} as const;

// Backward-compatible aliases (old key -> new key)
const AGENT_ALIASES: Record<string, string> = {
  claude: "claude-code",
  gemini: "gemini-cli",
  copilot: "github-copilot",
  kiro: "kiro-cli",
};

export type AgentKey = keyof typeof AGENTS;

/** Resolve an agent key, supporting old aliases */
export function resolveAgentKey(key: string): AgentKey | null {
  const resolved = AGENT_ALIASES[key] ?? key;
  if (resolved in AGENTS) return resolved as AgentKey;
  return null;
}

export function registerInstallCommand(program: Command): void {
  program
    .command("install <skill>")
    .alias("add")
    .alias("i")
    .description("Install a skill to your local agent")
    .option(
      "-a, --agent <agent>",
      "Target agent (claude, cursor, codex, gemini, copilot, windsurf, cline, roo, opencode, openclaw, junie, kiro, augment, warp, goose)"
    )
    .option("--project", "Install to project directory (default: personal)")
    .option("-d, --dir <path>", "Custom install directory")
    .option("-y, --yes", "Skip confirmation prompts")
    .option("--list-agents", "List all supported agents")
    .action(async (skill: string, options) => {
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
      console.log(`  ${colors.code("sciskill search <query>")}`);
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
          description: `${author}/${skillPath}`,
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

  // ── Step 1: Download to central store ──────────────────────────

  const skillDirName = skillSlug.split("/").pop() || skillName;
  const storeDir = join(SKILL_STORE, skillDirName);

  // Check if already in central store
  if (existsSync(storeDir)) {
    const existingSkillFile = join(storeDir, "SKILL.md");
    let isSameSkill = false;

    if (existsSync(existingSkillFile)) {
      try {
        const content = readFileSync(existingSkillFile, "utf-8");
        isSameSkill = content.includes(skillSlug) || content.includes(skillName);
      } catch {}
    }

    if (isSameSkill) {
      if (!options.yes) {
        const { reinstall } = await prompts({
          type: "confirm",
          name: "reinstall",
          message: `Skill "${skillName}" already in store. Re-download?`,
          initial: false,
        }, {
          onCancel: () => { info("Cancelled."); process.exit(0); },
        });

        if (!reinstall) {
          // Skip download, go straight to symlink
          info("Using cached skill from store.");
          await linkToAgent(skillDirName, storeDir, options);
          return;
        }
      } else {
        // -y mode: use cache automatically
        info("Using cached skill from store.");
        await linkToAgent(skillDirName, storeDir, options);
        return;
      }
    }

    if (!isSameSkill && !options.yes) {
      warn(`A different skill named "${skillName}" already exists in store.`);
      const { action } = await prompts({
        type: "select",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { title: "Overwrite existing skill", value: "overwrite" },
          { title: "Cancel installation", value: "cancel" },
        ],
        initial: 1,
      }, {
        onCancel: () => { info("Cancelled."); process.exit(0); },
      });

      if (action === "cancel") {
        info("Cancelled.");
        return;
      }
    }
  }

  // Download skill content
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

  // Extract ZIP to central store
  const extractSpin = spinner("Extracting skill files...");

  const { execSync } = await import("child_process");
  const tmpZipPath = join(SKILL_STORE, `.tmp_skill_${Date.now()}.zip`);

  // Ensure store directory exists
  mkdirSync(SKILL_STORE, { recursive: true });
  writeFileSync(tmpZipPath, zipBuffer);

  // Remove old skill dir if exists, then extract fresh
  if (existsSync(storeDir)) {
    rmSync(storeDir, { recursive: true, force: true });
  }
  mkdirSync(storeDir, { recursive: true });

  try {
    execSync(`unzip -o "${tmpZipPath}" -d "${storeDir}"`, { stdio: "ignore" });
  } catch (err) {
    extractSpin.stop();
    error("Failed to extract skill files. Make sure 'unzip' command is available.");
    process.exit(1);
  }

  // Clean up temp ZIP
  fsPromises.unlink(tmpZipPath).catch(() => {});

  extractSpin.stop();

  success(`Downloaded ${colors.bold(skillName)} to store`);
  console.log(colors.dim(`  Store: ${storeDir}`));
  console.log();

  // ── Step 2: Create symlink to agent directory ──────────────────

  await linkToAgent(skillDirName, storeDir, options);
}

/**
 * Create a symlink from the agent's skill directory to the central store.
 * If no --agent is specified, only show store location and skip linking.
 */
async function linkToAgent(
  skillDirName: string,
  storeDir: string,
  options: {
    agent?: string;
    project?: boolean;
    dir?: string;
    yes?: boolean;
  }
): Promise<void> {
  // Determine target agent
  let targetAgent: AgentKey | null = null;

  if (options.agent) {
    const resolved = resolveAgentKey(options.agent.toLowerCase());
    if (!resolved) {
      error(`Unknown agent: ${options.agent}`);
      console.log(`Supported agents: ${Object.keys(AGENTS).join(", ")}`);
      process.exit(1);
    }
    targetAgent = resolved;
  } else if (!options.yes) {
    const agentChoices = [
      { title: "Skip (download only, no agent linking)", value: "__skip__" },
      ...Object.entries(AGENTS).map(([key, agent]) => ({
        title: `${agent.name}`,
        value: key,
        description: `Link to ${agent.personalPath}`,
      })),
    ];

    const { agent } = await prompts({
      type: "select",
      name: "agent",
      message: "Link to which agent?",
      choices: agentChoices,
      initial: 0,
    }, {
      onCancel: () => { info("Cancelled."); process.exit(0); },
    });

    if (agent === "__skip__") {
      targetAgent = null;
    } else {
      targetAgent = agent as AgentKey;
    }
  } else {
    // Default with -y: download only, no linking
    targetAgent = null;
  }

  if (!targetAgent) {
    console.log();
    info("Skill downloaded to store. No agent linked.");
    info(`To link to an agent: ${colors.code(`sciskill install ${skillDirName} --agent <agent>`)}`);
    console.log();
    return;
  }

  const agent = AGENTS[targetAgent];

  // Determine link location
  let linkBasePath: string;

  if (options.dir) {
    linkBasePath = options.dir;
  } else if (options.project) {
    linkBasePath = join(process.cwd(), agent.projectPath);
  } else if (!options.yes) {
    const { location } = await prompts({
      type: "select",
      name: "location",
      message: "Link location:",
      choices: [
        {
          title: "Personal (global)",
          value: "personal",
          description: `~/${agent.personalPath}`,
        },
        {
          title: "Project (current directory)",
          value: "project",
          description: `./${agent.projectPath}`,
        },
      ],
      initial: 0,
    }, {
      onCancel: () => { info("Cancelled."); process.exit(0); },
    });

    linkBasePath = location === "personal"
      ? join(homedir(), agent.personalPath)
      : join(process.cwd(), agent.projectPath);
  } else {
    linkBasePath = join(homedir(), agent.personalPath);
  }

  const linkPath = join(linkBasePath, skillDirName);

  // Ensure the agent skill directory exists
  mkdirSync(linkBasePath, { recursive: true });

  // Handle existing file/symlink/directory at link path
  if (existsSync(linkPath)) {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      // Check if it already points to the right target
      try {
        const currentTarget = readlinkSync(linkPath);
        if (currentTarget === storeDir) {
          info(`Symlink already exists: ${linkPath} -> ${storeDir}`);
          printSuccess(skillDirName, targetAgent, linkPath, storeDir);
          return;
        }
      } catch {}
    }

    // Remove existing and recreate
    if (!options.yes) {
      const { overwrite } = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `"${skillDirName}" already exists in ${AGENTS[targetAgent].name}. Replace with symlink?`,
        initial: true,
      }, {
        onCancel: () => { info("Cancelled."); process.exit(0); },
      });

      if (!overwrite) {
        info("Skipped linking.");
        return;
      }
    }

    // Remove existing (file, dir, or symlink)
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      rmSync(linkPath, { recursive: true, force: true });
    } else {
      unlinkSync(linkPath);
    }
  }

  // Create the symlink
  symlinkSync(storeDir, linkPath);

  printSuccess(skillDirName, targetAgent, linkPath, storeDir);
}

function printSuccess(
  skillDirName: string,
  agentKey: AgentKey,
  linkPath: string,
  storeDir: string
): void {
  const agent = AGENTS[agentKey];

  console.log();
  success(`Linked ${colors.bold(skillDirName)} to ${colors.code(agent.name)}`);
  console.log();
  console.log(colors.dim("  Store:  "), storeDir);
  console.log(colors.dim("  Link:   "), linkPath);
  console.log(colors.dim("  Target: "), `-> ${storeDir}`);
  console.log();

  console.log(box(
    `The skill is now available for ${agent.name}.\nRestart your agent to use it.`,
    colors.success("✓ Installed")
  ));
  console.log();
}
