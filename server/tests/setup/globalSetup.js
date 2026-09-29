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
  let isSafe = false;
  try {
    const parsed = new URL(testDbUrl);
    const dbName = decodeURIComponent(parsed.pathname.slice(1));
    isSafe =
      parsed.protocol === "postgresql:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname) &&
      dbName === "test_db";
  } catch (error) {
    isSafe = false;
  }
  if (!isSafe) {
    throw new Error(
      "❌ [Test Setup Danger] Target database is not a safe local test database!",
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
