/**
 * Recommend Command
 * 
 * Get personalized skill recommendations
 */

import { Command } from "commander";
import prompts from "prompts";
import { getClient } from "../lib/api.js";
import { 
  error, 
  info, 
  spinner, 
  colors,
  formatTable,
} from "../utils/ui.js";

const TASK_TYPES = [
  { title: "Frontend Development", value: "frontend" },
  { title: "Backend Development", value: "backend" },
  { title: "DevOps & CI/CD", value: "devops" },
  { title: "Data & Analytics", value: "data" },
  { title: "Testing & QA", value: "testing" },
  { title: "Documentation", value: "documentation" },
  { title: "Code Review", value: "review" },
  { title: "Writing & Content", value: "writing" },
  { title: "Design & UI/UX", value: "design" },
  { title: "All / General", value: "all" },
];

export function registerRecommendCommand(program: Command): void {
  program
    .command("recommend")
    .alias("rec")
    .alias("suggest")
    .description("Get personalized skill recommendations")
    .option("-t, --task <type>", "Task type (frontend, backend, devops, etc.)")
    .option("-q, --query <query>", "Describe what you need")
    .option("-l, --limit <n>", "Number of results", "10")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const client = getClient();
      const limit = parseInt(options.limit, 10) || 10;

      let query = options.query;
      let taskType = options.task;

      // Interactive mode if no query provided
      if (!query && !taskType) {
        const answers = await prompts([
          {
            type: "select",
            name: "taskType",
            message: "What are you working on?",
            choices: TASK_TYPES,
          },
          {
            type: "text",
            name: "query",
            message: "Describe what you need (optional):",
          },
        ], {
          onCancel: () => {
            info("Cancelled.");
            process.exit(0);
          },
        });

        taskType = answers.taskType;
        query = answers.query;
      }

      // Build search query
      const searchQuery = buildSearchQuery(taskType, query);

      const spin = spinner("Finding recommendations...");

      try {
        // Use public API (no auth required)
        const results = await client.publicSearch(searchQuery, {
          limit,
        });

        spin.stop();

        if (results.length === 0) {
          info("No recommendations found. Try different criteria.");
          console.log();
          info("Browse all skills:");
          console.log(`  ${colors.code("sciskill trending")}`);
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        console.log();
        console.log(colors.bold("💡 Recommended Skills"));
        if (taskType && taskType !== "all") {
          console.log(colors.dim(`   For: ${TASK_TYPES.find(t => t.value === taskType)?.title || taskType}`));
        }
        console.log();

        // Display results with descriptions
        for (const [idx, skill] of results.entries()) {
          const rank = idx + 1;
          const matchPercent = skill.similarity 
            ? `${Math.round(skill.similarity * 100)}% match`
            : "";
          
          console.log(`${colors.bold(`${rank}.`)} ${colors.bold(skill.name)} ${colors.dim(`(${skill.slug})`)}`);
          
          if (skill.description) {
            const desc = skill.description.length > 100 
              ? skill.description.substring(0, 100) + "..."
              : skill.description;
            console.log(`   ${colors.dim(desc)}`);
          }
          
          console.log(`   ${colors.success(matchPercent)}`);
          console.log();
        }

        info(`Install with: ${colors.code("sciskill install <slug>")}`);
        console.log();

      } catch (err) {
        spin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

function buildSearchQuery(taskType?: string, customQuery?: string): string {
  const parts: string[] = [];

  // Add task type context
  switch (taskType) {
    case "frontend":
      parts.push("React Vue frontend UI components web development");
      break;
    case "backend":
      parts.push("API backend server Node.js Python database");
      break;
    case "devops":
      parts.push("DevOps CI/CD deployment Docker Kubernetes infrastructure");
      break;
    case "data":
      parts.push("data analysis analytics processing ETL");
      break;
    case "testing":
      parts.push("testing QA unit test integration test automation");
      break;
    case "documentation":
      parts.push("documentation README markdown technical writing");
      break;
    case "review":
      parts.push("code review refactoring best practices");
      break;
    case "writing":
      parts.push("writing content copywriting editing");
      break;
    case "design":
      parts.push("design UI UX prototyping wireframe");
      break;
  }

  // Add custom query
  if (customQuery) {
    parts.push(customQuery);
  }

  // Default query if nothing specified
  if (parts.length === 0) {
    parts.push("best practices coding productivity");
  }

  return parts.join(" ");
}
