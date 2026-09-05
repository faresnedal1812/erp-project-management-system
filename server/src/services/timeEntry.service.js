import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── Shared helpers ───────────────────────────────────────────────

const getActiveEmployeeId = async (userId) => {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true, employmentStatus: true },
  });
  if (!employee)
    throw ApiError.forbidden("Only employees can manage time entries");
  if (employee.employmentStatus !== "ACTIVE") {
    throw ApiError.forbidden("Your employment status is inactive");
  }
  return employee.id;
};

/**
 * Resolves task, validates company scope and project visibility.
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
      assignments: { select: { employeeId: true } },
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
 * Ensures the requester is assigned to the task.
 * Only assigned employees can log time.
 */
const verifyAssignedAccess = async (taskId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);
  const { task, membership } = await resolveTask(taskId, companyId, employeeId);

  if (!membership) {
    throw ApiError.forbidden("You must be a project member.");
  }

  const isAssigned = task.assignments.some((a) => a.employeeId === employeeId);
  if (!isAssigned) {
    throw ApiError.forbidden(
      "Only employees assigned to this task can log time.",
    );
  }

  return { employeeId, task, membership };
};

/**
 * Computes duration in minutes from two Date objects.
 */
const computeDurationMin = (startedAt, endedAt) => {
  return Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
};

// ── GET ─────────────────────────────────────────────────────────

export const getTimeEntries = async (taskId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);
  const { membership } = await resolveTask(taskId, companyId, employeeId);

  if (!membership) throw ApiError.forbidden("You must be a project member.");

  return prisma.timeEntry.findMany({
    where: { taskId },
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });
};

// ── START TIMER ─────────────────────────────────────────────────

export const startTimer = async (taskId, data, companyId, userId) => {
  const { employeeId } = await verifyAssignedAccess(taskId, companyId, userId);

  // Check for an already-running timer for this employee on this task
  const activeTimer = await prisma.timeEntry.findFirst({
    where: {
      taskId,
      employeeId,
      endedAt: null,
    },
  });

  if (activeTimer) {
    throw ApiError.conflict(
      "You already have an active timer on this task. Stop it before starting a new one.",
    );
  }

  const entry = await prisma.timeEntry.create({
    data: {
      taskId,
      employeeId,
      description: data.description,
      startedAt: new Date(),
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

  logger.info({ entryId: entry.id, taskId, employeeId }, "Timer started");
  return entry;
};

// ── STOP TIMER ──────────────────────────────────────────────────

export const stopTimer = async (taskId, entryId, companyId, userId) => {
  const { employeeId } = await verifyAssignedAccess(taskId, companyId, userId);

  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry || entry.taskId !== taskId) {
    throw ApiError.notFound("Time entry not found");
  }

  // Only the owner can stop their timer
  if (entry.employeeId !== employeeId) {
    throw ApiError.forbidden("You can only stop your own timer.");
  }

  if (entry.endedAt !== null) {
    throw ApiError.badRequest("This timer has already been stopped.");
  }

  const endedAt = new Date();
  const durationMin = computeDurationMin(entry.startedAt, endedAt);

  const updated = await prisma.timeEntry.update({
    where: { id: entryId },
    data: { endedAt, durationMin },
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  logger.info({ entryId, taskId, durationMin }, "Timer stopped");
  return updated;
};

// ── UPDATE (manual edit) ────────────────────────────────────────

export const updateTimeEntry = async (
  taskId,
  entryId,
  data,
  companyId,
  userId,
) => {
  const { employeeId } = await getActiveEmployeeId(userId);
  const { membership } = await resolveTask(taskId, companyId, employeeId);

  if (!membership) throw ApiError.forbidden("Access denied!");

  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry || entry.taskId !== taskId) {
    throw ApiError.notFound("Time entry not found");
  }

  const isOwner = entry.employeeId === employeeId;
  const isManager = membership.role === "MANAGER";

  if (!isOwner && !isManager) {
    throw ApiError.forbidden(
      "You can only edit your own time entries. Project MANAGERs can edit any entry.",
    );
  }

  // Determine effective values after the update
  const effectiveStartedAt = data.startedAt ?? entry.startedAt;
  const effectiveEndedAt =
    data.endedAt !== undefined ? data.endedAt : entry.endedAt;

  // Validate endedAt > startedAt when both are present
  if (effectiveEndedAt !== null && effectiveEndedAt <= effectiveStartedAt) {
    throw ApiError.badRequest("End time must be after start time.");
  }

  // Recompute duration if endedAt is present
  const durationMin =
    effectiveEndedAt !== null
      ? computeDurationMin(effectiveStartedAt, effectiveEndedAt)
      : null;

  const updated = await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.startedAt !== undefined && { startedAt: data.startedAt }),
      ...(data.endedAt !== undefined && { endedAt: data.endedAt }),
      durationMin,
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

  logger.info({ entryId, taskId }, "Time entry updated");
  return updated;
};

// ── DELETE ───────────────────────────────────────────────────────

export const deleteTimeEntry = async (taskId, entryId, companyId, userId) => {
  const { employeeId } = await getActiveEmployeeId(userId);
  const { membership } = await resolveTask(taskId, companyId, employeeId);

  if (!membership) throw ApiError.forbidden("Access denied!");

  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry || entry.taskId !== taskId) {
    throw ApiError.notFound("Time entry not found");
  }

  const isOwner = entry.employeeId === employeeId;
  const isManager = membership.role === "MANAGER";

  if (!isOwner && !isManager) {
    throw ApiError.forbidden(
      "You can only delete your own time entries. Project MANAGERs can delete any entry.",
    );
  }

  await prisma.timeEntry.delete({ where: { id: entryId } });
  logger.info({ entryId, taskId, deletedBy: employeeId }, "Time entry deleted");
};

// ── PROJECT TIME REPORT ─────────────────────────────────────────

export const getProjectTimeReport = async (projectId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, companyId: true },
  });

  if (!project) throw ApiError.notFound("Project not found");
  if (project.companyId !== companyId) {
    throw ApiError.forbidden("Access denied.");
  }

  const membership = await prisma.projectMember.findFirst({
    where: { projectId, employeeId },
    select: { role: true },
  });

  if (!membership) {
    throw ApiError.forbidden("You must be a member of this project.");
  }

  // Aggregate time entries per employee across all project tasks
  const report = await prisma.timeEntry.groupBy({
    by: ["employeeId"],
    where: {
      task: { projectId },
      endedAt: { not: null },
    },
    _sum: { durationMin: true },
    _count: { id: true },
  });

  if (report.length === 0) return [];

  // Enrich with employee names
  const employeeIds = report.map((r) => r.employeeId);
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });

  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  return report.map((r) => ({
    employee: employeeMap.get(r.employeeId) || { id: r.employeeId },
    totalMinutes: r._sum.durationMin || 0,
    totalEntries: r._count.id,
  }));
};
