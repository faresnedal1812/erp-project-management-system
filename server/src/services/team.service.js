import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── Shared select shapes ──────────────────────────────────────

const TEAM_SELECT = {
  id: true,
  companyId: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const MEMBER_SELECT = {
  role: true,
  createdAt: true,
  employee: {
    select: {
      id: true,
      employeeNumber: true,
      position: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────

const findTeamOrFail = async (teamId, companyId) => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { ...TEAM_SELECT, members: { select: MEMBER_SELECT } },
  });
  if (!team) throw ApiError.notFound("Team not found");
  if (team.companyId !== companyId) {
    throw ApiError.forbidden("Team belongs to a different company");
  }
  return team;
};

const findActiveEmployeeInCompany = async (employeeId, companyId) => {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      employmentStatus: true,
      department: { select: { branch: { select: { companyId: true } } } },
    },
  });
  if (!emp) throw ApiError.notFound("Employee not found");
  if (emp.department.branch.companyId !== companyId) {
    throw ApiError.forbidden("Employee belongs to a different company");
  }
  if (emp.employmentStatus === "TERMINATED") {
    throw ApiError.badRequest("Cannot add a terminated employee to a team");
  }
  return emp;
};

// ── Team CRUD ─────────────────────────────────────────────────

/**
 * Lists all active teams for a company.
 * Uses requireCompany middleware so companyId is always trusted.
 */
export const getTeams = async (companyId, includeInactive = false) => {
  return prisma.team.findMany({
    where: {
      companyId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    select: { ...TEAM_SELECT, members: { select: MEMBER_SELECT } },
    orderBy: { name: "asc" },
  });
};

/**
 * Returns a single team by ID.
 */
export const getTeamById = async (teamId, companyId) => {
  return findTeamOrFail(teamId, companyId);
};

/**
 * Creates a new team scoped to the active company.
 * Team names must be unique within a company.
 */
export const createTeam = async (data, companyId) => {
  const duplicate = await prisma.team.findUnique({
    where: { companyId_name: { companyId, name: data.name } },
  });
  if (duplicate) {
    throw ApiError.conflict(
      `A team named "${data.name}" already exists in this company`,
    );
  }

  const team = await prisma.team.create({
    data: {
      companyId,
      name: data.name,
      description: data.description ?? null,
    },
    select: { ...TEAM_SELECT, members: { select: MEMBER_SELECT } },
  });

  logger.info({ teamId: team.id, companyId }, "Team created");
  return team;
};

/**
 * Updates a team's name/description/isActive.
 * Enforces unique name within the company when renaming.
 */
export const updateTeam = async (teamId, data, companyId) => {
  const team = await findTeamOrFail(teamId, companyId);

  if (data.name && data.name !== team.name) {
    const duplicate = await prisma.team.findUnique({
      where: { companyId_name: { companyId, name: data.name } },
    });
    if (duplicate) {
      throw ApiError.conflict(
        `A team named "${data.name}" already exists in this company`,
      );
    }
  }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    select: { ...TEAM_SELECT, members: { select: MEMBER_SELECT } },
  });

  logger.info({ teamId }, "Team updated");
  return updated;
};

/**
 * Soft-deletes a team by setting isActive = false.
 * Team membership records are preserved for history.
 */
export const deleteTeam = async (teamId, companyId) => {
  await findTeamOrFail(teamId, companyId);

  await prisma.team.update({
    where: { id: teamId },
    data: { isActive: false },
  });

  logger.info({ teamId }, "Team deactivated (soft delete)");
};

// ── Team Member Management ────────────────────────────────────

/**
 * Adds an employee to a team.
 *
 * WHY EMPLOYEE NOT USER:
 * Team membership is an employment-level concept. An employee from the
 * correct company and active status is the right scope for team participation.
 */
export const addMember = async (
  teamId,
  employeeId,
  role = "MEMBER",
  companyId,
) => {
  await findTeamOrFail(teamId, companyId);
  await findActiveEmployeeInCompany(employeeId, companyId);

  const existing = await prisma.teamMember.findUnique({
    where: { teamId_employeeId: { teamId, employeeId } },
  });
  if (existing) {
    throw ApiError.conflict("Employee is already a member of this team");
  }

  const member = await prisma.teamMember.create({
    data: { teamId, employeeId, role },
    select: MEMBER_SELECT,
  });

  logger.info({ teamId, employeeId }, "Team member added");
  return member;
};

/**
 * Updates the role of a team member (LEAD ↔ MEMBER).
 */
export const updateMemberRole = async (teamId, employeeId, role, companyId) => {
  await findTeamOrFail(teamId, companyId);

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_employeeId: { teamId, employeeId } },
  });
  if (!membership) {
    throw ApiError.notFound("Employee is not a member of this team");
  }

  const updated = await prisma.teamMember.update({
    where: { teamId_employeeId: { teamId, employeeId } },
    data: { role },
    select: MEMBER_SELECT,
  });

  logger.info({ teamId, employeeId, role }, "Team member role updated");
  return updated;
};

/**
 * Removes an employee from a team (hard delete — membership itself has no history value).
 */
export const removeMember = async (teamId, employeeId, companyId) => {
  await findTeamOrFail(teamId, companyId);

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_employeeId: { teamId, employeeId } },
  });
  if (!membership) {
    throw ApiError.notFound("Employee is not a member of this team");
  }

  await prisma.teamMember.delete({
    where: { teamId_employeeId: { teamId, employeeId } },
  });

  logger.info({ teamId, employeeId }, "Team member removed");
};
