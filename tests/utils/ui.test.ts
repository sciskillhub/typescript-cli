/**
 * UI Utilities Tests
 */

import { describe, test, expect } from "vitest";
import { formatTable, formatStatus, formatVisibility, formatDate, formatBytes, box } from "../../src/utils/ui.js";

describe("formatTable", () => {
  test("formats simple rows without headers", () => {
    const rows = [
      ["Name", "Value"],
      ["Alice", "25"],
      ["Bob", "30"],
    ];
    const result = formatTable(rows);
    expect(result).toContain("Name");
    expect(result).toContain("Alice");
    expect(result).toContain("Bob");
  });

  test("formats table with headers and separator", () => {
    const rows = [
      ["Name", "Age"],
      ["Alice", "25"],
    ];
    const result = formatTable(rows, { headers: ["Name", "Age"] });
    const lines = result.split("\n");
    expect(lines[0]).toContain("Name");
    expect(lines[1]).toMatch(/─+/); // separator line
  });

  test("calculates column widths correctly", () => {
    const rows = [
      ["A", "Short"],
      ["Longer Name", "X"],
    ];
    const result = formatTable(rows, { padding: 2 });
    // All cells in a column should have same width
    const lines = result.split("\n");
    expect(lines[0].length).toBeGreaterThanOrEqual(lines[1].length);
  });

  test("handles empty rows", () => {
    const result = formatTable([]);
    expect(result).toBe("");
  });

  test("handles numbers in cells", () => {
    const rows = [
      [1, 2, 3],
      ["a", "b", "c"],
    ];
    const result = formatTable(rows);
    expect(result).toContain("1");
    expect(result).toContain("a");
  });
});

describe("formatStatus", () => {
  test("formats published status", () => {
    const result = formatStatus("published");
    expect(result).toContain("published");
  });

  test("formats draft status", () => {
    const result = formatStatus("draft");
    expect(result).toContain("draft");
  });

  test("formats archived status", () => {
    const result = formatStatus("archived");
    expect(result).toContain("archived");
  });

  test("returns unknown status as-is", () => {
    const result = formatStatus("unknown");
    expect(result).toBe("unknown");
  });
});

describe("formatVisibility", () => {
  test("formats public visibility", () => {
    const result = formatVisibility("public");
    expect(result).toContain("public");
  });

  test("formats unlisted visibility", () => {
    const result = formatVisibility("unlisted");
    expect(result).toContain("unlisted");
  });

  test("formats private visibility", () => {
    const result = formatVisibility("private");
    expect(result).toContain("private");
  });

  test("returns unknown visibility as-is", () => {
    const result = formatVisibility("unknown");
    expect(result).toBe("unknown");
  });
});

describe("formatDate", () => {
  test("formats ISO date string", () => {
    const result = formatDate("2024-03-22T10:30:00Z");
    expect(result).toContain("2024");
    expect(result).toMatch(/Mar/);
  });

  test("formats Date object", () => {
    const date = new Date("2024-03-22T10:30:00Z");
    const result = formatDate(date);
    expect(result).toContain("2024");
  });

  test("handles different date formats", () => {
    const dates = [
      "2024-01-15",
      "2024-12-31T23:59:59Z",
      new Date("2024-06-01"),
    ];
    dates.forEach(d => {
      const result = formatDate(d);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

describe("formatBytes", () => {
  test("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  test("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  test("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  test("formats megabytes", () => {
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
  });

  test("formats gigabytes", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
  });

  test("handles large numbers", () => {
    const result = formatBytes(5.5 * 1024 * 1024 * 1024);
    expect(result).toContain("GB");
  });
});

describe("box", () => {
  test("creates simple box", () => {
    const result = box("Hello");
    expect(result).toContain("╭");
    expect(result).toContain("╮");
    expect(result).toContain("╰");
    expect(result).toContain("╯");
    expect(result).toContain("Hello");
  });

  test("creates box with title", () => {
    const result = box("Content", "Title");
    expect(result).toContain("Title");
    expect(result).toContain("Content");
  });

  test("handles multiline content", () => {
    const result = box("Line 1\nLine 2");
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
  });

  test("handles empty content", () => {
    const result = box("");
    expect(result).toContain("╭");
    expect(result).toContain("╮");
  });
});
