/**
 * Jest configuration for ESM project.
 *
 * The project uses "type": "module", so we rely on Node's
 * --experimental-vm-modules flag (set in the npm test script).
 */
export default {
  // Use the default Node ESM runner
  testEnvironment: "node",

  // File extensions to look for
  moduleFileExtensions: ["js", "json"],

  // Test file patterns
  testMatch: ["**/tests/**/*.test.js"],

  // Global setup/teardown for database isolation
  globalSetup: "./tests/setup/globalSetup.js",
  globalTeardown: "./tests/setup/globalTeardown.js",

  // Setup env vars before test files load
  setupFiles: ["./tests/setup/setupEnv.js"],

  // Per-file setup
  setupFilesAfterEnv: [],

  // Transform: no transform needed for ESM — Node handles it natively
  transform: {},

  // Timeout for slow integration tests (DB + HTTP)
  testTimeout: 15000,

  // Run tests serially to avoid DB race conditions
  maxWorkers: 1,

  // Verbose output for clarity
  verbose: true,
};
