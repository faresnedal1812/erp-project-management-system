import express from "express";
import morgan from "morgan";
import logger from "./config/logger.js";
import env from "./config/env.js";
import applySecurity from "./middlewares/security.js";
import errorHandler from "./middlewares/errorHandler.js";
import notFound from "./middlewares/notFound.js";
import { setupSwagger } from "./docs/swagger.js";
import ApiResponse from "./utils/ApiResponse.js";
import authRoutes from "./routes/auth.routes.js";
import roleRoutes from "./routes/role.routes.js";
import permissionRoutes from "./routes/permission.routes.js";
import userRoutes from "./routes/user.routes.js";
import companyRoutes from "./routes/company.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import branchRoutes from "./routes/branch.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import teamRoutes from "./routes/team.routes.js";
import projectRoutes from "./routes/project.routes.js";

const app = express();

// ============================================
// 1. Security Middleware
// ============================================
applySecurity(app);

// ============================================
// 2. Request Parsing Middleware
// ============================================
// Parse incoming JSON requests and put data in req.body
app.use(express.json({ limit: "10kb" }));
// Parse URL-encoded data (form submissions)
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ============================================
// 3. Logging Middleware
// ============================================
// Use morgan for HTTP request logging, piped into Pino
app.use(
  morgan(env.isDevelopment ? "dev" : "combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

// ============================================
// 4. API Documentation
// ============================================
setupSwagger(app);

// ============================================
// 5. Routes
// ============================================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is healthy
 */
app.get("/api/v1/health", (req, res) => {
  ApiResponse.ok(res, "Server is healthy", {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/permissions", permissionRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1/companies", organizationRoutes);
app.use("/api/v1/branches", branchRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/teams", teamRoutes);
app.use("/api/v1/projects", projectRoutes);

// ============================================
// 6. Error Handling
// ============================================
// Catch 404 and forward to error handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
