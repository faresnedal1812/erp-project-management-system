import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── Shared select shapes ─────────────────────────────────────

const COMPANY_SELECT = {
  id: true,
  name: true,
  industry: true,
  website: true,
  email: true,
  phone: true,
  address: true,
  logo: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const MEMBER_SELECT = {
  role: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
};

// ── Helpers ──────────────────────────────────────────────────

/**
 * Fetches a company by ID or throws a 404.
 */
const findCompanyOrFail = async (id) => {
  const company = await prisma.company.findUnique({
    where: { id },
    select: COMPANY_SELECT,
  });
  if (!company) throw ApiError.notFound("Company not found");
  return company;
};

// ── Company CRUD ─────────────────────────────────────────────

/**
 * Returns all active companies.
 */
export const getAllCompanies = async () => {
  return prisma.company.findMany({
    where: { isActive: true },
    select: COMPANY_SELECT,
    orderBy: { name: "asc" },
  });
};

/**
 * Returns a single company by ID.
 */
export const getCompanyById = async (id) => {
  const company = await prisma.company.findUnique({
    where: { id },
    select: {
      ...COMPANY_SELECT,
      members: { select: MEMBER_SELECT },
    },
  });
  if (!company) throw ApiError.notFound("Company not found");
  return company;
};

/**
 * Creates a new company.
 *
 * WHY AUTO-ASSIGN OWNER:
 * The creator of the company must always be an OWNER. This prevents
 * a company from existing without someone responsible for it.
 * We wrap both operations in a transaction so they succeed or fail together.
 */
export const createCompany = async (data, creatorUserId) => {
  const company = await prisma.$transaction(async (tx) => {
    const newCompany = await tx.company.create({
      data: {
        name: data.name,
        industry: data.industry,
        website: data.website,
        email: data.email,
        phone: data.phone,
        address: data.address,
        logo: data.logo,
      },
      select: COMPANY_SELECT,
    });

    // Automatically make the creator the OWNER.
    await tx.companyMember.create({
      data: {
        companyId: newCompany.id,
        userId: creatorUserId,
        role: "OWNER",
      },
    });

    return newCompany;
  });

  logger.info(
    { companyId: company.id, creatorUserId },
    "Company created — creator assigned as OWNER",
  );

  return company;
};

/**
 * Updates company details.
 */
export const updateCompany = async (id, data) => {
  await findCompanyOrFail(id);

  const updated = await prisma.company.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.industry !== undefined && { industry: data.industry }),
      ...(data.website !== undefined && { website: data.website }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.logo !== undefined && { logo: data.logo }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    select: COMPANY_SELECT,
  });

  logger.info({ companyId: id }, "Company updated");
  return updated;
};

/**
 * Soft-deletes a company by setting isActive = false.
 *
 * WHY SOFT DELETE:
 * Branches, departments, and employees reference the company.
 * Hard-deleting would require cascading deletes across many tables,
 * risking unrecoverable data loss. Soft delete preserves history
 * and is recoverable by toggling isActive back to true.
 */
export const deleteCompany = async (id) => {
  await findCompanyOrFail(id);

  await prisma.company.update({
    where: { id },
    data: { isActive: false },
  });

  logger.info({ companyId: id }, "Company deactivated (soft delete)");
};

// ── Member Management ────────────────────────────────────────

/**
 * Lists all members of a company.
 */
export const getCompanyMembers = async (companyId) => {
  await findCompanyOrFail(companyId);

  return prisma.companyMember.findMany({
    where: { companyId },
    select: MEMBER_SELECT,
    orderBy: { createdAt: "asc" },
  });
};

/**
 * Adds a user to a company. Enforces uniqueness (a user can only be
 * a member of the same company once).
 */
export const addMember = async (companyId, userId, role = "MEMBER") => {
  await findCompanyOrFail(companyId);

  // Verify the user exists.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw ApiError.notFound("User not found");

  // Prevent duplicate membership.
  const existing = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (existing) {
    throw ApiError.conflict("User is already a member of this company");
  }

  const member = await prisma.companyMember.create({
    data: { companyId, userId, role },
    select: MEMBER_SELECT,
  });

  logger.info({ companyId, userId, role }, "Member added to company");
  return member;
};

/**
 * Updates a member's role within a company.
 *
 * WHY PROTECT THE LAST OWNER:
 * A company must always have at least one OWNER.
 * Demoting the last owner would leave the company admin-less.
 */
export const updateMemberRole = async (companyId, userId, newRole) => {
  await findCompanyOrFail(companyId);

  const member = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (!member) throw ApiError.notFound("Member not found in this company");

  // Guard: do not allow demoting the last OWNER.
  if (member.role === "OWNER" && newRole !== "OWNER") {
    const ownerCount = await prisma.companyMember.count({
      where: { companyId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      throw ApiError.badRequest(
        "Cannot demote the last OWNER. Assign another OWNER first.",
      );
    }
  }

  const updated = await prisma.companyMember.update({
    where: { userId_companyId: { userId, companyId } },
    data: { role: newRole },
    select: MEMBER_SELECT,
  });

  logger.info({ companyId, userId, newRole }, "Member role updated");
  return updated;
};

/**
 * Removes a user from a company.
 * An OWNER cannot be removed while they are the last owner.
 */
export const removeMember = async (companyId, userId) => {
  await findCompanyOrFail(companyId);

  const member = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (!member) throw ApiError.notFound("Member not found in this company");

  if (member.role === "OWNER") {
    const ownerCount = await prisma.companyMember.count({
      where: { companyId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      throw ApiError.badRequest(
        "Cannot remove the last OWNER. Assign another OWNER first.",
      );
    }
  }

  await prisma.companyMember.delete({
    where: { userId_companyId: { userId, companyId } },
  });

  logger.info({ companyId, userId }, "Member removed from company");
};
