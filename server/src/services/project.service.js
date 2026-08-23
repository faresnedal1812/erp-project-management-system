import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// // Helper to determine if an employee is authorized to view a project
// // Used mainly to enforce the PRIVATE project visibility guard.
const checkProjectVisibility = async (project, employeeId) => {
  if (project.visibility === "PRIVATE") {
    const isMember = project.members.some((m) => m.employeeId === employeeId);
    if (!isMember) {
      throw ApiError.forbidden(
        "You do not have access to this private project",
      );
    }
  }
};

// /**
//  * Ensures the requesting user (via their employee profile) is an active employee.
//  * Returns the employeeId to be used in visibility checks.
//  */
const getActiveEmployeeId = async (userId) => {
  const employee = await prisma.employee.findUnique({
    where: { userId },
  });
  if (!employee) throw ApiError.forbidden("Only employees can access projects");
  if (employee.employmentStatus !== "ACTIVE") {
    throw ApiError.forbidden("Your employment status is inactive");
  }
  return employee.id;
};

const checkProjectManagerPermission = async (project, employeeId) => {
  const member = project.members?.find(
    (member) => member.employeeId === employeeId,
  );
  if (!member || member.role !== "MANAGER")
    throw ApiError.forbidden(
      "Only the project MANAGER has permission to perform this action",
    );
};

// // ── GET ─────────────────────────────────────────────────────────

export const getAllProjects = async (
  companyId,
  userId,
  includeInactive = false,
) => {
  const employeeId = await getActiveEmployeeId(userId);

  return await prisma.project.findMany({
    where: {
      companyId,
      ...(includeInactive ? {} : { isActive: true }),
      OR: [{ visibility: "PUBLIC" }, { members: { some: { employeeId } } }],
    },
    include: {
      team: { select: { id: true, name: true } },
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getProjectById = async (id, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      team: { select: { id: true, name: true } },
      members: {
        include: {
          employee: {
            select: {
              id: true,
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      },
      _count: { select: { tasks: true, milestones: true } },
    },
  });

  if (!project) throw ApiError.notFound("Project not found");
  if (project.companyId !== companyId)
    throw ApiError.forbidden("Access denied");

  if (project.visibility === "PRIVATE") {
    await checkProjectVisibility(project, employeeId);
  }

  return project;
};

// // ── MUTATIONS ───────────────────────────────────────────────────

export const createProject = async (data, companyId, userId) => {
  // Ensure the project name is unique within the company
  const existing = await prisma.project.findUnique({
    where: { companyId_name: { companyId, name: data.name } },
  });
  if (existing) {
    if (!existing.isActive) {
      throw ApiError.conflict(
        "A deleted project with this name exists. Please choose another name or restore the existing one.",
      );
    }
    throw ApiError.conflict("A project in this company already has this name");
  }

  // Pre-fetch team members if team is provided
  let initialMembers = [];
  if (data.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: data.teamId },
      include: { members: true },
    });
    if (!team) throw ApiError.notFound("Team not found");
    if (team.companyId !== companyId)
      throw ApiError.forbidden("Team belongs to another company");
    initialMembers = team.members.map((m) => m.employeeId);
  }

  const creatorEmployeeId = await getActiveEmployeeId(userId);

  // Create project in a transaction so we can also insert the creator + team as members
  const project = await prisma.$transaction(async (tx) => {
    const newTarget = await tx.project.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        teamId: data.teamId,
        visibility: data.visibility || "PUBLIC",
        startDate: data.startDate,
        dueDate: data.dueDate,
      },
    });

    // Determine members to enroll. First we need the creator's employee ID

    // Ensure creator is always a MANAGER
    const membersToCreate = new Map();
    membersToCreate.set(creatorEmployeeId, "MANAGER");

    // Add all team members as CONTRIBUTOR (unless they are the creator)
    initialMembers.forEach((empId) => {
      if (!membersToCreate.has(empId)) {
        membersToCreate.set(empId, "CONTRIBUTOR");
      }
    });

    // Create the memberships bulk
    if (membersToCreate.size > 0) {
      const inserts = Array.from(membersToCreate.entries()).map(
        ([empId, role]) => ({
          projectId: newTarget.id,
          employeeId: empId,
          role: role,
        }),
      );

      await tx.projectMember.createMany({ data: inserts });
    }

    return tx.project.findUnique({
      where: { id: newTarget.id },
      include: { members: true },
    });
  });

  logger.info(
    { projectId: project.id, companyId },
    "Project created successfully",
  );
  return project;
};

export const updateProject = async (projectId, data, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw ApiError.notFound("Project not found");
  if (project.companyId !== companyId)
    throw ApiError.forbidden("Access denied");

  if (project.visibility === "PRIVATE") {
    await checkProjectVisibility(project, employeeId);
  }

  await checkProjectManagerPermission(project, employeeId);

  if (data.name && data.name !== project.name) {
    const duplicate = await prisma.project.findUnique({
      where: {
        companyId_name: { companyId, name: data.name },
      },
    });
    if (duplicate)
      throw ApiError.conflict(
        "A project in this company already has this name",
      );
  }

  const finalStartDate =
    data.startDate !== undefined ? data.startDate : project.startDate;
  const finalDueDate =
    data.dueDate !== undefined ? data.dueDate : project.dueDate;

  if (
    finalStartDate &&
    finalDueDate &&
    new Date(finalDueDate) <= new Date(finalStartDate)
  ) {
    throw ApiError.badRequest("Due date must be after start date");
  }

  if (data.teamId !== undefined && data.teamId !== null) {
    const team = await prisma.team.findFirst({
      where: { id: data.teamId, companyId },
      select: { id: true },
    });
    if (!team) throw ApiError.notFound("Team not found");
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data,
  });

  logger.info({ projectId }, "Project updated");
  return updated;
};

export const deleteProject = async (projectId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) throw ApiError.notFound("Project not found");
  if (project.companyId !== companyId)
    throw ApiError.forbidden("Access denied");

  if (project.visibility === "PRIVATE") {
    await checkProjectVisibility(project, employeeId);
  }

  await checkProjectManagerPermission(project, employeeId);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      isActive: false,
      status: "CANCELLED",
    },
  });

  logger.info(
    { projectId, deletedBy: employeeId },
    "Project deactivated (soft delete)",
  );
};
