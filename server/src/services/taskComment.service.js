import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── Shared helpers ───────────────────────────────────────────────

/**
 * Resolves the employee record for the current user.
 * Requires ACTIVE employment status.
 */
const getActiveEmployeeId = async (userId) => {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true, employmentStatus: true },
  });
  if (!employee)
    throw ApiError.forbidden("Only employees can manage task comments");
  if (employee.employmentStatus !== "ACTIVE") {
    throw ApiError.forbidden("Your employment status is inactive");
  }
  return employee.id;
};

/**
 * Resolves a task, validates company scope, enforces PRIVATE visibility,
 * and returns { task, membership } where membership may be null.
 */
const resolveTask = async (taskId, companyId, employeeId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          members: { select: { employeeId: true, role: true } },
        },
      },
    },
  });

  if (!task) throw ApiError.notFound("Task not found");
  if (task.project.companyId !== companyId) {
    throw ApiError.forbidden("Access denied.");
  }

  const membership = task.project.members.find(
    (m) => m.employeeId === employeeId,
  );

  if (task.project.visibility === "PRIVATE" && !membership) {
    throw ApiError.forbidden("You do not have access to this private project.");
  }

  return { task, membership };
};

/**
 * Verifies the requester is an active project member (any role).
 * Required to read and create comments.
 */
const verifyMemberAccess = async (taskId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);
  const { task, membership } = await resolveTask(taskId, companyId, employeeId);

  if (!membership) {
    throw ApiError.forbidden(
      "You must be a project member to interact with task comments.",
    );
  }

  return { employeeId, task, membership };
};

// ── GET ─────────────────────────────────────────────────────────

export const getTaskComments = async (taskId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);
  await resolveTask(taskId, companyId, employeeId); // visibility check (PUBLIC OK)

  return prisma.taskComment.findMany({
    where: { taskId },
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
};

// ── CREATE ───────────────────────────────────────────────────────

export const createComment = async (taskId, data, companyId, userId) => {
  const { employeeId } = await verifyMemberAccess(taskId, companyId, userId);

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      employeeId,
      content: data.content,
    },
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  logger.info({ commentId: comment.id, taskId, employeeId }, "Comment created");
  return comment;
};

// ── UPDATE ───────────────────────────────────────────────────────

export const updateComment = async (
  taskId,
  commentId,
  data,
  companyId,
  userId,
) => {
  const { employeeId } = await verifyMemberAccess(taskId, companyId, userId);

  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId },
  });

  if (!comment || comment.taskId !== taskId) {
    throw ApiError.notFound("Comment not found");
  }

  // Only the author can edit their own comment
  if (comment.employeeId !== employeeId) {
    throw ApiError.forbidden("You can only edit your own comments.");
  }

  const updated = await prisma.taskComment.update({
    where: { id: commentId },
    data: { content: data.content },
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  logger.info({ commentId, taskId }, "Comment updated");
  return updated;
};

// ── DELETE ───────────────────────────────────────────────────────

export const deleteComment = async (taskId, commentId, companyId, userId) => {
  const { employeeId, membership } = await verifyMemberAccess(
    taskId,
    companyId,
    userId,
  );

  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId },
  });

  if (!comment || comment.taskId !== taskId) {
    throw ApiError.notFound("Comment not found");
  }

  const isAuthor = comment.employeeId === employeeId;
  const isManager = membership.role === "MANAGER";

  // Only the author OR a MANAGER can delete a comment
  if (!isAuthor && !isManager) {
    throw ApiError.forbidden(
      "You can only delete your own comments. Project MANAGERs can delete any comment.",
    );
  }

  await prisma.taskComment.delete({ where: { id: commentId } });
  logger.info({ commentId, taskId, deletedBy: employeeId }, "Comment deleted");
};
