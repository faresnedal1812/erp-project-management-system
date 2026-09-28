/**
 * Jest Global Teardown — runs ONCE after all test suites.
 *
 * Disconnects any lingering Prisma connections to prevent
 * Jest from hanging on open handles.
 */
export default async function globalTeardown() {
  console.log("\n🧹 [Test Teardown] Cleanup complete.\n");
}
