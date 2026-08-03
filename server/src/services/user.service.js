import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

/**
 * User Service — business logic for user profiles, roles, and status.
 */

export const getAllUsers = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              permissions: {
                select: {
                  permission: {
                    select: {
                      id: true,
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
    throw ApiError.notFound("User not found");
  }

  return user;
};

export const updateUser = async (id, data) => {
  // Ensure user exists
  await getUserById(id);

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      updatedAt: true,
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  logger.info({ userId: id }, "User metadata updated");
  return updatedUser;
};

/**
 * Assigns (syncs) roles to a user.
 *
 * Implements a replace (sync) transactional strategy:
 * 1. Delete all current user-role links.
 * 2. Create the new user-role links.
 */
export const assignRolesToUser = async (userId, roleIds) => {
  // Ensure user exists
  await getUserById(userId);

  const uniqueRoleIds = [...new Set(roleIds)];

  // Verify all provided role IDs actually exist
  const roles = await prisma.role.findMany({
    where: { id: { in: uniqueRoleIds } },
    select: { id: true },
  });

  if (roles.length !== uniqueRoleIds.length) {
    throw ApiError.badRequest("One or more provided role IDs do not exist");
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    prisma.userRole.createMany({
      data: uniqueRoleIds.map((roleId) => ({
        userId,
        roleId,
      })),
    }),
  ]);

  logger.info(
    { userId, count: uniqueRoleIds.length },
    "Roles assigned to user",
  );

  return getUserById(userId);
};
