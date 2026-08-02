import ApiError from "../utils/ApiError.js";

/**
 * Authorization Middleware — requirePermission.
 *
 * HOW IT WORKS:
 * This middleware must always be used AFTER protect, because it reads
 * req.user.permissions which protect populates from the database.
 *
 * It receives an action and resource, builds the permission string
 * "ACTION:RESOURCE", and checks if it exists in req.user.permissions.
 *
 * WHY THIS DESIGN (vs. re-querying DB):
 * - protect already loaded all user roles and permissions in one query.
 * - Checking against an in-memory array is O(n) and needs no DB roundtrip.
 * - This is the correct pattern for request-scoped authorization.
 *
 * USAGE:
 *   router.delete('/roles/:id',
 *     protect,
 *     requirePermission('DELETE', 'ROLES'),
 *     asyncHandler(deleteRole)
 *   );
 *
 * @param {string} action   - e.g. 'CREATE', 'READ', 'UPDATE', 'DELETE'
 * @param {string} resource - e.g. 'USERS', 'ROLES', 'PROJECTS'
 */
const requirePermission = (action, resource) => (req, _res, next) => {
  const requiredPermission = `${action}:${resource}`;
  const hasPermission = req.user?.permissions?.includes(requiredPermission);

  if (!hasPermission) {
    return next(
      ApiError.forbidden(
        `You do not have permission to perform this action: ${requiredPermission}`,
      ),
    );
  }

  next();
};

export default requirePermission;
