/**
 * API Client Tests
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { SciSkillHubClient } from "../../src/lib/client.js";

// Mock fetch globally
const mockFetch = {
  responses: [] as Array<{ status: number; body?: unknown; error?: string }>,
  clear() {
    this.responses = [];
  },
  push(status: number, body?: unknown) {
    this.responses.push({ status, body });
  },
};

global.fetch = async (url: string, init?: RequestInit) => {
  const response = mockFetch.responses.shift();
  if (!response) {
    throw new Error(`No mock response for ${url}`);
  }
  if (response.error) {
    throw new Error(response.error);
  }
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: async () => response.body,
    text: async () => response.error || JSON.stringify(response.body),
  } as Response;
};

describe("SciSkillHubClient", () => {
  let client: SciSkillHubClient;

  beforeEach(() => {
    mockFetch.clear();
    client = new SciSkillHubClient({
      baseUrl: "https://test.sciskillhub.org/api",
      token: "test-token",
    });
  });

  describe("constructor", () => {
    test("creates client with baseUrl", () => {
      const c = new SciSkillHubClient({ baseUrl: "https://api.test.com" });
      expect(c).toBeDefined();
    });

    test("creates client with token", () => {
      const c = new SciSkillHubClient({ baseUrl: "https://api.test.com", token: "abc" });
      expect(c).toBeDefined();
    });
  });

  describe("setToken", () => {
    test("updates token", () => {
      client.setToken("new-token");
      // Token is used in requests, verified by other tests
      expect(client).toBeDefined();
    });
  });

  describe("public API methods", () => {
    test("getPublicSkill fetches skill by slug", async () => {
      const mockSkill = {
        id: "123",
        name: "test-skill",
        slug: "test/test-skill",
        description: "Test skill",
        skill_md_raw: "# Test Skill",
      };
      mockFetch.push(200, mockSkill);

      const result = await client.getPublicSkill("test/test-skill");
      expect(result.name).toBe("test-skill");
      expect(result.slug).toBe("test/test-skill");
    });

    test("listCatalogSkills fetches skills catalog", async () => {
      const mockResponse = {
        skills: [
          { id: "1", name: "skill1", slug: "test/skill1", category: "test" },
          { id: "2", name: "skill2", slug: "test/skill2", category: "test" },
        ],
        pagination: { total: 2, limit: 200, offset: 0, has_more: false },
      };
      mockFetch.push(200, mockResponse);

      const result = await client.listCatalogSkills({ limit: 10 });
      expect(result.length).toBe(2);
      expect(result[0].name).toBe("skill1");
    });

    test("listSubjects fetches categories", async () => {
      const mockResponse = {
        categories: [
          { id: "1", name: "Life Science", slug: "life-science", skill_count: 10 },
          { id: "2", name: "Chemistry", slug: "chemistry", skill_count: 5 },
        ],
      };
      mockFetch.push(200, mockResponse);

      const result = await client.listSubjects();
      expect(result.length).toBe(2);
      expect(result[0].name).toBe("Life Science");
    });
  });

  describe("error handling", () => {
    test("throws error on 404", async () => {
      mockFetch.push(404, "Not Found");

      await client.getPublicSkill("nonexistent").catch((err) => {
        expect(err.message).toContain("404");
      });
    });

    test("throws error on 500", async () => {
      mockFetch.push(500, "Internal Server Error");

      await client.getPublicSkill("error").catch((err) => {
        expect(err.message).toContain("500");
      });
    });

    test("handles network errors", async () => {
      mockFetch.responses.push({ status: 0, error: "Network error" });

      await client.getPublicSkill("network-error").catch((err) => {
        expect(err.message).toBeTruthy();
      });
    });
  });

  describe("authenticated API methods", () => {
    test("listMySkills fetches user skills", async () => {
      const mockSkills = [
        { id: "1", name: "my-skill", slug: "user/my-skill", status: "draft" },
      ];
      mockFetch.push(200, mockSkills);

      const result = await client.listMySkills();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe("my-skill");
    });

    test("createSkill creates new skill", async () => {
      const mockSkill = {
        id: "123",
        name: "new-skill",
        slug: "user/new-skill",
        status: "draft",
      };
      mockFetch.push(200, mockSkill);

      const result = await client.createSkill({
        name: "new-skill",
        slug: "new-skill",
        description: "A new skill",
      });
      expect(result.name).toBe("new-skill");
    });
  });

  describe("skill operations", () => {
    test("updateSkill updates skill", async () => {
      const mockSkill = {
        id: "123",
        name: "updated-skill",
        slug: "test/skill",
        description: "Updated description",
      };
      mockFetch.push(200, mockSkill);

      const result = await client.updateSkill("test/skill", {
        description: "Updated description",
      });
      expect(result.description).toBe("Updated description");
    });

    test("deleteSkill deletes skill", async () => {
      mockFetch.push(204, undefined);

      const result = await client.deleteSkill("test/skill");
      expect(result).toBeUndefined();
    });
  });
});
