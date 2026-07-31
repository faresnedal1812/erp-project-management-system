import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import env from "../config/env.js";
import prisma from "../config/database.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Protect Middleware — Guards routes that require authentication.
 *
 * HOW IT WORKS:
 * 1. Extracts the Bearer token from the Authorization header.
 * 2. Verifies the token signature and expiry using the access secret.
 * 3. Fetches the user from the database (ensures user still exists and is active).
 * 4. Attaches the user object to req.user for downstream use.
 *
 * WHY WE RE-FETCH THE USER FROM THE DB ON EVERY REQUEST:
 * A JWT is stateless — once issued it cannot be revoked on its own.
 * By fetching the user from the DB, we verify:
 * - The user account still exists (wasn't deleted).
 * - The user account is still active (wasn't banned).
 * This adds a small DB cost per request but guarantees correctness.
 * Future optimization: cache user status in Redis with a short TTL.
 *
 * WHY NOT CACHE THE USER IN THE TOKEN PAYLOAD:
 * Token payloads should contain minimal, stable data (just id and email).
 * Role assignments or status changes would not be reflected until the
 * token expires — a security risk in admin systems.
 */

export const protect = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Authorization token is missing"));
  }

  const token = authHeader.split(" ")[1];

  let decoded;

  try {
    decoded = jwt.verify(token, env.jwtAccessSecret);
  } catch (error) {
    return next(ApiError.unauthorized("Invalid or expired access token"));
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      roles: {
        select: {
          role: {
            select: {
              name: true,
              permissions: {
                select: {
                  permission: {
                    select: {
                      action: true,
                      resource: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return next(ApiError.unauthorized("User no longer exists"));
  }

  if (!user.isActive) {
    return next(ApiError.forbidden("Your account has been deactivated"));
  }

  // Flatten roles and permissions into a clean structure for downstream use.
  req.user = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isActive: user.isActive,
    roles: user.roles.map((ur) => ur.role.name),
    permissions: user.roles.flatMap((ur) =>
      ur.role.permissions.map(
        (rp) => `${rp.permission.action}:${rp.permission.resource}`,
      ),
    ),
  };

  next();
});
