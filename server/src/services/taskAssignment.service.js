import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── Shared helpers ───────────────────────────────────────────────

const getActiveEmployeeId = async (userId) => {
  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (!employee)
    throw ApiError.forbidden("Only employees can manage task assignments");
  if (employee.employmentStatus !== "ACTIVE") {
    throw ApiError.forbidden("Your employment status is inactive");
  }
  return employee.id;
};

/**
 * Resolves a task by id, verifies company scope, and returns the task + project
 * with the members list.
 */
const resolveTask = async (taskId, companyId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          members: {
            select: { employeeId: true, role: true },
          },
        },
      },
    },
  });

  if (!task) throw ApiError.notFound("Task not found");
  if (task.project.companyId !== companyId) {
    throw ApiError.forbidden("Access denied.");
  }

  return task;
};

/**
 * Verifies the requester is an active project MANAGER.
 * Only managers may assign / unassign employees.
 */
const verifyManagerAccess = async (taskId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);
  const task = await resolveTask(taskId, companyId);

  const membership = task.project.members.find(
    (m) => m.employeeId === employeeId,
  );
  if (!membership || membership.role !== "MANAGER") {
    throw ApiError.forbidden(
      "Only project MANAGERs can assign or unassign employees.",
    );
  }

  return { task, employeeId };
};

// ── MUTATIONS ───────────────────────────────────────────────────

export const assignEmployee = async (taskId, employeeId, companyId, userId) => {
  const { task } = await verifyManagerAccess(taskId, companyId, userId);

  // Target employee must be an active project member
  const membership = task.project.members.find(
    (m) => m.employeeId === employeeId,
  );
  if (!membership) {
    throw ApiError.badRequest(
      "The employee is not a member of this project. Add them to the project first.",
    );
  }

  // Verify the target employee is still active
  const targetEmployee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { employmentStatus: true },
  });
  if (!targetEmployee) throw ApiError.notFound("Employee not found");
  if (targetEmployee.employmentStatus !== "ACTIVE") {
    throw ApiError.badRequest(
      "Cannot assign an inactive (terminated) employee to a task.",
    );
  }

  // Check for duplicate assignment
  const existing = await prisma.taskAssignment.findUnique({
    where: { taskId_employeeId: { taskId, employeeId } },
  });
  if (existing) {
    throw ApiError.conflict("This employee is already assigned to the task.");
  }

  const assignment = await prisma.taskAssignment.create({
    data: { taskId, employeeId },
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  logger.info({ taskId, employeeId }, "Employee assigned to task");
  return assignment;
};

export const unassignEmployee = async (
  taskId,
  employeeId,
  companyId,
  userId,
) => {
  await verifyManagerAccess(taskId, companyId, userId);

  const assignment = await prisma.taskAssignment.findUnique({
    where: { taskId_employeeId: { taskId, employeeId } },
  });
  if (!assignment) {
    throw ApiError.notFound("Assignment not found");
  }

  await prisma.taskAssignment.delete({
    where: { taskId_employeeId: { taskId, employeeId } },
  });

  logger.info({ taskId, employeeId }, "Employee unassigned from task");
};
