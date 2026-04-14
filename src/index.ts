#!/usr/bin/env node

/**
 * SkillHub CLI
 *
 * Discover, install, and manage AI agent skills
 */

import { Command } from "commander";
import { createRequire } from "module";
import { registerAuthCommands } from "./commands/auth.js";
import { registerInitCommand } from "./commands/init.js";
import { registerListCommand } from "./commands/list.js";
import { registerInstallCommand } from "./commands/install.js";
import { registerSearchCommand } from "./commands/search.js";
import { registerBrowseCommand } from "./commands/browse.js";
import { registerRecommendCommand } from "./commands/recommend.js";
import { registerInspectCommand } from "./commands/inspect.js";
import { registerTaxCommand } from "./commands/tax.js";
import { registerRemoveCommand } from "./commands/remove.js";
import { printBanner, colors } from "./utils/ui.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const program = new Command();

program
  .name("sciskill")
  .description("Discover, install, and manage AI agent skills")
  .version(version);

// ── Discover & Install (remote, no auth) ──
registerSearchCommand(program);
registerBrowseCommand(program);
registerRecommendCommand(program);
registerTaxCommand(program);
registerInstallCommand(program);

// ── Local & Manage ──
registerListCommand(program);
registerRemoveCommand(program);
registerInspectCommand(program);
registerInitCommand(program);

// ── Account ──
registerAuthCommands(program);

// Default action (no command)
program.action(() => {
  printBanner();

  console.log(colors.bold("Discover & Install (remote):"));
  console.log(`  ${colors.code("search <query>")}  Search for skills ${colors.dim("(s, find)")}`);
  console.log(`  ${colors.code("browse skills")}  Browse & filter skills by taxonomy`);
  console.log(`  ${colors.code("recommend")}      Get personalized recommendations ${colors.dim("(rec, suggest)")}`);
  console.log(`  ${colors.code("tax")}            List filter values (object, stage, task, domain)`);
  console.log(`  ${colors.code("install")}        Install a skill to your agent ${colors.dim("(i, add)")}`);
  console.log();

  console.log(colors.bold("Local & Manage:"));
  console.log(`  ${colors.code("list")}           List locally installed skills ${colors.dim("(ls)")}`);
  console.log(`  ${colors.code("remove")}        Remove an installed skill ${colors.dim("(rm, uninstall)")}`);
  console.log(`  ${colors.code("inspect")}        Inspect local skill in current directory`);
  console.log(`  ${colors.code("init")}           Initialize a new skill project`);
  console.log();

  console.log(colors.bold("Account:"));
  console.log(`  ${colors.code("login")}          Log in to SkillHub`);
  console.log(`  ${colors.code("logout")}         Log out`);
  console.log(`  ${colors.code("whoami")}         Show current logged in user`);
  console.log();

  console.log(colors.dim("Examples:"));
  console.log(colors.dim(`  $ sciskill browse skills --domain 'Life Sciences'`));
  console.log(colors.dim(`  $ sciskill browse skills --query genomics`));
  console.log(colors.dim(`  $ sciskill list --agent claude-code`));
  console.log(colors.dim(`  $ sciskill install anthropics/skills/frontend-design --agent claude-code`));
  console.log();

  console.log(`Run ${colors.code("sciskill <command> --help")} for more info.`);
  console.log();
});

// Parse arguments
program.parse(process.argv);
