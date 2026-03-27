#!/usr/bin/env node

/**
 * SkillHub CLI
 *
 * Create, publish, and manage your AI agent skills
 *
 * Similar to: npx skills (skills.sh)
 */

import { Command } from "commander";
import { createRequire } from "module";
import { registerAuthCommands } from "./commands/auth.js";
import { registerInitCommand } from "./commands/init.js";
import { registerPushCommand } from "./commands/push.js";
import { registerPullCommand } from "./commands/pull.js";
import { registerPublishCommand } from "./commands/publish.js";
import { registerListCommand } from "./commands/list.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerInstallCommand } from "./commands/install.js";
import { registerSearchCommand } from "./commands/search.js";
import { registerTrendingCommand } from "./commands/trending.js";
import { registerLatestCommand } from "./commands/latest.js";
import { registerRecommendCommand } from "./commands/recommend.js";
import { registerTopCommand } from "./commands/top.js";
import { printBanner, colors } from "./utils/ui.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const program = new Command();

program
  .name("skillhub")
  .description("Create, publish, and manage your AI agent skills")
  .version(version);

// Register all commands
registerAuthCommands(program);
registerInitCommand(program);
registerPushCommand(program);
registerPullCommand(program);
registerPublishCommand(program);
registerListCommand(program);
registerStatusCommand(program);

// New public commands (like skills.sh)
registerInstallCommand(program);
registerSearchCommand(program);
registerTrendingCommand(program);
registerLatestCommand(program);
registerRecommendCommand(program);
registerTopCommand(program);

// Default action (no command)
program.action(() => {
  printBanner();
  
  console.log(colors.bold("Discover & Install:"));
  console.log(`  ${colors.code("install")}    Install a skill to your agent ${colors.dim("(i, add)")}`);
  console.log(`  ${colors.code("search")}     Search for skills ${colors.dim("(s, find)")}`);
  console.log(`  ${colors.code("trending")}   Show trending skills ${colors.dim("(hot, popular)")}`);
  console.log(`  ${colors.code("latest")}     Show recently added skills ${colors.dim("(new, recent)")}`);
  console.log(`  ${colors.code("recommend")}  Get personalized recommendations ${colors.dim("(rec, suggest)")}`);
  console.log(`  ${colors.code("top")}        Show all-time leaderboard ${colors.dim("(leaderboard, rank)")}`);
  console.log();
  
  console.log(colors.bold("Create & Manage:"));
  console.log(`  ${colors.code("login")}      Log in to SkillHub`);
  console.log(`  ${colors.code("init")}       Initialize a new skill project`);
  console.log(`  ${colors.code("push")}       Push local files to remote`);
  console.log(`  ${colors.code("pull")}       Pull remote files to local`);
  console.log(`  ${colors.code("status")}     Show local vs remote status`);
  console.log(`  ${colors.code("publish")}    Publish skill to public directory`);
  console.log(`  ${colors.code("list")}       List your skills ${colors.dim("(ls)")}`);
  console.log(`  ${colors.code("list tag")}   List/search popular tags ${colors.dim("(tags)")}`);
  console.log(`  ${colors.code("list subject")} List/search subjects ${colors.dim("(subjects, category)")}`);
  console.log(`  ${colors.code("list skill")} List/search skills ${colors.dim("(skills)")}`);
  console.log(`  ${colors.code("whoami")}     Show current logged in user`);
  console.log();
  
  console.log(colors.dim("Examples:"));
  console.log(colors.dim(`  $ skillhub install anthropics/skills/frontend-design`));
  console.log(colors.dim(`  $ skillhub search "react best practices"`));
  console.log(colors.dim(`  $ skillhub trending --limit 10`));
  console.log(colors.dim(`  $ skillhub list tag biology`));
  console.log(colors.dim(`  $ skillhub list subject life`));
  console.log(colors.dim(`  $ skillhub list skill --query anndata --subject life-science --tag genomics`));
  console.log();
  
  console.log(`Run ${colors.code("skillhub <command> --help")} for more info.`);
  console.log();
});

// Parse arguments
program.parse(process.argv);
