import { execSync } from "child_process";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Jest Global Setup — runs ONCE before all test suites.
 *
 * 1. Loads .env.test to ensure the test DB URL is used.
 * 2. Runs `prisma db push --force-reset` against the test database
 *    to create a clean schema before every full test run.
 *
 * WARNING: This WIPES the test database completely.
 *          NEVER set DATABASE_URL to your production or dev database
 *          inside .env.test.
 */
export default async function globalSetup() {
  // Load test environment variables and force overwrite any existing process.env
  dotenv.config({
    path: path.resolve(__dirname, "../../.env.test"),
    override: true,
  });

  const testDbUrl = process.env.DATABASE_URL;

  // Safety check: Ensure DATABASE_URL targets a local test database before resetting
  if (
    !testDbUrl ||
    !testDbUrl.includes("test") ||
    !testDbUrl.includes("localhost")
  ) {
    throw new Error(
      "❌ [Test Setup Danger] DATABASE_URL does not appear to be a test database! Reset aborted.",
    );
  }

  console.log("\n🧪 [Test Setup] Resetting test database schema...");

  execSync("npx prisma db push --force-reset --accept-data-loss", {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
    },
  });

  console.log("✅ [Test Setup] Test database ready.\n");
}
