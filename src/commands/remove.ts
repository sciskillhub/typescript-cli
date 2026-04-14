/**
 * Remove Command
 *
 * Remove a locally installed skill from an agent's skills directory.
 * Handles both regular directories and symlinks (central store).
 */

import { Command } from "commander";
import prompts from "prompts";
import {
  existsSync,
  lstatSync,
  readlinkSync,
  unlinkSync,
  rmSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";
import { AGENTS, type AgentKey, resolveAgentKey } from "./install.js";
import { listAgentSkills } from "../lib/installed.js";
import {
  success,
  error,
  info,
  warn,
  colors,
} from "../utils/ui.js";

const SKILL_STORE = join(homedir(), ".sciskillhub", "skills");

export function registerRemoveCommand(program: Command): void {
  program
    .command("remove <skill>")
    .alias("rm")
    .alias("uninstall")
    .description("Remove a locally installed skill")
    .option("-a, --agent <agent>", "Agent to remove from (claude, cursor, codex, ...)")
    .option("--project", "Remove from project-level install")
    .option("--store", "Also remove from central store (~/.sciskillhub/skills/)")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(async (skillName: string, options) => {
      const scope: "personal" | "project" = options.project ? "project" : "personal";

      if (options.agent) {
        // Remove from specific agent
        const agentKey = resolveAgentKey(options.agent.toLowerCase());
        if (!agentKey) {
          error(`Unknown agent: ${options.agent}`);
          console.log(`Supported agents: ${Object.keys(AGENTS).join(", ")}`);
          process.exit(1);
        }
        await removeFromAgent(skillName, agentKey, scope, options.yes, options.store);
      } else {
        // Remove from all agents that have this skill
        await removeFromAll(skillName, scope, options.yes, options.store);
      }
    });
}

async function removeFromAgent(
  skillName: string,
  agentKey: AgentKey,
  scope: "personal" | "project",
  skipConfirm: boolean,
  removeFromStore: boolean
): Promise<void> {
  const agent = AGENTS[agentKey];
  const skills = listAgentSkills(agentKey, scope);
  const skill = skills.find(
    (s) => s.name === skillName || s.name.toLowerCase() === skillName.toLowerCase()
  );

  if (!skill) {
    error(`Skill "${skillName}" not found in ${agent.name} (${scope}).`);
    info(`List installed skills: ${colors.code(`sciskill list --agent ${agentKey}`)}`);
    process.exit(1);
  }

  const confirmed = skipConfirm || await confirmRemove(skill.name, agent.name);
  if (!confirmed) {
    info("Cancelled.");
    return;
  }

  const skillPath = skill.path;

  if (skill.isSymlink) {
    // Remove symlink
    unlinkSync(skillPath);
    success(`Removed symlink: ${skill.name} from ${agent.name}`);
  } else {
    // Remove directory
    rmSync(skillPath, { recursive: true, force: true });
    success(`Removed: ${skill.name} from ${agent.name}`);
  }

  // Optionally remove from central store
  if (removeFromStore) {
    removeFromCentralStore(skillName, skill);
  }
}

async function removeFromAll(
  skillName: string,
  scope: "personal" | "project",
  skipConfirm: boolean,
  removeFromStore: boolean
): Promise<void> {
  const found: Array<{ agentKey: AgentKey; agentName: string; skillPath: string; skillName: string; isSymlink: boolean; storeTarget: string | null }> = [];

  for (const agentKey of Object.keys(AGENTS) as AgentKey[]) {
    const agent = AGENTS[agentKey];
    const skills = listAgentSkills(agentKey, scope);
    const skill = skills.find(
      (s) => s.name === skillName || s.name.toLowerCase() === skillName.toLowerCase()
    );
    if (skill) {
      found.push({
        agentKey,
        agentName: agent.name,
        skillPath: skill.path,
        skillName: skill.name,
        isSymlink: skill.isSymlink,
        storeTarget: skill.storeTarget,
      });
    }
  }

  if (found.length === 0) {
    error(`Skill "${skillName}" not found in any agent.`);
    info(`List installed skills: ${colors.code("sciskill list")}`);
    process.exit(1);
  }

  const confirmed =
    skipConfirm ||
    await confirmRemove(
      skillName,
      found.map((f) => f.agentName).join(", ")
    );
  if (!confirmed) {
    info("Cancelled.");
    return;
  }

  for (const { agentName, skillPath, skillName: name, isSymlink } of found) {
    if (isSymlink) {
      unlinkSync(skillPath);
      success(`Removed symlink: ${name} from ${agentName}`);
    } else {
      rmSync(skillPath, { recursive: true, force: true });
      success(`Removed: ${name} from ${agentName}`);
    }
  }

  if (removeFromStore) {
    const last = found[found.length - 1];
    removeFromCentralStore(skillName, last);
  }
}

function removeFromCentralStore(
  skillName: string,
  existingSkill?: { isSymlink?: boolean; storeTarget?: string | null }
): void {
  // Check central store
  const storePath = join(SKILL_STORE, skillName);
  if (existsSync(storePath)) {
    rmSync(storePath, { recursive: true, force: true });
    success(`Removed from central store: ${skillName}`);
  } else if (existingSkill?.isSymlink && existingSkill.storeTarget) {
    // Symlink target might use a different name
    const target = existingSkill.storeTarget.startsWith("/")
      ? existingSkill.storeTarget
      : join(homedir(), existingSkill.storeTarget);
    if (existsSync(target) && target.startsWith(SKILL_STORE)) {
      rmSync(target, { recursive: true, force: true });
      success(`Removed from central store: ${skillName}`);
    }
  }
}

async function confirmRemove(
  skillName: string,
  agentName: string
): Promise<boolean> {
  const answer = await prompts(
    {
      type: "confirm",
      name: "confirm",
      message: `Remove "${skillName}" from ${agentName}?`,
      initial: false,
    },
    {
      onCancel: () => {
        info("Cancelled.");
        process.exit(0);
      },
    }
  );
  return answer.confirm;
}
