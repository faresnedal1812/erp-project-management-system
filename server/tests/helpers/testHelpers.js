import supertest from "supertest";
import app from "../../src/app.js";
import prisma from "../../src/config/database.js";

/**
 * Test Helper Module
 *
 * Provides a Supertest request agent bound to the Express app
 * (without starting a real HTTP server) and shared DB utilities.
 */

// Supertest agent — makes requests directly to Express in-process
export const request = supertest(app);

// ── All resources and actions used across routes ─────────────
const RESOURCES = [
  "PROJECTS",
  "USERS",
  "ROLES",
  "TEAMS",
  "VENDORS",
  "CLIENTS",
  "EMPLOYEES",
  "DEPARTMENTS",
  "BRANCHES",
  "COMPANIES",
  "NOTIFICATIONS",
  "MEETINGS",
  "DOCUMENTS",
  "REPORTS",
  "AUDIT_LOGS",
  "DASHBOARD",
  "ANALYTICS",
  "PERMISSIONS",
];

const ACTIONS = ["CREATE", "READ", "UPDATE", "DELETE"];

/**
 * Seeds all CRUD permissions and an ADMIN role with full access.
 * Idempotent — safe to call multiple times in the same test run.
 *
 * @returns {string} The ADMIN role ID.
 */
export const seedAdminRole = async () => {
  // Upsert all permission combinations
  const permissionIds = [];

  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      const perm = await prisma.permission.upsert({
        where: {
          action_resource: { action, resource },
        },
        update: {},
        create: { action, resource },
        select: { id: true },
      });
      permissionIds.push(perm.id);
    }
  }

  // Upsert the ADMIN role
  const role = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "Full access role for testing" },
    select: { id: true },
  });

  // Assign all permissions to the role (replace strategy)
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      roleId: role.id,
      permissionId,
    })),
    skipDuplicates: true,
  });

  return role.id;
};

/**
 * Cleans all data from the test database between test suites.
 * Uses deleteMany in reverse-FK order to respect referential integrity.
 *
 * Call this in beforeAll() or afterAll() of each test file.
 */
export const cleanDatabase = async () => {
  // Safety Guard
  if (process.env.NODE_ENV !== "testing") {
    throw new Error("cleanDatabase() can only run in testing environment");
  }

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
      "cleanDatabase() refuses to run against a non-test database",
    );
  }

  const tableNames = [
    "taskAttachment",
    "taskComment",
    "timeEntry",
    "taskAssignment",
    "task",
    "milestone",
    "projectMember",
    "project",
    "document",
    "notification",
    "activityLog",
    "employee",
    "department",
    "branch",
    "companyInvite",
    "companyMember",
    "company",
    "userRole",
    "rolePermission",
    "role",
    "permission",
    "refreshToken",
    "user",
  ];

  for (const table of tableNames) {
    try {
      if (prisma[table]) {
        await prisma[table].deleteMany();
      }
    } catch (err) {
      // Propagate actual deletion failures (e.g. constraints, timeouts)
      // Only skip if it's absence explicitly expected
      if (err.code === "P2021") {
        // Table does not exist in the current database - safe to skip
        continue;
      }
      throw err;
    }
  }
};

/**
 * Registers a test user and returns the parsed response body.
 *
 * @param {object} overrides - Partial user fields to override defaults.
 * @returns {Promise<object>} Supertest response body
 */
export const createTestUser = async (overrides = {}) => {
  const userData = {
    firstName: "Test",
    lastName: "User",
    email: `testuser-${Date.now()}@test.com`,
    password: "TestPassword123!",
    ...overrides,
  };

  const res = await request.post("/api/v1/auth/register").send(userData);
  return { res, userData };
};

/**
 * Registers + verifies + assigns ADMIN role + logs in a test user.
 * Returns { accessToken, refreshToken, user, userData }.
 */
export const createAndLoginTestUser = async (overrides = {}) => {
  const { res: regRes, userData } = await createTestUser(overrides);

  // Manually verify the email in the DB so login succeeds
  await prisma.user.update({
    where: { email: userData.email },
    data: { isVerified: true },
  });

  // Seed ADMIN role with all permissions and assign it to this user
  const roleId = await seedAdminRole();
  const user = await prisma.user.findUnique({
    where: { email: userData.email },
    select: { id: true },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId } },
    update: {},
    create: { userId: user.id, roleId },
  });

  const loginRes = await request.post("/api/v1/auth/login").send({
    email: userData.email,
    password: userData.password,
  });

  return {
    accessToken: loginRes.body.data?.tokens?.accessToken,
    refreshToken: loginRes.body.data?.tokens?.refreshToken,
    user: loginRes.body.data?.user,
    userData,
    loginRes,
  };
};

/**
 * Disconnects Prisma after all tests in a file complete.
 * Call in afterAll().
 */
export const disconnectTestDb = async () => {
  await prisma.$disconnect();
};
