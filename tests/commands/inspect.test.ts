/**
 * Inspect Command Tests
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import { Command } from "commander";
import { registerInspectCommand } from "../../src/commands/inspect.js";

vi.mock("../../src/lib/config.js", () => ({
  getLocalConfig: vi.fn(),
  isSkillProject: vi.fn(),
}));

vi.mock("../../src/commands/install.js", () => ({
  AGENTS: {
    claude: {
      name: "Claude Code",
      personalPath: ".claude/skills",
      projectPath: ".claude/skills",
      configFile: "SKILL.md",
    },
  },
}));

vi.mock("../../src/lib/files.js", () => ({
  getMainSkillFile: vi.fn(),
  hasRequiredFiles: vi.fn(),
  scanFiles: vi.fn(),
  formatBytes: vi.fn((n: number) => `${n} B`),
}));

vi.mock("../../src/utils/ui.js", () => ({
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  formatTable: vi.fn(() => "table"),
  colors: {
    success: (s: string) => s,
    warning: (s: string) => s,
    dim: (s: string) => s,
    bold: (s: string) => s,
    code: (s: string) => s,
  },
}));

describe("inspect command", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    registerInspectCommand(program);
    vi.restoreAllMocks();
  });

  test("command is registered", () => {
    const command = program.commands.find((c) => c.name() === "inspect");
    expect(command).toBeDefined();
  });

  test("has expected options", () => {
    const command = program.commands.find((c) => c.name() === "inspect");
    const options = command?.options || [];

    expect(options.find((o) => o.long === "--agent")).toBeDefined();
    expect(options.find((o) => o.long === "--json")).toBeDefined();
    expect(options.find((o) => o.long === "--files")).toBeDefined();
    expect(options.find((o) => o.long === "--content")).toBeDefined();
    expect(options.find((o) => o.long === "--list")).toBeDefined();
  });
});
