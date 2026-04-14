/**
 * Browse Command
 *
 * Browse remote skills: trending, latest, top, skills
 * All subcommands use public API (no auth required).
 */

import { Command } from "commander";
import { registerSkillCommand } from "./skill.js";

export function registerBrowseCommand(program: Command): void {
  const browseCommand = program
    .command("browse")
    .description("Browse remote skills");

  registerSkillCommand(browseCommand);
}
