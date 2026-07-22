import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import swaggerOptions from "../config/swagger.js";

/**
 * Generates the Swagger specification based on our options
 * and the JSDoc comments in our route files.
 */
const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger documentation.
 * @param {import('express').Application} app
 */
export const setupSwagger = (app) => {
  // Serve the Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve the raw Swagger JSON (useful for postman imports, clients, etc.)
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
};
