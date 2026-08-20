import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";
// ── Shared select shape ───────────────────────────────────────
const BRANCH_SELECT = {
  id: true,
  companyId: true,
  name: true,
  code: true,
  address: true,
  city: true,
  country: true,
  phone: true,
  email: true,
  isHeadquarters: true,
  isActive: true,
  company: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
};
// ── Helpers ───────────────────────────────────────────────────
const findBranchOrFail = async (id, companyId) => {
  const branch = await prisma.branch.findUnique({
    where: { id },
    select: BRANCH_SELECT,
  });
  if (!branch) throw ApiError.notFound("Branch not found");
  if (branch.companyId !== companyId)
    throw ApiError.forbidden(
      "Access denied: Branch belongs to another company",
    );
  return branch;
};
const findActiveCompanyOrFail = async (companyId) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, isActive: true },
  });
  if (!company) throw ApiError.notFound("Company not found");
  if (!company.isActive) throw ApiError.badRequest("Company is inactive");
};
// ── Branch CRUD ───────────────────────────────────────────────
/**
 * Returns all branches for a given company.
 * Inactive branches are excluded by default unless the caller requests all.
 */
export const getBranchesByCompany = async (
  companyId,
  includeInactive = false,
) => {
  await findActiveCompanyOrFail(companyId);
  return prisma.branch.findMany({
    where: {
      companyId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    select: BRANCH_SELECT,
    orderBy: [{ isHeadquarters: "desc" }, { name: "asc" }],
  });
};
/**
 * Returns a single branch by its ID.
 */
export const getBranchById = async (id, companyId) => {
  return findBranchOrFail(id, companyId);
};
/**
 * Creates a new branch under a company.
 *
 * WHY HEADQUARTERS GUARD:
 * A company should have at most one headquarters branch. If the new branch is
 * flagged as headquarters, we first demote any existing HQ to prevent duplicates.
 * Both operations are wrapped in a transaction.
 */
export const createBranch = async (data, companyId) => {
  await findActiveCompanyOrFail(companyId);
  // Enforce unique code per company if code is provided
  if (data.code) {
    const duplicate = await prisma.branch.findUnique({
      where: { companyId_code: { companyId, code: data.code } },
    });
    if (duplicate) {
      throw ApiError.conflict(
        `A branch with code "${data.code}" already exists in this company`,
      );
    }
  }
  try {
    const branch = await prisma.$transaction(async (tx) => {
      // Demote existing HQ if the new branch becomes headquarters
      if (data.isHeadquarters) {
        await tx.branch.updateMany({
          where: { companyId, isHeadquarters: true },
          data: { isHeadquarters: false },
        });
      }
      return tx.branch.create({
        data: {
          companyId,
          name: data.name,
          code: data.code,
          address: data.address,
          city: data.city,
          country: data.country,
          phone: data.phone,
          email: data.email,
          isHeadquarters: data.isHeadquarters ?? false,
        },
        select: BRANCH_SELECT,
      });
    });
    logger.info({ branchId: branch.id, companyId }, "Branch created");
    return branch;
  } catch (error) {
    if (
      error.code === "P2002" &&
      error.meta?.target?.includes("branches_one_headquarters_per_company_key")
    ) {
      throw ApiError.conflict(
        "This company already has a headquarters branch. Concurrent promotion detected.",
      );
    }
    throw error;
  }
};
/**
 * Updates branch details.
 * If isHeadquarters is set to true, the existing HQ is demoted atomically.
 */
export const updateBranch = async (id, companyId, data) => {
  const branch = await findBranchOrFail(id, companyId);

  if (data.isHeadquarters === false && branch.isHeadquarters === true) {
    const hqCount = await prisma.branch.count({
      where: { companyId, isHeadquarters: true },
    });

    if (hqCount === 1) {
      throw ApiError.badRequest(
        "Cannot demote the only headquarters branch of the company. Assign another branch as headquarters first.",
      );
    }
  }

  // Code uniqueness check (skip if code unchanged)
  if (data.code && data.code !== branch.code) {
    const duplicate = await prisma.branch.findUnique({
      where: {
        companyId_code: { companyId: branch.companyId, code: data.code },
      },
    });
    if (duplicate) {
      throw ApiError.conflict(
        `A branch with code "${data.code}" already exists in this company`,
      );
    }
  }
  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Demote existing HQ if promoting this branch
      if (data.isHeadquarters === true && !branch.isHeadquarters) {
        await tx.branch.updateMany({
          where: { companyId: branch.companyId, isHeadquarters: true },
          data: { isHeadquarters: false },
        });
      }
      return tx.branch.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.code !== undefined && { code: data.code }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.city !== undefined && { city: data.city }),
          ...(data.country !== undefined && { country: data.country }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.isHeadquarters !== undefined && {
            isHeadquarters: data.isHeadquarters,
          }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
        select: BRANCH_SELECT,
      });
    });
    logger.info({ branchId: id }, "Branch updated");
    return updated;
  } catch (error) {
    if (
      error.code === "P2002" &&
      error.meta?.target?.includes("branches_one_headquarters_per_company_key")
    ) {
      throw ApiError.conflict(
        "This company already has a headquarters branch. Concurrent promotion detected.",
      );
    }
    throw error;
  }
};
/**
 * Soft-deletes a branch by setting isActive = false.
 *
 * WHY SOFT DELETE:
 * Departments and Employees will reference Branch.id in later sections.
 * Hard-deleting now would cascade and destroy dependent data prematurely.
 */
export const deleteBranch = async (id, companyId) => {
  const branch = await findBranchOrFail(id, companyId);
  if (branch.isHeadquarters === true) {
    const hqCount = await prisma.branch.count({
      where: { companyId, isHeadquarters: true },
    });

    if (hqCount === 1) {
      throw ApiError.badRequest(
        "Cannot deactivate the only headquarters branch of the company. Assign another branch as headquarters first.",
      );
    }
  }
  await prisma.branch.update({
    where: { id },
    data: { isActive: false },
  });
  logger.info({ branchId: id }, "Branch deactivated (soft delete)");
};
