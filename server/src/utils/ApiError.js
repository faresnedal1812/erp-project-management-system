/**
 * Custom API Error class.
 *
 * WHY A CUSTOM ERROR CLASS:
 * JavaScript's built-in Error only has a message. In an API, we need:
 * - HTTP status codes to signal the type of failure to the client.
 * - A structured errors array for validation failures (multiple errors).
 * - An isOperational flag to distinguish expected errors (e.g., "email
 *   already exists") from unexpected bugs (e.g., null pointer).
 *
 * The global error handler uses isOperational to decide whether to expose
 * details to the client or return a generic "Internal Server Error."
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g., 400, 401, 404, 500)
   * @param {string} message - Human-readable error message
   * @param {Array} [errors=[]] - Array of detailed error objects (e.g., validation)
   * @param {boolean} [isOperational=true] - Whether this is an expected/handled error
   */
  constructor(statusCode, message, errors = [], isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;

    // Preserves proper stack trace in V8 (Node.js)
    Error.captureStackTrace(this, this.constructor);
  }

  // --- Factory methods for common HTTP errors ---

  static badRequest(message = "Bad Request", errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }

  static unprocessable(message = "Unprocessable Entity", errors = []) {
    return new ApiError(422, message, errors);
  }

  static internal(message = "Internal Server Error") {
    return new ApiError(500, message, [], false);
  }
}

export default ApiError;
