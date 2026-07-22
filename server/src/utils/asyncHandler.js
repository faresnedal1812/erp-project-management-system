/**
 * Async Handler — eliminates repetitive try/catch in route handlers.
 *
 * WHY:
 * Without this, every async controller would need:
 *   try { ... } catch (error) { next(error); }
 *
 * This wrapper catches rejected promises and forwards them to Express's
 * global error handler automatically.
 *
 * USAGE:
 *   router.get('/users', asyncHandler(userController.getAll));
 *
 * HOW IT WORKS:
 * It returns a new function that wraps the original handler in a Promise.
 * If the promise rejects, .catch(next) passes the error to Express's
 * error-handling middleware chain.
 *
 * @param {Function} fn - Async Express route handler (req, res, next) => {}
 * @returns {Function} Express-compatible middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
