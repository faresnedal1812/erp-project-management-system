import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── Shared select shape ───────────────────────────────────────

const EMPLOYEE_SELECT = {
  id: true,
  employeeNumber: true,
  position: true,
  hireDate: true,
  endDate: true,
  employmentStatus: true,
  salary: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
      code: true,
      branchId: true,
      branch: { select: { companyId: true } },
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────

const findEmployeeOrFail = async (employeeId, companyId) => {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: EMPLOYEE_SELECT,
  });

  if (!employee) throw ApiError.notFound("Employee not found");
  if (employee.department.branch.companyId !== companyId) {
    throw ApiError.forbidden("Employee belongs to a different company");
  }
  return employee;
};

// ── Employee CRUD ─────────────────────────────────────────────

/**
 * Returns all employees in a specific department.
 */
export const getEmployeesByDepartment = async (
  departmentId,
  includeInactive = false,
  companyId,
) => {
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, branch: { select: { companyId: true } } },
  });
  if (!dept) throw ApiError.notFound("Department not found");
  if (dept.branch.companyId !== companyId) {
    throw ApiError.forbidden("Department belongs to a different company");
  }

  return prisma.employee.findMany({
    where: {
      departmentId,
      ...(includeInactive ? {} : { employmentStatus: { not: "TERMINATED" } }),
    },
    select: EMPLOYEE_SELECT,
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
  });
};

/**
 * Returns a single employee by ID.
 */
export const getEmployeeById = async (id, companyId) => {
  return findEmployeeOrFail(id, companyId);
};

/**
 * Returns the employee profile linked to a specific user.
 */
export const getEmployeeByUserId = async (userId, companyId) => {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: EMPLOYEE_SELECT,
  });
  if (!employee)
    throw ApiError.notFound("Employee profile not found for this user");
  if (employee.department.branch.companyId !== companyId) {
    throw ApiError.forbidden("Employee belongs to a different company");
  }
  return employee;
};

/**
 * Creates an employee profile for an existing user.
 *
 * WHY ONE EMPLOYEE PROFILE PER USER:
 * The userId field is @unique — a user can only hold one employee profile.
 * This keeps HR data clean; a user cannot exist as two different employees
 * simultaneously. Re-hiring should reactivate the existing record.
 */
export const createEmployee = async (data, companyId) => {
  // User must exist and be active
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true, isActive: true, isVerified: true },
  });
  if (!user) throw ApiError.notFound("User not found");
  if (!user.isActive) {
    throw ApiError.badRequest(
      "Cannot create an employee profile for an inactive user",
    );
  }
  if (!user.isVerified) {
    throw ApiError.badRequest(
      "User must verify their email before being enrolled as an employee",
    );
  }

  // Verify user is a member of the active company
  const companyMembership = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId: data.userId, companyId } },
  });
  if (!companyMembership) {
    throw ApiError.forbidden("User is not a member of the active company");
  }

  // Prevent duplicate employee profile
  const existing = await prisma.employee.findUnique({
    where: { userId: data.userId },
    select: { id: true },
  });
  if (existing) {
    throw ApiError.conflict("This user already has an employee profile");
  }

  // Department must exist, be active, and belong to the active company
  const dept = await prisma.department.findUnique({
    where: { id: data.departmentId },
    select: {
      id: true,
      isActive: true,
      branch: { select: { companyId: true } },
    },
  });
  if (!dept) throw ApiError.notFound("Department not found");
  if (!dept.isActive) {
    throw ApiError.badRequest(
      "Cannot assign employee to an inactive department",
    );
  }
  if (dept.branch.companyId !== companyId) {
    throw ApiError.forbidden("Department belongs to a different company");
  }

  // Employee number must be globally unique
  const duplicateNumber = await prisma.employee.findUnique({
    where: { employeeNumber: data.employeeNumber },
    select: { id: true },
  });
  if (duplicateNumber) {
    throw ApiError.conflict(
      `Employee number "${data.employeeNumber}" is already in use`,
    );
  }

  const employee = await prisma.employee.create({
    data: {
      userId: data.userId,
      departmentId: data.departmentId,
      employeeNumber: data.employeeNumber,
      position: data.position,
      hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
      salary: data.salary ?? null,
      bio: data.bio ?? null,
    },
    select: EMPLOYEE_SELECT,
  });

  logger.info(
    { employeeId: employee.id, userId: data.userId },
    "Employee profile created",
  );
  return employee;
};

/**
 * Updates an employee profile.
 * Only HR-specific fields are updatable; userId cannot change.
 */
export const updateEmployee = async (id, data, companyId) => {
  const employee = await findEmployeeOrFail(id, companyId);

  // Lifecycle guards
  if (employee.employmentStatus === "TERMINATED") {
    if (data.employmentStatus && data.employmentStatus !== "TERMINATED") {
      throw ApiError.badRequest(
        "Cannot change the status of a terminated employee.",
      );
    }
    if (data.endDate !== undefined) {
      throw ApiError.badRequest(
        "Cannot modify or clear the end date of an already terminated employee.",
      );
    }
  } else if (data.employmentStatus === "TERMINATED" && !data.endDate) {
    throw ApiError.badRequest(
      "An end date is required when setting employment status to TERMINATED via update.",
    );
  }

  // Validate new department if provided
  if (data.departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: data.departmentId },
      select: {
        id: true,
        isActive: true,
        branch: { select: { companyId: true } },
      },
    });
    if (!dept) throw ApiError.notFound("Department not found");
    if (!dept.isActive) {
      throw ApiError.badRequest(
        "Cannot transfer employee to an inactive department",
      );
    }
    if (dept.branch.companyId !== companyId) {
      throw ApiError.forbidden("Department belongs to a different company");
    }
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      ...(data.departmentId !== undefined && {
        departmentId: data.departmentId,
      }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.hireDate !== undefined && { hireDate: new Date(data.hireDate) }),
      ...(data.endDate !== undefined && {
        endDate: data.endDate ? new Date(data.endDate) : null,
      }),
      ...(data.employmentStatus !== undefined && {
        employmentStatus: data.employmentStatus,
      }),
      ...(data.salary !== undefined && { salary: data.salary }),
      ...(data.bio !== undefined && { bio: data.bio }),
    },
    select: EMPLOYEE_SELECT,
  });

  logger.info({ employeeId: id }, "Employee profile updated");
  return updated;
};

/**
 * Terminates an employee by setting employmentStatus = TERMINATED and recording endDate.
 *
 * WHY TERMINATE INSTEAD OF DELETE:
 * Employment history is legally and operationally important. Hard-deleting
 * an employee record would erase payroll, audit, and team history.
 * Termination preserves the record while marking it as inactive.
 */
export const terminateEmployee = async (id, companyId) => {
  const employee = await findEmployeeOrFail(id, companyId);

  if (employee.employmentStatus === "TERMINATED") {
    throw ApiError.badRequest("Employee is already terminated.");
  }

  await prisma.employee.update({
    where: { id },
    data: {
      employmentStatus: "TERMINATED",
      endDate: new Date(),
    },
  });

  logger.info({ employeeId: id }, "Employee terminated");
};
