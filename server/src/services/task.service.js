import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── Shared helpers ───────────────────────────────────────────────

/**
 * Ensures the requester is an active employee and returns their employeeId.
 */
const getActiveEmployeeId = async (userId) => {
  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (!employee) throw ApiError.forbidden("Only employees can manage tasks");
  if (employee.employmentStatus !== "ACTIVE") {
    throw ApiError.forbidden("Your employment status is inactive");
  }
  return employee.id;
};

/**
 * Validates project exists under the company, enforces PRIVATE visibility,
 * and returns the project with its members list.
 */
const validateProjectAccess = async (projectId, companyId, employeeId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { select: { employeeId: true, role: true } } },
  });

  if (!project) throw ApiError.notFound("Project not found");
  if (project.companyId !== companyId) {
    throw ApiError.forbidden(
      "Access denied. Project belongs to another company.",
    );
  }

  const membership = project.members.find((m) => m.employeeId === employeeId);
  if (project.visibility === "PRIVATE" && !membership) {
    throw ApiError.forbidden("You do not have access to this private project.");
  }

  return { project, membership };
};

/**
 * Ensures the requester is a project member (any role).
 * Required to create / update tasks.
 */
const verifyMemberAccess = async (projectId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);
  const { membership } = await validateProjectAccess(
    projectId,
    companyId,
    employeeId,
  );

  if (!membership) {
    throw ApiError.forbidden(
      "You must be a project member to create or update tasks.",
    );
  }

  return employeeId;
};

/**
 * Ensures the requester is a project MANAGER.
 * Required to delete tasks.
 */
const verifyManagerAccess = async (projectId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);
  const { membership } = await validateProjectAccess(
    projectId,
    companyId,
    employeeId,
  );

  if (!membership || membership.role !== "MANAGER") {
    throw ApiError.forbidden("Only project MANAGERs can delete tasks.");
  }

  return employeeId;
};

// ── GET ─────────────────────────────────────────────────────────

export const getProjectTasks = async (projectId, query, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);
  await validateProjectAccess(projectId, companyId, employeeId);

  const { status, priority, milestoneId, assignedToMe } = query;

  const where = {
    projectId,
    parentId: null, // top-level tasks only (subtasks handled in Section 5)
    ...(status && { status }),
    ...(priority && { priority }),
    ...(milestoneId && { milestoneId }),
    ...(assignedToMe === "true" && {
      assignments: { some: { employeeId } },
    }),
  };

  return prisma.task.findMany({
    where,
    include: {
      milestone: { select: { id: true, name: true } },
      assignments: {
        include: {
          employee: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
      _count: { select: { subtasks: true, comments: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
};

export const getTaskById = async (taskId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          members: { select: { employeeId: true, role: true } },
        },
      },
      milestone: { select: { id: true, name: true } },
      assignments: {
        include: {
          employee: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
      subtasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
        },
      },
      _count: { select: { comments: true, attachments: true } },
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

  return task;
};

// ── MUTATIONS ───────────────────────────────────────────────────

export const createTask = async (projectId, data, companyId, userId) => {
  const employeeId = await verifyMemberAccess(projectId, companyId, userId);

  // Validate milestone belongs to the same project if provided
  if (data.milestoneId) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: data.milestoneId },
    });
    if (!milestone || milestone.projectId !== projectId) {
      throw ApiError.badRequest("Milestone does not belong to this project.");
    }
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      title: data.title,
      description: data.description,
      milestoneId: data.milestoneId,
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
    },
    include: {
      milestone: { select: { id: true, name: true } },
    },
  });

  logger.info(
    { taskId: task.id, projectId, createdBy: employeeId },
    "Task created",
  );
  return task;
};

export const updateTask = async (taskId, data, companyId, userId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: { members: { select: { employeeId: true, role: true } } },
      },
      subtasks: { select: { status: true } },
    },
  });

  if (!task) throw ApiError.notFound("Task not found");
  if (task.project.companyId !== companyId) {
    throw ApiError.forbidden("Access denied.");
  }

  // Verify the requester is an active member of the project
  await verifyMemberAccess(task.projectId, companyId, userId);

  // Business rule: Cannot mark DONE if there are open subtasks
  if (data.status === "DONE" || data.status === "CANCELLED") {
    const openSubtasks = task.subtasks.filter(
      (s) => s.status !== "DONE" && s.status !== "CANCELLED",
    );
    if (openSubtasks.length > 0) {
      throw ApiError.badRequest(
        `Cannot close this task — it has ${openSubtasks.length} open subtask(s).`,
      );
    }
  }

  // Validate milestone still belongs to the same project
  if (data.milestoneId !== undefined && data.milestoneId !== null) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: data.milestoneId },
    });
    if (!milestone || milestone.projectId !== task.projectId) {
      throw ApiError.badRequest("Milestone does not belong to this project.");
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.milestoneId !== undefined && { milestoneId: data.milestoneId }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.estimatedHours !== undefined && {
        estimatedHours: data.estimatedHours,
      }),
    },
    include: {
      milestone: { select: { id: true, name: true } },
      assignments: {
        include: {
          employee: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  logger.info({ taskId }, "Task updated");
  return updated;
};

export const deleteTask = async (taskId, companyId, userId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true, project: { select: { companyId: true } } },
  });

  if (!task) throw ApiError.notFound("Task not found");
  if (task.project.companyId !== companyId) {
    throw ApiError.forbidden("Access denied.");
  }

  // Only MANAGERs can delete tasks
  await verifyManagerAccess(task.projectId, companyId, userId);

  await prisma.task.delete({ where: { id: taskId } });
  logger.info({ taskId }, "Task deleted");
};

// ── SUBTASKS ─────────────────────────────────────────────────────

export const getSubtasks = async (parentTaskId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);

  // Fetch the parent task to validate project access
  const parent = await prisma.task.findUnique({
    where: { id: parentTaskId },
    include: {
      project: {
        include: { members: { select: { employeeId: true, role: true } } },
      },
    },
  });

  if (!parent) throw ApiError.notFound("Task not found");
  if (parent.project.companyId !== companyId) {
    throw ApiError.forbidden("Access denied.");
  }

  const membership = parent.project.members.find(
    (m) => m.employeeId === employeeId,
  );
  if (parent.project.visibility === "PRIVATE" && !membership) {
    throw ApiError.forbidden("You do not have access to this private project.");
  }

  return prisma.task.findMany({
    where: { parentId: parentTaskId },
    include: {
      assignments: {
        include: {
          employee: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
};

export const createSubtask = async (parentTaskId, data, companyId, userId) => {
  // Fetch parent task with project membership info
  const parent = await prisma.task.findUnique({
    where: { id: parentTaskId },
    select: {
      id: true,
      projectId: true,
      milestoneId: true,
      parentId: true, // depth check
      project: { select: { companyId: true } },
    },
  });

  if (!parent) throw ApiError.notFound("Parent task not found");
  if (parent.project.companyId !== companyId) {
    throw ApiError.forbidden("Access denied.");
  }

  // Depth guard: subtasks cannot have their own subtasks (max 1 level)
  if (parent.parentId !== null) {
    throw ApiError.badRequest(
      "Cannot create a subtask of a subtask. Maximum nesting depth is 1.",
    );
  }

  // Requester must be an active project member
  await verifyMemberAccess(parent.projectId, companyId, userId);

  const subtask = await prisma.task.create({
    data: {
      projectId: parent.projectId,
      milestoneId: parent.milestoneId, // inherits parent milestone
      parentId: parentTaskId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
    },
    include: {
      milestone: { select: { id: true, name: true } },
    },
  });

  logger.info(
    { subtaskId: subtask.id, parentTaskId, projectId: parent.projectId },
    "Subtask created",
  );
  return subtask;
};
