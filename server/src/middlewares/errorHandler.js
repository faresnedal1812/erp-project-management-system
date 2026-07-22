import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";
import env from "../config/env.js";

/**
 * Global Error Handling Middleware.
 *
 * WHY CENTRALIZED:
 * Without this, every route handler would need its own error formatting
 * logic, leading to inconsistent responses and duplicated code.
 *
 * This middleware catches ALL errors that reach Express's error chain
 * and returns a consistent { success, message, errors } response.
 *
 * It handles three categories:
 * 1. Known operational errors (ApiError) — return as-is.
 * 2. Library-specific errors (Zod, Prisma) — translate to ApiError format.
 * 3. Unknown errors — log and return generic 500.
 */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // ── Zod Validation Errors ──
  // Zod throws ZodError when schema.parse() fails.
  // We extract the field-level messages into a flat errors array.
  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    error = ApiError.unprocessable("Validation failed", formattedErrors);
  }

  // ── Prisma Known Errors ──
  // Prisma wraps database errors in PrismaClientKnownRequestError.
  // We translate common error codes into user-friendly API responses.
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        // Unique constraint violation
        const field = error.meta?.target?.join(", ") || "field";
        error = ApiError.conflict(`A record with this ${field} already exists`);
        break;
      }
      case "P2025":
        // Record not found
        error = ApiError.notFound("Record not found");
        break;
      case "P2003":
        // Foreign key constraint failure
        error = ApiError.badRequest("Related record not found");
        break;
      default:
        error = ApiError.internal("A database error occurred");
        break;
    }
  }

  // ── Prisma Validation Errors ──
  if (error instanceof Prisma.PrismaClientValidationError) {
    error = ApiError.badRequest("Invalid data provided to database query");
  }

  // ── Fallback: unknown errors ──
  if (!(error instanceof ApiError)) {
    logger.error(error, "Unhandled error");
    error = ApiError.internal(
      env.isDevelopment ? error.message : "Internal Server Error",
    );
  }

  // ── Log operational errors at warn level ──
  if (error.isOperational) {
    logger.warn(
      { statusCode: error.statusCode, url: req.originalUrl },
      error.message,
    );
  }

  // ── Send response ──
  return res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors,
    ...(env.isDevelopment && { stack: error.stack }),
  });
};

export default errorHandler;
