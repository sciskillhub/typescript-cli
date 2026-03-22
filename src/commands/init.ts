/**
 * Init Command
 * 
 * Initialize a new skill project in current directory
 */

import { Command } from "commander";
import prompts from "prompts";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join, basename } from "path";
import {
  isSkillProject,
  saveLocalConfig,
  getLocalConfig,
  isLoggedIn
} from "../lib/config.js";
import { getClient, ensureAuthenticated } from "../lib/api.js";
import { success, error, info, warn, spinner, colors } from "../utils/ui.js";

const CATEGORIES = [
  "Coding",
  "Writing",
  "Research",
  "Productivity",
  "DevOps",
  "Data",
  "Design",
  "Other",
];

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize a new skill project")
    .option("-n, --name <name>", "Skill name")
    .option("-d, --description <desc>", "Skill description")
    .option("-c, --category <category>", "Skill category")
    .option("-y, --yes", "Skip prompts and use defaults")
    .option("--link <skill-id>", "Link to existing remote skill")
    .action(async (options) => {
      const cwd = process.cwd();

      // Check if already initialized
      if (isSkillProject(cwd)) {
        const existing = getLocalConfig(cwd);
        if (existing?.skill_id) {
          info(`This directory is already linked to skill: ${colors.bold(existing.slug || existing.name || existing.skill_id)}`);
          info("Use 'sciskillhub push' to sync changes or 'sciskillhub pull' to get latest.");
          return;
        }
        warn("Found existing .sciskillhub.json - will update it.");
      }

      // Link to existing skill
      if (options.link) {
        await linkExistingSkill(options.link, cwd);
        return;
      }

      // Get skill info from prompts or options
      let name = options.name;
      let description = options.description;
      let category = options.category;

      if (!options.yes) {
        const answers = await prompts([
          {
            type: name ? null : "text",
            name: "name",
            message: "Skill name:",
            initial: basename(cwd).replace(/[^a-zA-Z0-9-_]/g, "-"),
            validate: (v) => v.length >= 2 || "Name must be at least 2 characters",
          },
          {
            type: description ? null : "text",
            name: "description",
            message: "Description (optional):",
          },
          {
            type: category ? null : "select",
            name: "category",
            message: "Category:",
            choices: CATEGORIES.map((c) => ({ title: c, value: c })),
          },
          {
            type: "multiselect",
            name: "tags",
            message: "Tags (optional):",
            choices: [
              { title: "automation", value: "automation" },
              { title: "testing", value: "testing" },
              { title: "documentation", value: "documentation" },
              { title: "refactoring", value: "refactoring" },
              { title: "debugging", value: "debugging" },
              { title: "security", value: "security" },
              { title: "performance", value: "performance" },
            ],
            hint: "- Space to select. Return to submit",
          },
        ], {
          onCancel: () => {
            info("Cancelled.");
            process.exit(0);
          },
        });

        name = name || answers.name;
        description = description || answers.description;
        category = category || answers.category;

        // Create local config
        const config = {
          name,
          description: description || undefined,
          category,
          tags: answers.tags?.length ? answers.tags : undefined,
          visibility: "private" as const,
        };

        saveLocalConfig(config, cwd);
        success(`Created .sciscisciscisciskillhub.json`);

        // Create SKILL.md if it doesn't exist
        if (!existsSync(join(cwd, "SKILL.md")) && !existsSync(join(cwd, "skill.md"))) {
          const template = generateSkillTemplate(name, description);
          writeFileSync(join(cwd, "SKILL.md"), template);
          success(`Created SKILL.md template`);
        }

        console.log();
        info("Next steps:");
        console.log(`  1. Edit ${colors.code("SKILL.md")} with your skill content`);
        console.log(`  2. Run ${colors.code("sciscisciscisciskillhub login")} if not logged in`);
        console.log(`  3. Run ${colors.code("sciscisciscisciskillhub push")} to upload your skill`);
        console.log();
      } else {
        // Quick init with defaults
        name = name || basename(cwd).replace(/[^a-zA-Z0-9-_]/g, "-");

        const config = {
          name,
          description,
          category: category || "Other",
          visibility: "private" as const,
        };

        saveLocalConfig(config, cwd);
        success(`Initialized skill: ${colors.bold(name)}`);

        if (!existsSync(join(cwd, "SKILL.md")) && !existsSync(join(cwd, "skill.md"))) {
          writeFileSync(join(cwd, "SKILL.md"), generateSkillTemplate(name, description));
          success(`Created SKILL.md`);
        }
      }
    });
}

async function linkExistingSkill(skillId: string, cwd: string): Promise<void> {
  if (!isLoggedIn()) {
    error("Not logged in. Run 'sciscisciscisciskillhub login' first.");
    process.exit(1);
  }

  const spin = spinner("Fetching skill info...");

  try {
    ensureAuthenticated();
    const client = getClient();

    // Try to get the skill
    const data = await client.getMySkill(skillId);

    spin.stop();

    // Save local config
    saveLocalConfig({
      skill_id: data.skill.id,
      name: data.skill.name,
      slug: data.skill.slug,
      description: data.skill.description,
      category: data.skill.category,
      tags: data.skill.tags,
      visibility: data.skill.visibility,
    }, cwd);

    success(`Linked to skill: ${colors.bold(data.skill.slug)}`);
    info(`Run 'sciscisciscisciskillhub pull' to download files.`);
  } catch (err) {
    spin.stop();
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

function generateSkillTemplate(name: string, description?: string): string {
  return `# ${name}

${description || "A skill for AI agents."}

## Description

Describe what this skill does and when to use it.

## Usage

Explain how the agent should use this skill.

## Examples

\`\`\`
Example usage or prompts
\`\`\`

## Notes

- Additional notes or caveats
`;
}
