import logger from "../config/logger.js";
import ApiError from "../utils/ApiError.js";
import prisma from "../config/database.js";
import {
  logActivity,
  ActivityAction,
} from "../services/activityLog.service.js";

// ── GET ALL ──────────────────────────────────────────────────────
const getActiveEmployeeId = async (userId, companyId) => {
  const employee = await prisma.employee.findFirst({
    where: {
      userId,
      department: {
        branch: { companyId },
      },
    },
    select: { id: true, employmentStatus: true },
  });

  if (!employee)
    throw ApiError.forbidden(
      "Only employees in this company can manage clients",
    );
  if (employee.employmentStatus !== "ACTIVE")
    throw ApiError.forbidden("Your employment status is inactive");

  return employee.id;
};

export const getAllClients = async (companyId, queryParams, userId) => {
  await getActiveEmployeeId(userId, companyId);

  const { status, search, limit, page } = queryParams;
  const skip = (page - 1) * limit;

  const where = { companyId };

  if (status) where.status = status;
  if (search)
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
      take: limit,
      skip,
      include: {
        _count: { select: { projects: true } },
      },
    }),
    prisma.client.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      limit,
      page,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ── GET BY ID ────────────────────────────────────────────────────
export const getClientById = async (companyId, clientId, userId) => {
  const employeeId = await getActiveEmployeeId(userId, companyId);

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      projects: {
        select: { id: true, name: true, status: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client || client.companyId !== companyId)
    throw ApiError.notFound("Client not found");

  return { client, employeeId };
};

// ── CREATE ───────────────────────────────────────────────────────
export const createClient = async (companyId, data, userId) => {
  const employeeId = await getActiveEmployeeId(userId, companyId);

  // Check unique name per company
  const duplicate = await prisma.client.findUnique({
    where: { companyId_name: { companyId, name: data.name } },
  });
  if (duplicate)
    throw ApiError.conflict("Client with this name is already exist");

  // Handle empty strings instead of sending literal "" to db
  const safeData = { ...data };
  if (safeData.email === "") safeData.email = null;
  if (safeData.website === "") safeData.website = null;

  const client = await prisma.client.create({
    data: {
      ...safeData,
      companyId,
    },
  });

  logger.info({ client: client.id, companyId }, "Client created");

  logActivity({
    companyId,
    employeeId,
    action: ActivityAction.CLIENT_CREATED,
    meta: { client: client.id, name: client.name },
  });

  return client;
};

// ── UPDATE ───────────────────────────────────────────────────────
export const updateClient = async (companyId, clientId, data, userId) => {
  const { client, employeeId } = await getClientById(
    companyId,
    clientId,
    userId,
  );

  // Check unique name per company
  if (data.name && data.name !== client.name) {
    const duplicate = await prisma.client.findUnique({
      where: { companyId_name: { companyId, name: data.name } },
    });
    if (duplicate)
      throw ApiError.conflict("Client with this name is already exist");
  }

  // Handle empty strings instead of sending literal "" to db
  const safeData = { ...data };
  if (safeData.email === "") safeData.email = null;
  if (safeData.website === "") safeData.website = null;

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: safeData,
    include: {
      _count: { select: { projects: true } },
    },
  });

  logger.info({ clientId }, "Client updated");

  logActivity({
    companyId,
    employeeId,
    action: ActivityAction.CLIENT_UPDATED,
    meta: { clientId, updatedFields: Object.keys(data) },
  });

  return updated;
};

// ── DELETE / ARCHIVE ─────────────────────────────────────────────
export const deleteClient = async (companyId, clientId, userId) => {
  const { employeeId } = await getClientById(companyId, clientId, userId);

  // Soft delete via ARCHIVED status
  await prisma.client.update({
    where: { id: clientId },
    data: { status: "ARCHIVED" },
  });

  logger.info({ clientId }, "Client archived");

  logActivity({
    companyId,
    employeeId,
    action: ActivityAction.CLIENT_ARCHIVED,
    meta: { clientId },
  });
};
