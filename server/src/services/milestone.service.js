import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── Shared helpers ───────────────────────────────────────────────

const getActiveEmployeeId = async (userId) => {
  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (!employee)
    throw ApiError.forbidden("Only employees can access milestones");
  if (employee.employmentStatus !== "ACTIVE") {
    throw ApiError.forbidden("Your employment status is inactive");
  }
  return employee.id;
};

/**
 * Validates that the project exists and belongs to the active company.
 * Also enforces PRIVATE visibility — non-members cannot access the project.
 * Returns { project, isMember }.
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
 * Verifies the requester is a project MANAGER.
 * Only managers may create / update / delete milestones.
 */
const verifyManagerAccess = async (projectId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);
  const { membership } = await validateProjectAccess(
    projectId,
    companyId,
    employeeId,
  );

  if (!membership || membership.role !== "MANAGER") {
    throw ApiError.forbidden(
      "Only project MANAGERs can create, update, or delete milestones.",
    );
  }

  return employeeId;
};

// ── GET ─────────────────────────────────────────────────────────

export const getMilestones = async (projectId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);
  await validateProjectAccess(projectId, companyId, employeeId);

  return prisma.milestone.findMany({
    where: { projectId },
    include: {
      _count: { select: { tasks: true } },
    },
    orderBy: [
      { isCompleted: "asc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  });
};

// ── MUTATIONS ───────────────────────────────────────────────────

export const createMilestone = async (projectId, data, companyId, userId) => {
  await verifyManagerAccess(projectId, companyId, userId);

  // Name must be unique within the project
  const existing = await prisma.milestone.findUnique({
    where: { projectId_name: { projectId, name: data.name } },
  });
  if (existing) {
    throw ApiError.conflict(
      "A milestone with this name already exists in the project.",
    );
  }

  const milestone = await prisma.milestone.create({
    data: {
      projectId,
      name: data.name,
      description: data.description,
      dueDate: data.dueDate,
    },
  });

  logger.info({ milestoneId: milestone.id, projectId }, "Milestone created");
  return milestone;
};

export const updateMilestone = async (
  projectId,
  milestoneId,
  data,
  companyId,
  userId,
) => {
  await verifyManagerAccess(projectId, companyId, userId);

  const existing = await prisma.milestone.findUnique({
    where: { id: milestoneId },
  });

  if (!existing || existing.projectId !== projectId) {
    throw ApiError.notFound("Milestone not found");
  }

  // Name uniqueness guard (only when name is being changed)
  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.milestone.findUnique({
      where: { projectId_name: { projectId, name: data.name } },
    });
    if (duplicate) {
      throw ApiError.conflict(
        "A milestone with this name already exists in the project.",
      );
    }
  }

  // Automatically set / clear completedAt based on isCompleted flag
  let completedAt = undefined;
  if (data.isCompleted === true && !existing.isCompleted) {
    completedAt = new Date(); // being marked complete for the first time
  } else if (data.isCompleted === false && existing.isCompleted) {
    completedAt = null; // being re-opened
  }

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.isCompleted !== undefined && { isCompleted: data.isCompleted }),
      ...(completedAt !== undefined && { completedAt }),
    },
  });

  logger.info({ milestoneId }, "Milestone updated");
  return updated;
};

export const deleteMilestone = async (
  projectId,
  milestoneId,
  companyId,
  userId,
) => {
  await verifyManagerAccess(projectId, companyId, userId);

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { _count: { select: { tasks: true } } },
  });

  if (!milestone || milestone.projectId !== projectId) {
    throw ApiError.notFound("Milestone not found");
  }

  if (milestone._count.tasks > 0) {
    throw ApiError.badRequest(
      `Cannot delete a milestone that has ${milestone._count.tasks} task(s) linked to it. Unlink or delete the tasks first.`,
    );
  }

  await prisma.milestone.delete({ where: { id: milestoneId } });
  logger.info({ milestoneId }, "Milestone deleted");
};
