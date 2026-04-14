/**
 * List Command
 *
 * List locally installed skills (no auth required).
 */

import { Command } from "commander";
import { AGENTS, type AgentKey, resolveAgentKey } from "./install.js";
import {
  listAgentSkills,
  listAllAgentSkills,
  formatBytes,
  formatDate,
} from "../lib/installed.js";
import {
  colors,
  error,
  formatTable,
  info,
} from "../utils/ui.js";

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .alias("ls")
    .description("List locally installed skills")
    .option("-a, --agent <agent>", "Filter by agent (claude, cursor, codex, ...)")
    .option("--project", "List project-level installs instead of personal")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const scope: "personal" | "project" = options.project ? "project" : "personal";

      if (options.agent) {
        // List skills for a specific agent
        const agentKey = resolveAgentKey(options.agent.toLowerCase());
        if (!agentKey) {
          error(`Unknown agent: ${options.agent}`);
          console.log(`Supported agents: ${Object.keys(AGENTS).join(", ")}`);
          process.exit(1);
        }
        listSingleAgent(agentKey, scope, options.json);
      } else {
        // List skills across all agents
        listAllAgents(scope, options.json);
      }
    });
}

function listSingleAgent(
  agentKey: AgentKey,
  scope: "personal" | "project",
  json?: boolean
): void {
  const agent = AGENTS[agentKey];
  const skills = listAgentSkills(agentKey, scope);

  if (json) {
    console.log(
      JSON.stringify(
        {
          agent: agentKey,
          scope,
          skills: skills.map((s) => ({
            name: s.name,
            path: s.path,
            hasSkillFile: s.hasSkillFile,
            isSymlink: s.isSymlink,
            storeTarget: s.storeTarget,
            size: s.size,
            modifiedAt: s.modifiedAt?.toISOString() || null,
          })),
        },
        null,
        2
      )
    );
    return;
  }

  console.log();
  console.log(colors.bold(`${agent.name} Installed Skills (${scope})`));
  console.log();

  if (skills.length === 0) {
    info(`No skills installed for ${agent.name}.`);
    console.log();
    info(
      `Install with: ${colors.code(`sciskill install <skill> --agent ${agentKey}`)}`
    );
    return;
  }

  const rows = skills.map((skill, idx) => [
    colors.dim(`${idx + 1}.`),
    colors.bold(skill.name),
    skill.hasSkillFile ? colors.success("✓") : colors.warning("✗"),
    skill.isSymlink ? colors.info("->") : " ",
    formatBytes(skill.size),
    skill.modifiedAt ? formatDate(skill.modifiedAt) : "-",
  ]);

  console.log(
    formatTable(rows, {
      headers: ["#", "Name", "Config", "Link", "Size", "Modified"],
    })
  );
  console.log();
  info(`Total: ${skills.length} skill${skills.length !== 1 ? "s" : ""}`);
}

function listAllAgents(
  scope: "personal" | "project",
  json?: boolean
): void {
  const allSkills = listAllAgentSkills(scope);

  if (json) {
    const result: Record<string, unknown[]> = {};
    for (const [agentKey, skills] of allSkills) {
      result[agentKey] = skills.map((s) => ({
        name: s.name,
        path: s.path,
        hasSkillFile: s.hasSkillFile,
        isSymlink: s.isSymlink,
        storeTarget: s.storeTarget,
        size: s.size,
        modifiedAt: s.modifiedAt?.toISOString() || null,
      }));
    }
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (allSkills.size === 0) {
    console.log();
    info("No skills installed locally.");
    console.log();
    info(`Discover skills: ${colors.code("sciskill browse trending")}`);
    info(
      `Search skills:   ${colors.code("sciskill search <query>")}`
    );
    return;
  }

  console.log();
  console.log(colors.bold(`Installed Skills (${scope})`));
  console.log();

  let totalSkills = 0;

  for (const [agentKey, skills] of allSkills) {
    const agent = AGENTS[agentKey];
    totalSkills += skills.length;

    console.log(colors.bold(`  ${agent.name} (${skills.length})`));

    const rows = skills.map((skill, idx) => [
      colors.dim(`    ${idx + 1}.`),
      skill.name,
      skill.hasSkillFile ? colors.success("✓") : colors.warning("✗"),
      skill.isSymlink ? colors.info("->") : " ",
      formatBytes(skill.size),
    ]);

    console.log(
      formatTable(rows, {
        headers: ["", "Name", "Config", "Link", "Size"],
      })
    );
    console.log();
  }

  info(
    `Total: ${totalSkills} skill${totalSkills !== 1 ? "s" : ""} across ${allSkills.size} agent${allSkills.size !== 1 ? "s" : ""}`
  );
}
