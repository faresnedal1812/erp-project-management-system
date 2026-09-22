import logger from "../config/logger.js";
import ApiError from "../utils/ApiError.js";
import prisma from "../config/database.js";
import { cloudinary } from "../config/cloudinary.js";
import { logActivity, ActivityAction } from "./activityLog.service.js";

// ── Private Helpers ───────────────────────────────────────────────

const getActiveEmployeeId = async (userId, companyId) => {
  const employee = await prisma.employee.findFirst({
    where: { userId, department: { branch: { companyId } } },
    select: { id: true, employmentStatus: true },
  });
  if (!employee)
    throw ApiError.forbidden("Only active employees can manage documents");
  if (employee.employmentStatus !== "ACTIVE")
    throw ApiError.forbidden("Your employment status is inactive");
  return employee.id;
};

/**
 * Validates that the scope-specific FK exists and belongs to this company.
 */
const validateScopeFk = async (
  companyId,
  { scope, projectId, clientId, vendorId },
) => {
  if (scope === "PROJECT") {
    const project = await prisma.project.findFirst({
      where: { id: projectId, companyId },
    });
    if (!project) throw ApiError.notFound("Project not found in this company");
    if (project.status === "CANCELLED")
      throw ApiError.badRequest(
        "Cannot manage documents for a CANCELLED project",
      );
  }
  if (scope === "CLIENT") {
    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId },
    });
    if (!client) throw ApiError.notFound("Client not found in this company");
  }
  if (scope === "VENDOR") {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, companyId },
    });
    if (!vendor) throw ApiError.notFound("Vendor not found in this company");
  }
};

const getDocumentScoped = async (companyId, documentId) => {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.companyId !== companyId)
    throw ApiError.notFound("Document not found");
  return doc;
};

const DOCUMENT_INCLUDE = {
  uploader: {
    select: {
      id: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  project: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
  vendor: { select: { id: true, name: true } },
};

const checkIsOwnerOrAdmin = async (userId, companyId) => {
  const member = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });

  return member.role === "OWNER" || member.role === "ADMIN";
};
// ── GET ALL ───────────────────────────────────────────────────────

export const getAllDocuments = async (companyId, queryParams, userId) => {
  await getActiveEmployeeId(userId, companyId);

  const {
    scope,
    category,
    projectId,
    clientId,
    vendorId,
    search,
    page,
    limit,
  } = queryParams;
  const skip = (page - 1) * limit;

  const where = { companyId };
  if (scope) where.scope = scope;
  if (category) where.category = category;
  if (projectId) where.projectId = projectId;
  if (clientId) where.clientId = clientId;
  if (vendorId) where.vendorId = vendorId;
  if (search)
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { fileName: { contains: search, mode: "insensitive" } },
    ];

  const [data, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
      include: DOCUMENT_INCLUDE,
    }),
    prisma.document.count({ where }),
  ]);

  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ── GET BY ID ─────────────────────────────────────────────────────

export const getDocumentById = async (companyId, documentId, userId) => {
  await getActiveEmployeeId(userId, companyId);

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: DOCUMENT_INCLUDE,
  });
  if (!doc || doc.companyId !== companyId)
    throw ApiError.notFound("Document not found");

  return doc;
};

// ── UPLOAD ────────────────────────────────────────────────────────

export const uploadDocument = async (companyId, data, file, userId) => {
  let uploaderId;
  let doc;

  try {
    uploaderId = await getActiveEmployeeId(userId, companyId);
    await validateScopeFk(companyId, data);

    doc = await prisma.document.create({
      data: {
        companyId,
        uploaderId,
        title: data.title,
        description: data.description || null,
        scope: data.scope || "COMPANY",
        category: data.category || "OTHER",
        projectId: data.projectId || null,
        clientId: data.clientId || null,
        vendorId: data.vendorId || null,
        fileName: file.originalname,
        fileUrl: file.path, // Cloudinary secure URL
        publicId: file.filename, // Cloudinary public_id
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      include: DOCUMENT_INCLUDE,
    });
  } catch (err) {
    // Compensating action: destroy the Cloudinary asset on any failure
    try {
      await cloudinary.uploader.destroy(file.filename, {
        resource_type: "auto",
      });
      logger.info(
        { publicId: file.filename },
        "Orphaned Cloudinary document asset destroyed",
      );
    } catch (cleanupErr) {
      logger.warn(
        { publicId: file.filename, cleanupErr },
        "Failed to destroy orphaned document asset — manual cleanup needed",
      );
    }
    throw err;
  }

  logger.info({ documentId: doc.id, companyId }, "Document uploaded");
  logActivity({
    companyId,
    employeeId: uploaderId,
    action: ActivityAction.DOCUMENT_UPLOADED,
    meta: { documentId: doc.id, title: doc.title, scope: doc.scope },
  });

  return doc;
};

// ── UPDATE (metadata only) ────────────────────────────────────────

export const updateDocument = async (companyId, documentId, data, userId) => {
  const employeeId = await getActiveEmployeeId(userId, companyId);
  const document = await getDocumentScoped(companyId, documentId);

  // Block updates on documents linked to a CANCELLED project
  if (document.scope === "PROJECT" && document.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: document.projectId },
      select: { status: true },
    });
    if (project?.status === "CANCELLED")
      throw ApiError.badRequest(
        "Cannot modify documents for a CANCELLED project",
      );
  }

  const isAdminOrOwner = await checkIsOwnerOrAdmin(userId, companyId);
  if (document.uploaderId !== employeeId && !isAdminOrOwner)
    throw ApiError.forbidden(
      "Only the uploader or an admin/owner can update this document",
    );

  const updated = await prisma.document.update({
    where: { id: documentId },
    data,
    include: DOCUMENT_INCLUDE,
  });

  logger.info({ documentId }, "Document metadata updated");
  return updated;
};

// ── DELETE ────────────────────────────────────────────────────────

export const deleteDocument = async (companyId, documentId, userId) => {
  const employeeId = await getActiveEmployeeId(userId, companyId);
  const document = await getDocumentScoped(companyId, documentId);

  // Block deletions on documents linked to a CANCELLED project
  if (document.scope === "PROJECT" && document.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: document.projectId },
      select: { status: true },
    });
    if (project?.status === "CANCELLED")
      throw ApiError.badRequest(
        "Cannot delete documents for a CANCELLED project",
      );
  }

  const isAdminOrOwner = await checkIsOwnerOrAdmin(userId, companyId);
  if (document.uploaderId !== employeeId && !isAdminOrOwner)
    throw ApiError.forbidden(
      "Only the uploader or an admin/owner can delete this document",
    );

  // 1. Delete from DB first — if this fails, Cloudinary asset is untouched
  await prisma.document.delete({ where: { id: documentId } });

  logger.info(
    { documentId, deletedBy: employeeId },
    "Document deleted from DB",
  );
  logActivity({
    companyId,
    employeeId,
    action: ActivityAction.DOCUMENT_DELETED,
    meta: { documentId, title: document.title },
  });

  // 2. Delete from Cloudinary — log failure but do not rethrow
  try {
    await cloudinary.uploader.destroy(document.publicId, {
      resource_type: "auto",
    });
    logger.info(
      { publicId: document.publicId },
      "Cloudinary document asset deleted",
    );
  } catch (err) {
    logger.warn(
      { publicId: document.publicId, err },
      "Cloudinary deletion failed — asset orphaned in cloud storage",
    );
  }
};
