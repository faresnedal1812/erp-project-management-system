import ApiError from "../utils/ApiError.js";

/**
 * 404 Not Found Middleware.
 *
 * This must be registered AFTER all valid routes.
 * Any request that reaches this middleware did not match a defined route.
 */
const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

export default notFound;
