import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── Shared select shape ───────────────────────────────────────

const DEPARTMENT_SELECT = {
  id: true,
  branchId: true,
  parentId: true,
  name: true,
  code: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

// ── Helpers ───────────────────────────────────────────────────

const findDepartmentOrFail = async (id) => {
  const dept = await prisma.department.findUnique({
    where: { id },
    select: DEPARTMENT_SELECT,
  });
  if (!dept) throw ApiError.notFound("Department not found");
  return dept;
};

const findActiveBranchOrFail = async (branchId) => {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, isActive: true },
  });
  if (!branch) throw ApiError.notFound("Branch not found");
  if (!branch.isActive) throw ApiError.badRequest("Branch is inactive");
};

// ── Department CRUD ───────────────────────────────────────────

/**
 * Returns all departments for a given branch.
 * Includes children (sub-departments) for each top-level department.
 */
export const getDepartmentsByBranch = async (
  branchId,
  includeInactive = false,
) => {
  await findActiveBranchOrFail(branchId);

  return prisma.department.findMany({
    where: {
      branchId,
      parentId: null, // top-level only; children are nested below
      ...(includeInactive ? {} : { isActive: true }),
    },
    select: {
      ...DEPARTMENT_SELECT,
      children: {
        where: includeInactive ? {} : { isActive: true },
        select: DEPARTMENT_SELECT,
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
};

/**
 * Returns a single department by ID, including its immediate children.
 */
export const getDepartmentById = async (id) => {
  const dept = await prisma.department.findUnique({
    where: { id },
    select: {
      ...DEPARTMENT_SELECT,
      children: {
        select: DEPARTMENT_SELECT,
        orderBy: { name: "asc" },
      },
    },
  });
  if (!dept) throw ApiError.notFound("Department not found");
  return dept;
};

/**
 * Creates a new department under a branch.
 *
 * WHY SELF-REFERENTIAL PARENT:
 * Organisations often need nested departments (e.g., Engineering → Frontend,
 * Engineering → Backend). The parentId FK on the same table enables unlimited
 * depth without adding extra tables. Depth is kept shallow by convention.
 */
export const createDepartment = async (data) => {
  await findActiveBranchOrFail(data.branchId);

  // Validate parent belongs to the same branch
  if (data.parentId) {
    const parent = await prisma.department.findUnique({
      where: { id: data.parentId },
      select: { branchId: true },
    });
    if (!parent) throw ApiError.notFound("Parent department not found");
    if (parent.branchId !== data.branchId) {
      throw ApiError.badRequest(
        "Parent department must belong to the same branch",
      );
    }
  }

  // Enforce unique code per branch
  if (data.code) {
    const duplicate = await prisma.department.findUnique({
      where: { branchId_code: { branchId: data.branchId, code: data.code } },
    });
    if (duplicate) {
      throw ApiError.conflict(
        `A department with code "${data.code}" already exists in this branch`,
      );
    }
  }

  const dept = await prisma.department.create({
    data: {
      branchId: data.branchId,
      parentId: data.parentId ?? null,
      name: data.name,
      code: data.code,
      description: data.description,
    },
    select: DEPARTMENT_SELECT,
  });

  logger.info(
    { departmentId: dept.id, branchId: data.branchId },
    "Department created",
  );
  return dept;
};

/**
 * Updates department details.
 *
 * WHY CIRCULAR PARENT GUARD:
 * Setting a department's parentId to itself or to one of its descendants
 * would create an infinite loop in the hierarchy. We prevent this.
 */
export const updateDepartment = async (id, data) => {
  const dept = await findDepartmentOrFail(id);

  // Guard: cannot set self as parent
  if (data.parentId === id) {
    throw ApiError.badRequest("A department cannot be its own parent");
  }

  // Guard: cannot set a descendant as parent (circular hierarchy)
  if (data.parentId) {
    const isDescendant = await checkIsDescendant(data.parentId, id);
    if (isDescendant) {
      throw ApiError.badRequest(
        "Cannot set a descendant department as parent (circular hierarchy)",
      );
    }

    // Validate parent belongs to same branch
    const parent = await prisma.department.findUnique({
      where: { id: data.parentId },
      select: { branchId: true },
    });
    if (!parent) throw ApiError.notFound("Parent department not found");
    if (parent.branchId !== dept.branchId) {
      throw ApiError.badRequest(
        "Parent department must belong to the same branch",
      );
    }
  }

  // Code uniqueness check (skip if unchanged)
  if (data.code && data.code !== dept.code) {
    const duplicate = await prisma.department.findUnique({
      where: { branchId_code: { branchId: dept.branchId, code: data.code } },
    });
    if (duplicate) {
      throw ApiError.conflict(
        `A department with code "${data.code}" already exists in this branch`,
      );
    }
  }

  const updated = await prisma.department.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.code !== undefined && { code: data.code }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      // Allow null to detach from parent
      ...(data.parentId !== undefined && { parentId: data.parentId }),
    },
    select: DEPARTMENT_SELECT,
  });

  logger.info({ departmentId: id }, "Department updated");
  return updated;
};

/**
 * Soft-deletes a department by setting isActive = false.
 * Also deactivates all child departments.
 *
 * WHY CASCADE DEACTIVATE:
 * If a parent department is deactivated, its sub-departments logically
 * become unreachable and should not appear in active listings.
 */
export const deleteDepartment = async (id) => {
  await findDepartmentOrFail(id);

  // Collect all descendant IDs to deactivate
  const descendantIds = await getAllDescendantIds(id);

  await prisma.department.updateMany({
    where: { id: { in: [id, ...descendantIds] } },
    data: { isActive: false },
  });

  logger.info(
    { departmentId: id, cascaded: descendantIds.length },
    "Department deactivated (soft delete, children cascaded)",
  );
};

// ── Private helpers ───────────────────────────────────────────

/**
 * Recursively collects all descendant department IDs of a given department.
 */
async function getAllDescendantIds(parentId) {
  const children = await prisma.department.findMany({
    where: { parentId },
    select: { id: true },
  });

  if (children.length === 0) return [];

  const childIds = children.map((c) => c.id);
  const grandchildIds = await Promise.all(
    childIds.map((childId) => getAllDescendantIds(childId)),
  );

  return [...childIds, ...grandchildIds.flat()];
}

/**
 * Checks whether `candidateId` is a descendant of `ancestorId`.
 * Used to prevent circular parent assignments.
 */
async function checkIsDescendant(candidateId, ancestorId) {
  const descendants = await getAllDescendantIds(ancestorId);
  return descendants.includes(candidateId);
}
