import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import {
  request,
  cleanDatabase,
  createTestUser,
  createAndLoginTestUser,
  disconnectTestDb,
} from "../helpers/testHelpers.js";

describe("Auth API", () => {
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectTestDb();
  });

  // ── REGISTER ──────────────────────────────────────────────

  describe("POST /api/v1/auth/register", () => {
    test("should register a new user successfully", async () => {
      const { res } = await createTestUser({
        email: "register-test@test.com",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.email).toBe("register-test@test.com");
    });

    test("should reject duplicate email", async () => {
      const res = await request.post("/api/v1/auth/register").send({
        firstName: "Dup",
        lastName: "User",
        email: "register-test@test.com",
        password: "TestPassword123!",
      });

      expect(res.status).toBe(409);
    });

    test("should reject invalid email format", async () => {
      const res = await request.post("/api/v1/auth/register").send({
        firstName: "Bad",
        lastName: "Email",
        email: "not-an-email",
        password: "TestPassword123!",
      });

      expect(res.status).toBe(422);
    });

    test("should reject missing required fields", async () => {
      const res = await request.post("/api/v1/auth/register").send({
        firstName: "OnlyFirst",
      });

      expect(res.status).toBe(422);
    });
  });

  // ── LOGIN ─────────────────────────────────────────────────

  describe("POST /api/v1/auth/login", () => {
    test("should return tokens for verified user", async () => {
      const { loginRes } = await createAndLoginTestUser({
        email: "login-success@test.com",
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.tokens).toHaveProperty("accessToken");
      expect(loginRes.body.data.tokens).toHaveProperty("refreshToken");
      expect(loginRes.body.data.user).toHaveProperty("id");
    });

    test("should reject wrong password", async () => {
      const res = await request.post("/api/v1/auth/login").send({
        email: "login-success@test.com",
        password: "WrongPassword999!",
      });

      expect(res.status).toBe(401);
    });

    test("should reject non-existent user", async () => {
      const res = await request.post("/api/v1/auth/login").send({
        email: "ghost@nobody.com",
        password: "TestPassword123!",
      });

      expect(res.status).toBe(401);
    });
  });

  // ── PROTECTED ROUTES ──────────────────────────────────────

  describe("GET /api/v1/auth/me", () => {
    test("should return user profile with valid token", async () => {
      const { accessToken } = await createAndLoginTestUser({
        email: "me-test@test.com",
      });

      const res = await request
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.email).toBe("me-test@test.com");
    });

    test("should reject request without auth token", async () => {
      const res = await request.get("/api/v1/auth/me");

      expect(res.status).toBe(401);
    });

    test("should reject request with invalid token", async () => {
      const res = await request
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid.fake.token");

      expect(res.status).toBe(401);
    });
  });

  // ── TOKEN REFRESH ─────────────────────────────────────────

  describe("POST /api/v1/auth/refresh", () => {
    test("should return a new access token with valid refresh token", async () => {
      const { refreshToken } = await createAndLoginTestUser({
        email: "refresh-test@test.com",
      });

      const res = await request.post("/api/v1/auth/refresh").send({
        refreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("accessToken");
    });

    test("should reject invalid refresh token", async () => {
      const res = await request.post("/api/v1/auth/refresh").send({
        refreshToken: "totally-invalid-token",
      });

      expect(res.status).toBe(401);
    });
  });

  // ── LOGOUT ────────────────────────────────────────────────

  describe("POST /api/v1/auth/logout", () => {
    test("should logout successfully with valid token", async () => {
      const { accessToken } = await createAndLoginTestUser({
        email: "logout-test@test.com",
      });

      const res = await request
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
    });
  });
});
