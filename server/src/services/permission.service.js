import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

/**
 * Permission Service — all business logic for Permission management.
 *
 * Permissions follow the ACTION:RESOURCE naming convention.
 * Examples: CREATE:USERS, READ:PROJECTS, DELETE:INVOICES
 *
 * This convention is enforced by the validator (.toUpperCase())
 * and ensures the requirePermission middleware checks are consistent.
 */

export const getAllPermissions = async () => {
  return prisma.permission.findMany({
    select: {
      id: true,
      action: true,
      resource: true,
      description: true,
      createdAt: true,
    },
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });
};

export const getPermissionById = async (id) => {
  const permission = await prisma.permission.findUnique({
    where: { id },
    select: {
      id: true,
      action: true,
      resource: true,
      description: true,
      createdAt: true,
    },
  });

  if (!permission) throw ApiError.notFound("Permission not found");
  return permission;
};

export const createPermission = async (data) => {
  const permission = await prisma.permission.create({
    data: {
      action: data.action,
      resource: data.resource,
      description: data.description,
    },
    select: {
      id: true,
      action: true,
      resource: true,
      description: true,
      createdAt: true,
    },
  });

  logger.info(
    {
      permissionId: permission.id,
      action: permission.action,
      resource: permission.resource,
    },
    "Permission created",
  );
  return permission;
};

export const deletePermission = async (id) => {
  await getPermissionById(id); // Throws 404 if not found.

  await prisma.permission.delete({ where: { id } });
  logger.info({ permissionId: id }, "Permission deleted");
};
