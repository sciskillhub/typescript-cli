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
import type { SkillSuiteDetailResult } from "../lib/client.js";
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
const SKILL_SUITE_STORE = join(homedir(), "sciskillhub", "skill-suites");

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
    .description("Install a skill or skill suite to your local agent")
    .option(
      "-a, --agent <agent>",
      "Target agent (claude, cursor, codex, gemini, copilot, windsurf, cline, roo, opencode, openclaw, junie, kiro, augment, warp, goose)"
    )
    .option("--project", "Install to project directory (default: personal)")
    .option("-d, --dir <path>", "Custom install directory")
    .option("--suite", "Install a skill suite instead of a single skill")
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

type InstallOptions = {
  agent?: string;
  project?: boolean;
  dir?: string;
  suite?: boolean;
  yes?: boolean;
};

type ResolvedInstallTarget = {
  agentKey: AgentKey | null;
  linkBasePath: string | null;
};

type InstallResolution =
  | {
      kind: "skill";
      slug: string;
      name: string;
    }
  | {
      kind: "suite";
      suite: SkillSuiteDetailResult;
    };

async function installSkill(
  skillRef: string,
  options: InstallOptions
): Promise<void> {
  const client = getClient();
  const resolution = await resolveInstallReference(client, skillRef, options);
  const installTarget = await resolveInstallTarget(options);

  if (resolution.kind === "suite") {
    await installSuite(resolution.suite, skillRef, options, installTarget);
    return;
  }

  await installResolvedSkill(resolution, skillRef, options, installTarget);
}

function getCandidateSlugs(ref: string): string[] {
  const candidates: string[] = [];
  candidates.push(ref);

  if (!ref.startsWith("open-source/") && !ref.startsWith("user-")) {
    candidates.push(`open-source/${ref}`);
  }

  return candidates;
}

async function resolveInstallReference(
  client: ReturnType<typeof getClient>,
  skillRef: string,
  options: InstallOptions,
): Promise<InstallResolution> {
  if (options.suite) {
    const directSuite = await resolveSkillSuiteReference(client, skillRef, options, false);
    if (directSuite) {
      return { kind: "suite", suite: directSuite };
    }

    const searchedSuite = await resolveSkillSuiteReference(client, skillRef, options, true);
    if (searchedSuite) {
      return { kind: "suite", suite: searchedSuite };
    }

    error(`No suites found matching: ${skillRef}`);
    console.log();
    info(`Install a single skill without ${colors.code("--suite")}, or browse suites in the web catalog.`);
    process.exit(1);
  }

  const directSkill = await resolveDirectSkillReference(client, skillRef);
  if (directSkill) {
    return directSkill;
  }

  const searchedSkill = await resolveSkillFromSearch(client, skillRef, options);
  if (searchedSkill) {
    return searchedSkill;
  }

  const directSuite = await resolveSkillSuiteReference(client, skillRef, options, false);
  if (directSuite) {
    return { kind: "suite", suite: directSuite };
  }

  const searchedSuite = await resolveSkillSuiteReference(client, skillRef, options, true);
  if (searchedSuite) {
    return { kind: "suite", suite: searchedSuite };
  }

  error(`No skills or suites found matching: ${skillRef}`);
  console.log();
  info("To search for skills, use:");
  console.log(`  ${colors.code("sciskill search <query>")}`);
  process.exit(1);
}

async function resolveDirectSkillReference(
  client: ReturnType<typeof getClient>,
  skillRef: string,
): Promise<InstallResolution | null> {
  async function tryInstall(slug: string): Promise<boolean> {
    try {
      await client.install(slug);
      return true;
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) {
        return false;
      }
      throw err;
    }
  }

  for (const candidate of getCandidateSlugs(skillRef)) {
    const spin = spinner(`Trying ${colors.code(candidate)}...`);
    const successForCandidate = await tryInstall(candidate);
    spin.stop();

    if (successForCandidate) {
      return {
        kind: "skill",
        slug: candidate,
        name: candidate.split("/").pop() || candidate,
      };
    }
  }

  return null;
}

async function resolveSkillFromSearch(
  client: ReturnType<typeof getClient>,
  skillRef: string,
  options: InstallOptions,
): Promise<InstallResolution | null> {
  const searchSpin = spinner(`Searching skills for "${colors.code(skillRef)}"...`);
  const allResults = await client.listCatalogSkills({
    query: skillRef,
    limit: 100,
  });
  searchSpin.stop();

  const refLower = skillRef.toLowerCase();
  const matches = allResults.filter(skill => {
    const nameMatch = skill.name.toLowerCase() === refLower;
    const slugMatch = skill.slug.toLowerCase().includes(refLower);
    const pathMatch = skill.slug.toLowerCase().endsWith(`/${refLower}`);
    return nameMatch || slugMatch || pathMatch;
  });

  if (matches.length === 0) {
    return null;
  }

  let selectedSkill: typeof matches[0];

  if (matches.length === 1) {
    selectedSkill = matches[0];
  } else {
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

  return {
    kind: "skill",
    slug: selectedSkill.slug,
    name: selectedSkill.name,
  };
}

async function resolveSkillSuiteReference(
  client: ReturnType<typeof getClient>,
  skillRef: string,
  options: InstallOptions,
  allowSearch: boolean,
): Promise<SkillSuiteDetailResult | null> {
  for (const candidate of getCandidateSlugs(skillRef)) {
    const spin = spinner(`Checking suite ${colors.code(candidate)}...`);
    try {
      const suite = await client.getSkillSuite(candidate);
      spin.stop();
      return suite;
    } catch (err) {
      spin.stop();
      if (!(err instanceof Error) || !err.message.includes("404")) {
        throw err;
      }
    }
  }

  if (!allowSearch) {
    return null;
  }

  const searchSpin = spinner(`Searching suites for "${colors.code(skillRef)}"...`);
  const response = await client.listSkillSuites({
    query: skillRef,
    limit: 100,
    sort: "skills",
    order: "desc",
  });
  searchSpin.stop();

  const refLower = skillRef.toLowerCase();
  const matches = response.suites.filter((suite) => {
    const idMatch = suite.id.toLowerCase().includes(refLower);
    const titleMatch = suite.title.toLowerCase() === refLower || suite.title.toLowerCase().includes(refLower);
    const pathMatch = suite.suitePath.toLowerCase() === refLower || suite.suitePath.toLowerCase().includes(refLower);
    return idMatch || titleMatch || pathMatch;
  });

  if (matches.length === 0) {
    return null;
  }

  let selectedSuite = matches[0];
  if (matches.length > 1) {
    if (options.yes) {
      error(`Multiple suites found matching "${skillRef}". Please run without -y flag to choose.`);
      console.log();
      for (const suite of matches.slice(0, 10)) {
        console.log(`  ${colors.code(suite.id)}`);
        console.log(`    ${suite.title} (${suite.skillCount} skills)`);
      }
      process.exit(1);
    }

    console.log();
    console.log(colors.bold(`Found ${matches.length} suites matching "${skillRef}":`));
    console.log();

    const choices = matches.slice(0, 20).map((suite) => ({
      title: suite.title,
      value: suite.id,
      description: `${suite.repoLabel || suite.suitePath} · ${suite.skillCount} skills`,
    }));

    const { selectedSuiteId } = await prompts({
      type: "select",
      name: "selectedSuiteId",
      message: "Select a suite to install:",
      choices,
      initial: 0,
    }, {
      onCancel: () => {
        info("Cancelled.");
        process.exit(0);
      },
    });

    selectedSuite = matches.find((suite) => suite.id === selectedSuiteId)!;
  }

  return client.getSkillSuite(selectedSuite.id);
}

async function resolveInstallTarget(options: InstallOptions): Promise<ResolvedInstallTarget> {
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

    targetAgent = agent === "__skip__" ? null : agent as AgentKey;
  }

  if (!targetAgent) {
    return { agentKey: null, linkBasePath: null };
  }

  const agent = AGENTS[targetAgent];
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

  return {
    agentKey: targetAgent,
    linkBasePath,
  };
}

async function installSuite(
  suite: SkillSuiteDetailResult,
  suiteRef: string,
  options: InstallOptions,
  installTarget: ResolvedInstallTarget,
): Promise<void> {
  const members = suite.members;
  const suiteStoreDir = getSuiteStoreDir(suite.suite.id);
  if (members.length === 0) {
    error(`Suite "${suite.suite.title}" does not contain any installable skills.`);
    process.exit(1);
  }

  console.log();
  console.log(colors.bold(`📚 ${suite.suite.title}`));
  console.log(colors.dim(`   ${suite.suite.id}`));
  console.log(colors.dim(`   ${members.length} skills`));
  console.log(colors.dim(`   Store: ${suiteStoreDir}`));
  console.log();

  await downloadSuiteToStore(suite.suite.id, suite.suite.title, options, suiteStoreDir);

  for (const [index, member] of members.entries()) {
    const skillDirName = member.id.split("/").pop() || member.name;
    const memberStoreDir = getSuiteMemberStoreDir(suiteStoreDir, member.relativePath, skillDirName);

    console.log(colors.dim(`[${index + 1}/${members.length}] ${member.relativePath || member.name}`));
    console.log(colors.bold(`📦 ${member.name}`));
    console.log(colors.dim(`   ${member.slug}`));
    console.log(colors.dim(`   Store: ${memberStoreDir}`));
    console.log();

    if (!existsSync(memberStoreDir)) {
      error(`Suite download is missing expected member directory: ${memberStoreDir}`);
      process.exit(1);
    }

    if (installTarget.agentKey && installTarget.linkBasePath) {
      await linkToAgent(skillDirName, memberStoreDir, installTarget, options);
    }
  }

  console.log();
  if (installTarget.agentKey) {
    success(`Installed suite ${colors.bold(suite.suite.title)} (${members.length} skills)`);
  } else {
    success(`Downloaded suite ${colors.bold(suite.suite.title)} (${members.length} skills) to store`);
    console.log(colors.dim(`  Store: ${suiteStoreDir}`));
    info("No agent linked.");
    info(`Re-run with ${colors.code(`sciskill install ${suiteRef} --agent <agent>`)} to link all suite skills.`);
  }
  console.log();
}

async function installResolvedSkill(
  resolution: Extract<InstallResolution, { kind: "skill" }>,
  originalRef: string,
  options: InstallOptions,
  installTarget: ResolvedInstallTarget,
  behavior?: { suppressDownloadOnlyMessage?: boolean },
): Promise<void> {
  console.log();
  console.log(colors.bold(`📦 ${resolution.name}`));
  console.log(colors.dim(`   ${resolution.slug}`));
  console.log();

  const download = await downloadSkillToStore(resolution.slug, resolution.name, options);

  if (installTarget.agentKey && installTarget.linkBasePath) {
    await linkToAgent(download.skillDirName, download.storeDir, installTarget, options);
    return;
  }

  if (!behavior?.suppressDownloadOnlyMessage) {
    console.log();
    info("Skill downloaded to store. No agent linked.");
    info(`To link to an agent: ${colors.code(`sciskill install ${originalRef} --agent <agent>`)}`);
    console.log();
  }
}

async function downloadSkillToStore(
  skillSlug: string,
  skillName: string,
  options: InstallOptions,
): Promise<{ skillDirName: string; storeDir: string }> {
  const skillDirName = skillSlug.split("/").pop() || skillName;
  const storeRoot = SKILL_STORE;
  const storeDir = join(storeRoot, skillDirName);

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
          info("Using cached skill from store.");
          return { skillDirName, storeDir };
        }
      } else {
        info("Using cached skill from store.");
        return { skillDirName, storeDir };
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
        process.exit(0);
      }
    }
  }

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
  const extractSpin = spinner("Extracting skill files...");
  const { execSync } = await import("child_process");
  const tmpZipPath = join(storeRoot, `.tmp_skill_${Date.now()}.zip`);

  mkdirSync(storeRoot, { recursive: true });
  writeFileSync(tmpZipPath, zipBuffer);

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

  fsPromises.unlink(tmpZipPath).catch(() => {});
  extractSpin.stop();
  success(`Downloaded ${colors.bold(skillName)} to store`);
  console.log(colors.dim(`  Store: ${storeDir}`));
  console.log();
  return { skillDirName, storeDir };
}

function getSuiteStoreDir(suiteId: string): string {
  const suiteDirName = suiteId.split("/").filter(Boolean).pop() || suiteId;
  return join(SKILL_SUITE_STORE, suiteDirName);
}

function getSuiteMemberStoreDir(suiteStoreDir: string, relativePath: string, fallbackDirName: string): string {
  const segments = relativePath.split("/").filter(Boolean);
  return segments.length > 0 ? join(suiteStoreDir, ...segments) : join(suiteStoreDir, fallbackDirName);
}

async function downloadSuiteToStore(
  suiteId: string,
  suiteTitle: string,
  options: InstallOptions,
  suiteStoreDir: string,
): Promise<void> {
  if (existsSync(suiteStoreDir)) {
    if (!options.yes) {
      const { reinstall } = await prompts({
        type: "confirm",
        name: "reinstall",
        message: `Suite "${suiteTitle}" already in store. Re-download?`,
        initial: false,
      }, {
        onCancel: () => { info("Cancelled."); process.exit(0); },
      });

      if (!reinstall) {
        info("Using cached suite from store.");
        return;
      }
    } else {
      info("Using cached suite from store.");
      return;
    }
  }

  const installSpin = spinner("Downloading suite content...");
  const apiUrl = getApiUrl();
  const downloadUrl = `${apiUrl}/download-suite/${encodePathSegments(suiteId)}`;

  let zipBuffer: Buffer;
  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      installSpin.stop();
      error(`Failed to download suite: ${response.status} ${response.statusText}`);
      process.exit(1);
    }
    const arrayBuffer = await response.arrayBuffer();
    zipBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    installSpin.stop();
    if (err instanceof Error) {
      error(`Failed to download suite: ${err.message}`);
    } else {
      error("Failed to download suite.");
    }
    process.exit(1);
  }
  installSpin.stop();

  const extractSpin = spinner("Extracting suite files...");
  const { execSync } = await import("child_process");
  const tmpZipPath = join(SKILL_SUITE_STORE, `.tmp_suite_${Date.now()}.zip`);

  mkdirSync(SKILL_SUITE_STORE, { recursive: true });
  writeFileSync(tmpZipPath, zipBuffer);

  if (existsSync(suiteStoreDir)) {
    rmSync(suiteStoreDir, { recursive: true, force: true });
  }
  mkdirSync(suiteStoreDir, { recursive: true });

  try {
    execSync(`unzip -o "${tmpZipPath}" -d "${suiteStoreDir}"`, { stdio: "ignore" });
  } catch {
    extractSpin.stop();
    error("Failed to extract suite files. Make sure 'unzip' command is available.");
    process.exit(1);
  }

  fsPromises.unlink(tmpZipPath).catch(() => {});
  extractSpin.stop();
  success(`Downloaded ${colors.bold(suiteTitle)} to suite store`);
  console.log(colors.dim(`  Store: ${suiteStoreDir}`));
  console.log();
}

function encodePathSegments(value: string): string {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Create a symlink from the agent's skill directory to the central store.
 */
async function linkToAgent(
  skillDirName: string,
  storeDir: string,
  installTarget: ResolvedInstallTarget,
  options: InstallOptions,
): Promise<void> {
  const targetAgent = installTarget.agentKey;
  const linkBasePath = installTarget.linkBasePath;
  if (!targetAgent || !linkBasePath) {
    return;
  }
  const agent = AGENTS[targetAgent];
  const linkPath = join(linkBasePath, skillDirName);

  mkdirSync(linkBasePath, { recursive: true });

  if (existsSync(linkPath)) {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      try {
        const currentTarget = readlinkSync(linkPath);
        if (currentTarget === storeDir) {
          info(`Symlink already exists: ${linkPath} -> ${storeDir}`);
          printSuccess(skillDirName, targetAgent, linkPath, storeDir);
          return;
        }
      } catch {}
    }

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

    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      rmSync(linkPath, { recursive: true, force: true });
    } else {
      unlinkSync(linkPath);
    }
  }

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
