import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

const getActiveEmployeeId = async (userId) => {
  const employee = await prisma.employee.findUnique({
    where: { userId },
  });
  if (!employee) throw ApiError.forbidden("Only employees can manage projects");
  if (employee.employmentStatus !== "ACTIVE") {
    throw ApiError.forbidden("Your employment status is inactive");
  }

  return employee.id;
};

// Helper to ensure project exists and belongs to the active company
const validateProjectAccess = async (projectId, companyId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) throw ApiError.notFound("Project not found");
  if (project.companyId !== companyId) {
    throw ApiError.forbidden(
      "Access denied. Project belongs to another company",
    );
  }

  return project;
};

// Helper to ensure the active user has MANAGER role in the project
const verifyManagerAccess = async (projectId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);
  await validateProjectAccess(projectId, companyId);

  const member = await prisma.projectMember.findUnique({
    where: { projectId_employeeId: { projectId, employeeId } },
  });

  if (!member || member.role !== "MANAGER") {
    throw ApiError.forbidden(
      "You must be a project MANAGER to manage project members",
    );
  }
};

// ── GET ─────────────────────────────────────────────────────────

export const getProjectMembers = async (projectId, companyId, userId) => {
  await getActiveEmployeeId(userId);
  await validateProjectAccess(projectId, companyId);

  return prisma.projectMember.findMany({
    where: { projectId },
    include: {
      employee: {
        select: {
          id: true,
          position: true,
          employmentStatus: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
};

// ── MUTATIONS ───────────────────────────────────────────────────

export const addProjectMember = async (projectId, data, companyId, userId) => {
  await verifyManagerAccess(projectId, companyId, userId);

  const employee = await prisma.employee.findUnique({
    where: { id: data.employeeId },
  });

  if (!employee) throw ApiError.notFound("Employee not found");
  if (employee.employmentStatus !== "ACTIVE") {
    throw ApiError.badRequest("Only active employees can be added to projects");
  }

  // Cross-tenant check for employee
  const empDepartment = await prisma.department.findUnique({
    where: { id: employee.departmentId },
    include: { branch: true },
  });
  if (empDepartment.branch.companyId !== companyId) {
    throw ApiError.forbidden("Employee belongs to another company");
  }

  const existingMember = await prisma.projectMember.findUnique({
    where: { projectId_employeeId: { projectId, employeeId: data.employeeId } },
  });

  if (existingMember) {
    throw ApiError.conflict("Employee is already a member of this project");
  }

  const newMember = await prisma.projectMember.create({
    data: {
      projectId,
      employeeId: data.employeeId,
      role: data.role || "CONTRIBUTOR",
    },
    include: {
      employee: {
        select: { user: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  logger.info(
    { projectId, employeeId: data.employeeId, role: data.role },
    "Project member added",
  );
  return newMember;
};

export const updateProjectMemberRole = async (
  projectId,
  employeeId,
  role,
  companyId,
  userId,
) => {
  await verifyManagerAccess(projectId, companyId, userId);

  const updatedMember = await prisma.$transaction(async (tx) => {
    const member = await tx.projectMember.findUnique({
      where: { projectId_employeeId: { projectId, employeeId } },
    });

    if (!member) throw ApiError.notFound("Project member not found");

    // Prevent removing the last manager if the project is active
    if (member.role === "MANAGER" && role !== "MANAGER") {
      // Lock the project row to prevent race conditions during concurrent role updates
      await tx.$executeRaw`SELECT 1 FROM projects WHERE id = ${projectId} FOR UPDATE`;

      const project = await tx.project.findUnique({
        where: { id: projectId },
      });

      if (project.status === "ACTIVE") {
        const managersCount = await tx.projectMember.count({
          where: { projectId, role: "MANAGER" },
        });

        if (managersCount <= 1) {
          throw ApiError.badRequest(
            "Cannot demote the last manager of an active project.",
          );
        }
      }
    }

    return tx.projectMember.update({
      where: { projectId_employeeId: { projectId, employeeId } },
      data: { role },
    });
  });

  logger.info({ projectId, employeeId, role }, "Project member role updated");
  return updatedMember;
};

export const removeProjectMember = async (
  projectId,
  employeeId,
  companyId,
  userId,
) => {
  await verifyManagerAccess(projectId, companyId, userId);

  await prisma.$transaction(async (tx) => {
    const member = await tx.projectMember.findUnique({
      where: { projectId_employeeId: { projectId, employeeId } },
    });

    if (!member) throw ApiError.notFound("Project member not found");

    // Prevent removing the last manager of an active project
    if (member.role === "MANAGER") {
      // Lock the project row to prevent race conditions during concurrent removals
      await tx.$executeRaw`SELECT 1 FROM projects WHERE id = ${projectId} FOR UPDATE`;

      const project = await tx.project.findUnique({
        where: { id: projectId },
      });

      if (project.status === "ACTIVE") {
        const managersCount = await tx.projectMember.count({
          where: { projectId, role: "MANAGER" },
        });

        if (managersCount <= 1) {
          throw ApiError.badRequest(
            "Cannot remove the last manager of an active project. Assign a new manager first.",
          );
        }
      }
    }

    await tx.projectMember.delete({
      where: { projectId_employeeId: { projectId, employeeId } },
    });
  });

  logger.info({ projectId, employeeId }, "Project member removed");
};
