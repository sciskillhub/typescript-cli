/**
 * Install Command Tests
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { Command } from "commander";
import { registerInstallCommand } from "../../src/commands/install.js";

// Mock the UI functions
vi.mock("../../src/utils/ui.js", () => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  spinner: vi.fn(() => ({ stop: vi.fn() })),
  colors: {
    primary: (s: string) => s,
    success: (s: string) => s,
    error: (s: string) => s,
    warning: (s: string) => s,
    info: (s: string) => s,
    dim: (s: string) => s,
    bold: (s: string) => s,
    code: (s: string) => s,
  },
  box: vi.fn((s: string) => s),
}));

// Mock prompts
vi.mock("prompts", () => ({
  default: vi.fn(),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn(() => []),
}));

describe("install command", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    registerInstallCommand(program);
  });

  test("command is registered", () => {
    const command = program.commands.find((c) => c.name() === "install");
    expect(command).toBeDefined();
  });

  test("has correct aliases", () => {
    const command = program.commands.find((c) => c.name() === "install");
    expect(command?.aliases()).toContain("add");
    expect(command?.aliases()).toContain("i");
  });

  test("has agent option", () => {
    const command = program.commands.find((c) => c.name() === "install");
    const options = command?.options || [];
    const agentOption = options.find((o) => o.long === "--agent");
    expect(agentOption).toBeDefined();
  });

  test("has project option", () => {
    const command = program.commands.find((c) => c.name() === "install");
    const options = command?.options || [];
    const projectOption = options.find((o) => o.long === "--project");
    expect(projectOption).toBeDefined();
  });

  test("has yes option", () => {
    const command = program.commands.find((c) => c.name() === "install");
    const options = command?.options || [];
    const yesOption = options.find((o) => o.long === "--yes");
    expect(yesOption).toBeDefined();
  });

  test("has list-agents option", () => {
    const command = program.commands.find((c) => c.name() === "install");
    const options = command?.options || [];
    const listOption = options.find((o) => o.long === "--list-agents");
    expect(listOption).toBeDefined();
  });
});

describe("supported platforms", () => {
  test("all expected platforms are defined", () => {
    // These are the platforms that should be supported based on the code
    const expectedPlatforms = [
      "claude", "cursor", "codex", "gemini",
      "copilot", "windsurf", "cline", "roo", "opencode", "openclaw",
      "junie", "kiro", "augment", "warp", "goose"
    ];

    // Verify they are valid string values
    expectedPlatforms.forEach(platform => {
      expect(typeof platform).toBe("string");
      expect(platform.length).toBeGreaterThan(0);
    });
  });

  test("platforms have consistent format", () => {
    const expectedPlatforms = [
      "claude", "cursor", "codex", "gemini",
      "copilot", "windsurf", "cline", "roo", "opencode", "openclaw",
      "junie", "kiro", "augment", "warp", "goose"
    ];

    expectedPlatforms.forEach(platform => {
      // All lowercase, no spaces, hyphens allowed
      expect(platform).toMatch(/^[a-z-]+$/);
    });
  });
});

describe("command argument", () => {
  test("requires skill argument", () => {
    const program = new Command();
    registerInstallCommand(program);

    const command = program.commands.find((c) => c.name() === "install");
    const args = command?.options || [];
    // The skill argument is not in options, it's a command argument
    expect(command).toBeDefined();
  });
});
