import logger from "../config/logger.js";
import ApiError from "../utils/ApiError.js";
import prisma from "../config/database.js";
import { logActivity, ActivityAction } from "./activityLog.service.js";

// ── Private helper ────────────────────────────────────────────────

/**
 * Resolves the active employee ID for the requesting user within the company.
 * Throws Forbidden if the user is not an active employee of that company.
 */
const getActiveEmployeeId = async (userId, companyId) => {
  const employee = await prisma.employee.findFirst({
    where: {
      userId,
      department: { branch: { companyId } },
    },
    select: { id: true, employmentStatus: true },
  });

  if (!employee) throw ApiError.forbidden("Only employees can manage vendors");
  if (employee.employmentStatus !== "ACTIVE")
    throw ApiError.forbidden("Your employment status is inactive");

  return employee.id;
};

/**
 * Sanitises string fields that are optionally nullable — converts empty strings
 * to null so the database never stores meaningless empty values.
 */
const sanitiseData = (data) => {
  const safe = { ...data };
  if (safe.email === "") safe.email = null;
  if (safe.website === "") safe.website = null;
  return safe;
};

// ── GET ALL ───────────────────────────────────────────────────────

export const getAllVendors = async (companyId, queryParams, userId) => {
  await getActiveEmployeeId(userId, companyId);

  const { status, type, search, page, limit } = queryParams;
  const skip = (page - 1) * limit;

  const where = { companyId };
  if (status) where.status = status;
  if (type) where.type = type;
  if (search)
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
    ];

  const [data, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: limit,
      skip,
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ── GET BY ID ─────────────────────────────────────────────────────

export const getVendorById = async (companyId, vendorId, userId) => {
  const employeeId = await getActiveEmployeeId(userId, companyId);

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
  });

  if (!vendor || vendor.companyId !== companyId)
    throw ApiError.notFound("Vendor not found");

  return { vendor, employeeId };
};

// ── CREATE ────────────────────────────────────────────────────────

export const createVendor = async (companyId, data, userId) => {
  const employeeId = await getActiveEmployeeId(userId, companyId);

  const duplicate = await prisma.vendor.findUnique({
    where: { companyId_name: { companyId, name: data.name } },
  });
  if (duplicate)
    throw ApiError.conflict(
      "A vendor with this name already exists in your company",
    );

  const vendor = await prisma.vendor.create({
    data: {
      ...sanitiseData(data),
      companyId,
    },
  });

  logger.info({ vendorId: vendor.id, companyId }, "Vendor created");

  logActivity({
    companyId,
    employeeId,
    action: ActivityAction.VENDOR_CREATED,
    meta: { vendorId: vendor.id, name: vendor.name },
  });

  return vendor;
};

// ── UPDATE ────────────────────────────────────────────────────────

export const updateVendor = async (companyId, vendorId, data, userId) => {
  const { vendor, employeeId } = await getVendorById(
    companyId,
    vendorId,
    userId,
  );

  if (data.name && data.name !== vendor.name) {
    const duplicate = await prisma.vendor.findUnique({
      where: { companyId_name: { companyId, name: data.name } },
    });
    if (duplicate)
      throw ApiError.conflict("A vendor with this name already exists");
  }

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: sanitiseData(data),
  });

  logger.info({ vendorId }, "Vendor updated");

  logActivity({
    companyId,
    employeeId,
    action: ActivityAction.VENDOR_UPDATED,
    meta: { vendorId, updatedFields: Object.keys(data) },
  });

  return updated;
};

// ── DELETE / ARCHIVE ──────────────────────────────────────────────

export const deleteVendor = async (companyId, vendorId, userId) => {
  const { employeeId, vendor } = await getVendorById(
    companyId,
    vendorId,
    userId,
  );

  if (vendor.status === "ARCHIVED") return;

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { status: "ARCHIVED" },
  });

  logger.info({ vendorId }, "Vendor archived");

  logActivity({
    companyId,
    employeeId,
    action: ActivityAction.VENDOR_ARCHIVED,
    meta: { vendorId },
  });
};
