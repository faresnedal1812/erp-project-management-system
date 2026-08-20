import env from "./env.js";

/**
 * Swagger/OpenAPI configuration for swagger-jsdoc.
 *
 * WHY SWAGGER:
 * - Industry-standard API documentation.
 * - Auto-generates interactive API explorer at /api-docs.
 * - Clients, testers, and frontend devs can explore endpoints without
 *   reading source code.
 * - Keeps documentation synchronized with implementation when JSDoc
 *   annotations are kept beside the route definitions.
 */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ERP & Project Management System API",
      version: "1.0.0",
      description:
        "Enterprise Resource Planning and Project Management System REST API. " +
        "Designed for startups, agencies, and SMBs to centralize business operations.",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.port}/api/v1`,
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT access token",
        },
        CompanyIdAuth: {
          type: "apiKey",
          in: "header",
          name: "x-company-id",
          description: "Enter your Company ID",
        },
      },
    },
    security: [
      {
        BearerAuth: [],
        CompanyIdAuth: [],
      },
    ],
  },
  // Path to files containing Swagger annotations
  apis: ["./src/routes/*.js", "./src/docs/*.js", "./src/app.js"],
};

export default swaggerOptions;
