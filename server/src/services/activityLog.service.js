import prisma from "../config/database.js";
import logger from "../config/logger.js";
import ApiError from "../utils/ApiError.js";

// ── Activity Action Constants ────────────────────────────────────

export const ActivityAction = Object.freeze({
  // Project actions ---
  PROJECT_CREATED: "PROJECT_CREATED",
  PROJECT_UPDATED: "PROJECT_UPDATED",
  PROJECT_CANCELLED: "PROJECT_CANCELLED",
  PROJECT_STATUS_CHANGED: "PROJECT_STATUS_CHANGED",

  // Member actions ---
  MEMBER_ADDED: "MEMBER_ADDED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
  MEMBER_ROLE_CHANGED: "MEMBER_ROLE_CHANGED",

  // Milestone actions ---
  MILESTONE_CREATED: "MILESTONE_CREATED",
  MILESTONE_UPDATED: "MILESTONE_UPDATED",
  MILESTONE_COMPLETED: "MILESTONE_COMPLETED",
  MILESTONE_DELETED: "MILESTONE_DELETED",

  // Task actions ---
  TASK_CREATED: "TASK_CREATED",
  TASK_UPDATED: "TASK_UPDATED",
  TASK_DELETED: "TASK_DELETED",
  TASK_STATUS_CHANGED: "TASK_STATUS_CHANGED",

  // Subtask actions ---
  SUBTASK_CREATED: "SUBTASK_CREATED",

  // Assignment actions
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_UNASSIGNED: "TASK_UNASSIGNED",

  // Comment actions
  COMMENT_CREATED: "COMMENT_CREATED",
  COMMENT_UPDATED: "COMMENT_UPDATED",
  COMMENT_DELETED: "COMMENT_DELETED",

  // Attachment actions
  ATTACHMENT_UPLOADED: "ATTACHMENT_UPLOADED",
  ATTACHMENT_DELETED: "ATTACHMENT_DELETED",

  // Time entry actions
  TIMER_STARTED: "TIMER_STARTED",
  TIMER_STOPPED: "TIMER_STOPPED",
  TIME_ENTRY_UPDATED: "TIME_ENTRY_UPDATED",
  TIME_ENTRY_DELETED: "TIME_ENTRY_DELETED",
});

// ── Core logging function ────────────────────────────────────────

/**
 * Append an activity log entry.
 *
 * This is a fire-and-forget helper: if logging fails it warns
 * but does NOT throw, so the calling service's main operation
 * is never blocked by a logging failure.
 *
 * @param {Object}  params
 * @param {string}  params.companyId   — tenant scope (required)
 * @param {string}  params.employeeId  — actor (required)
 * @param {string}  params.action      — one of ActivityAction values (required)
 * @param {string}  [params.projectId] — related project
 * @param {string}  [params.taskId]    — related task
 * @param {Object}  [params.meta]      — arbitrary JSON (before/after snapshot, IDs, etc.)
 */
export const logActivity = ({
  companyId,
  employeeId,
  action,
  projectId = null,
  taskId = null,
  meta = null,
}) => {
  prisma.activityLog
    .create({
      data: {
        companyId,
        employeeId,
        action,
        projectId,
        taskId,
        meta,
      },
    })
    .catch((err) => {
      logger.warn(
        { err, action, companyId, projectId, taskId },
        "Failed to write activity log — operation continued",
      );
    });
};

// ── Read queries ─────────────────────────────────────────────────

/**
 * Get activity logs for a project (with optional filters).
 */
export const getProjectActivity = async (
  projectId,
  companyId,
  userId,
  filters = {},
) => {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true, employmentStatus: true },
  });

  if (!employee) {
    throw ApiError.forbidden("Only employees can view activity logs");
  }

  if (employee.employmentStatus !== "ACTIVE") {
    throw ApiError.forbidden("Your employment status is inactive");
  }

  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: { select: { employeeId: true } },
    },
  });

  if (!project) {
    throw ApiError.notFound("Project not found");
  }

  if (project.companyId !== companyId) {
    throw ApiError.forbidden("Access denied.");
  }

  const isMember = project.members.some((m) => m.employeeId === employee.id);

  if (!isMember) throw ApiError.forbidden("You are not member of this project");

  // Build filter conditions
  const where = { projectId, companyId };

  if (filters.action) where.action = filters.action;
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.taskId) where.taskId = filters.taskId;

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(filters.from);
    if (filters.to) where.createdAt.lte = new Date(filters.to);
  }

  const limit = filters.limit ? parseInt(filters.limit, 10) : 20;
  const cursor = filters.cursor;

  const logs = await prisma.activityLog.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  const nextCursor = logs.length === limit ? logs[logs.length - 1].id : null;

  return {
    logs,
    nextCursor,
  };
};

/**
 * Get activity logs for a specific task (with optional filters).
 */
export const getTaskActivity = async (
  taskId,
  companyId,
  userId,
  filters = {},
) => {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true, employmentStatus: true },
  });

  if (!employee) {
    throw ApiError.forbidden("Only employees can view activity logs");
  }

  if (employee.employmentStatus !== "ACTIVE") {
    throw ApiError.forbidden("Your employment status is inactive");
  }

  // Verify task access
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          members: { select: { employeeId: true } },
        },
      },
    },
  });

  if (!task) {
    throw ApiError.notFound("Task not found");
  }

  if (task.project.companyId !== companyId) {
    throw ApiError.forbidden("Access denied.");
  }

  const isMember = task.project.members.some(
    (m) => m.employeeId === employee.id,
  );

  if (!isMember) throw ApiError.forbidden("You are not member of this project");

  // Build filter conditions
  const where = { taskId, companyId };

  if (filters.action) where.action = filters.action;
  if (filters.employeeId) where.employeeId = filters.employeeId;

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(filters.from);
    if (filters.to) where.createdAt.lte = new Date(filters.to);
  }

  const limit = filters.limit ? parseInt(filters.limit, 10) : 20;
  const cursor = filters.cursor;

  const logs = await prisma.activityLog.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  const nextCursor = logs.length === limit ? logs[logs.length - 1].id : null;

  return {
    logs,
    nextCursor,
  };
};
