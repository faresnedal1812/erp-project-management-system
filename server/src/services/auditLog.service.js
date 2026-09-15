import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── Private Helpers ───────────────────────────────────────────────

const verifyOwnerOrManagerAccess = async (userId, companyId) => {
  const member = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId, companyId } },
    select: { role: true },
  });
  if (!member) throw ApiError.forbidden("You are not a member of this company");

  if (member.role !== "OWNER" && member.role !== "ADMIN") {
    throw ApiError.forbidden(
      "Only company Owners and Admins can access audit logs",
    );
  }
};

const ACTOR_INCLUDE = {
  actor: {
    select: {
      id: true,
      position: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  },
};

export const auditActions = {
  UPDATE_COMPANY: "UPDATE_COMPANY",
  MEMBER_ROLE_UPDATED: "MEMBER_ROLE_UPDATED",
  PROJECT_STATUS_CHANGE: "PROJECT_STATUS_CHANGE",
  COMPANY_MEMBER_ASSIGNED: "COMPANY_MEMBER_ASSIGNED",
  DEPARTMENT_UPDATE: "DEPARTMENT_UPDATE",
  DEPARTMENT_DEACTIVATE: "DEPARTMENT_DEACTIVATE",
  EMPLOYEE_UPDATE: "EMPLOYEE_UPDATE",
  EMPLOYEE_TERMINATE: "EMPLOYEE_TERMINATE",
  ROLE_DELETE: "ROLE_DELETE",
  UPDATE_ROLE_PERMISSIONS: "UPDATE_ROLE_PERMISSIONS",
};

// ── Write ─────────────────────────────────────────────────────────

/**
 * Fire-and-forget audit log writer.
 *
 * IMPORTANT: This intentionally never awaits and never throws.
 * Audit failures must NOT block the primary business operation.
 *
 * @param {Object} params
 * @param {string} params.companyId    - Tenant scope
 * @param {string} params.actorId      - employeeId of the actor
 * @param {string} params.entityType   - e.g. "Employee", "Role", "Department"
 * @param {string} params.entityId     - PK of the modified record
 * @param {string} params.action       - e.g. "UPDATE", "DELETE", "PERMISSION_CHANGE"
 * @param {Object} params.changes      - { field: { from, to } } or full snapshot
 */
export const logAudit = ({
  companyId,
  actorId,
  entityType,
  entityId,
  action,
  changes,
}) => {
  prisma.auditLog
    .create({
      data: { companyId, actorId, entityType, entityId, action, changes },
    })
    .catch((err) => {
      logger.warn(
        { err, entityType, entityId, actorId },
        "Failed to write audit log — operation continued",
      );
    });
};

// ── Read ──────────────────────────────────────────────────────────

/**
 * Returns paginated audit logs for the company.
 * Restricted to OWNER and ADMIN roles.
 */
export const getAuditLogs = async (companyId, userId, filters = {}) => {
  await verifyOwnerOrManagerAccess(userId, companyId);

  const {
    entityType,
    entityId,
    actorId,
    action,
    from,
    to,
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;

  const where = { companyId };
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (actorId) where.actorId = actorId;
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
      include: ACTOR_INCLUDE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Returns a single audit log entry by ID.
 * Restricted to OWNER and ADMIN roles.
 */
export const getAuditLogById = async (companyId, logId, userId) => {
  await verifyOwnerOrManagerAccess(userId, companyId);

  const log = await prisma.auditLog.findUnique({
    where: { id: logId },
    include: ACTOR_INCLUDE,
  });

  if (!log || log.companyId !== companyId)
    throw ApiError.notFound("Audit log not found");

  return log;
};
