/**
 * Authentication Commands
 * 
 * login, logout, whoami
 */

import { Command } from "commander";
import { login, logout, whoami } from "../lib/auth.js";
import { isLoggedIn, getAuth } from "../lib/config.js";
import { success, error, info, spinner, colors, formatTable } from "../utils/ui.js";

export function registerAuthCommands(program: Command): void {
  // Login command
  program
    .command("login")
    .description("Log in to sciskillhub")
    .option("--token <token>", "Authenticate with an existing token (headless mode)")
    .action(async (options) => {
      if (isLoggedIn()) {
        const auth = getAuth();
        info(`Already logged in as ${colors.bold(auth?.user?.username || "unknown")}`);
        info("Use 'sciskillhub logout' to log out first.");
        return;
      }

      const useToken = options.token?.trim();
      if (!useToken) {
        info("Opening browser for authentication...");
      }
      const spin = useToken
        ? spinner("Verifying token...")
        : spinner("Waiting for browser login...");

      try {
        const result = await login(useToken);

        if (result.success && result.user) {
          spin.stop();
          success(`Logged in as ${colors.bold(result.user.username)}`);
          info(`Email: ${result.user.email}`);
          info(`Tier: ${colors.primary(result.user.tier)}`);
        } else {
          spin.stop();
          error(result.error || "Login failed");
          process.exit(1);
        }
      } catch (err) {
        spin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // Logout command
  program
    .command("logout")
    .description("Log out from sciskillhub")
    .action(async () => {
      if (!isLoggedIn()) {
        info("Not logged in.");
        return;
      }

      const auth = getAuth();
      const spin = spinner("Logging out...");

      try {
        await logout();
        spin.stop();
        success(`Logged out from ${colors.bold(auth?.user?.username || "sciskillhub")}`);
      } catch (err) {
        spin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // Whoami command
  program
    .command("whoami")
    .description("Show current logged in user")
    .action(async () => {
      if (!isLoggedIn()) {
        info("Not logged in. Run 'sciskillhub login' to authenticate.");
        return;
      }

      const spin = spinner("Fetching user info...");

      try {
        const user = await whoami();
        spin.stop();

        if (user) {
          console.log();
          console.log(formatTable([
            [colors.dim("Username:"), colors.bold(user.username)],
            [colors.dim("Email:"), user.email],
            [colors.dim("Tier:"), colors.primary(user.tier)],
            [colors.dim("User ID:"), colors.dim(user.id)],
          ]));
          console.log();
        } else {
          error("Failed to fetch user info. Try logging in again.");
          process.exit(1);
        }
      } catch (err) {
        spin.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
