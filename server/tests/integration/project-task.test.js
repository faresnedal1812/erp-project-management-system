import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import {
  request,
  cleanDatabase,
  createAndLoginTestUser,
  disconnectTestDb,
} from "../helpers/testHelpers.js";
import prisma from "../../src/config/database.js";

/**
 * Project & Task Integration Tests
 *
 * Tests the full lifecycle: company creation → project creation →
 * task CRUD → CANCELLED project constraints.
 */
describe("Project & Task API", () => {
  let accessToken;
  let companyId;
  let projectId;
  let taskId;

  beforeAll(async () => {
    await cleanDatabase();

    // Create and login a user
    const result = await createAndLoginTestUser({
      email: "project-test@test.com",
    });
    accessToken = result.accessToken;
    const userId = result.user.id;

    // Create a company for this user
    const companyRes = await request
      .post("/api/v1/companies")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test Company", industry: "Technology" });

    console.log("COMPANY CREATION RES:", companyRes.body);

    companyId = companyRes.body.data?.id;

    const branchRes = await request
      .post("/api/v1/branches")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-company-id", companyId)
      .send({
        companyId,
        name: "Second Branch",
      });
    const departmentRes = await request
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-company-id", companyId)
      .send({
        companyId,
        branchId: branchRes.body.data?.id,
        name: "Second Branch",
      });

    await request
      .post("/api/v1/employees")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-company-id", companyId)
      .send({
        userId,
        departmentId: departmentRes.body.data?.id,
        employeeNumber: "12312323",
        position: "Full stack",
        hireDate: new Date(),
      });
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectTestDb();
  });

  // ── COMPANY GUARD ─────────────────────────────────────────

  describe("Company Context", () => {
    test("should have created a company successfully", () => {
      expect(companyId).toBeDefined();
    });
  });

  // ── PROJECT CRUD ──────────────────────────────────────────

  describe("POST /api/v1/projects", () => {
    test("should create a project successfully", async () => {
      const res = await request
        .post(`/api/v1/projects`)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("x-company-id", companyId)
        .send({
          name: "Test Project",
          description: "A project for integration testing",
          visibility: "PUBLIC",
          startDate: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.name).toBe("Test Project");
      projectId = res.body.data.id;
    });

    test("should reject project creation without auth", async () => {
      const res = await request
        .post(`/api/v1/projects`)
        .send({ name: "Unauthorized Project" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/companies", () => {
    test("should list projects for the company", async () => {
      const res = await request
        .get(`/api/v1/projects`)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("x-company-id", companyId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── TASK CRUD ─────────────────────────────────────────────

  describe("POST /api/v1/projects/:projectId/tasks", () => {
    test("should create a task in the project", async () => {
      const res = await request
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("x-company-id", companyId)
        .send({
          title: "Test Task",
          description: "A task for testing",
          priority: "HIGH",
          status: "TODO",
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.title).toBe("Test Task");
      taskId = res.body.data.id;
    });
  });

  describe("PUT /api/v1/tasks/:id", () => {
    test("should update a task status", async () => {
      const res = await request
        .put(`/api/v1/tasks/${taskId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("x-company-id", companyId)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("IN_PROGRESS");
    });
  });

  // ── CANCELLED PROJECT CONSTRAINTS ─────────────────────────

  describe("CANCELLED project constraints", () => {
    test("should block task creation on a CANCELLED project", async () => {
      // First, cancel the project by updating its status directly
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "CANCELLED" },
      });

      const res = await request
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("x-company-id", companyId)
        .send({
          title: "Should Fail",
          description: "This task should not be created",
          priority: "LOW",
          status: "TODO",
        });

      expect(res.status).toBe(400);
    });

    test("should block task update on a CANCELLED project", async () => {
      const res = await request
        .put(`/api/v1/tasks/${taskId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("x-company-id", companyId)
        .send({ status: "DONE" });

      expect(res.status).toBe(400);
    });

    test("should still allow reading tasks on a CANCELLED project", async () => {
      const res = await request
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("x-company-id", companyId);

      expect(res.status).toBe(200);
      expect(res.body.data[0]).toHaveProperty("id");
    });
  });
});
