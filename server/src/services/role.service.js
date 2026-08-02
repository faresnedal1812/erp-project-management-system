import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

/**
 * Role Service — all business logic for Role management.
 *
 * WHY ROLE NAMES ARE UPPERCASED:
 * Convention ensures consistency (e.g. "ADMIN" not "Admin" or "admin").
 * The validator enforces .toUpperCase() before data ever reaches here.
 */

export const getAllRoles = async () => {
  return prisma.role.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      permissions: {
        select: {
          permission: {
            select: { id: true, action: true, resource: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
};

export const getRoleById = async (id) => {
  const role = await prisma.role.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      permissions: {
        select: {
          permission: {
            select: { id: true, action: true, resource: true },
          },
        },
      },
    },
  });

  if (!role) throw ApiError.notFound("Role not found");
  return role;
};

export const createRole = async (data) => {
  const role = await prisma.role.create({
    data: {
      name: data.name,
      description: data.description,
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
    },
  });

  logger.info({ roleId: role.id, name: role.name }, "Role created");
  return role;
};

export const updateRole = async (id, data) => {
  const role = await getRoleById(id); // Ensures the role exists; throws 404 if not.

  if (data.name && data.name !== role.name) {
    const existingRole = await prisma.role.findUnique({
      where: { name: data.name },
    });
    if (existingRole) {
      throw ApiError.conflict("Role with this name already exists");
    }
  }

  const updated = await prisma.role.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
    },
  });

  logger.info({ roleId: id }, "Role updated");
  return updated;
};

export const deleteRole = async (id) => {
  await getRoleById(id); // Ensures the role exists; throws 404 if not.

  await prisma.role.delete({ where: { id } });
  logger.info({ roleId: id }, "Role deleted");
};

/**
 * Assigns a set of permissions to a role.
 *
 * WHY REPLACE STRATEGY (deleteMany + createMany):
 * This is an idempotent "sync" approach. Instead of figuring out which
 * permissions to add or remove, we clear the existing assignment and
 * re-create the desired set in a single transaction.
 * This avoids complex diffing logic and is much easier to reason about.
 */
export const assignPermissionsToRole = async (roleId, permissionIds) => {
  await getRoleById(roleId); // Throws 404 if role doesn't exist.

  const uniquePermissionIds = [...new Set(permissionIds)];

  // Verify all provided permission IDs actually exist in the DB.
  const permissions = await prisma.permission.findMany({
    where: { id: { in: uniquePermissionIds } },
    select: { id: true },
  });

  if (permissions.length !== uniquePermissionIds.length) {
    throw ApiError.badRequest(
      "One or more provided permission IDs do not exist",
    );
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: uniquePermissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
    }),
  ]);

  logger.info(
    { roleId, count: uniquePermissionIds.length },
    "Permissions assigned to role",
  );
  return getRoleById(roleId);
};
