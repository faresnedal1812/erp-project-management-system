import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";
import { cloudinary } from "../config/cloudinary.js";

// ── Shared helpers ───────────────────────────────────────────────

const getActiveEmployeeId = async (userId) => {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true, employmentStatus: true },
  });
  if (!employee)
    throw ApiError.forbidden("Only employees can manage task attachments");
  if (employee.employmentStatus !== "ACTIVE") {
    throw ApiError.forbidden("Your employment status is inactive");
  }
  return employee.id;
};

/**
 * Resolves a task, validates company scope, enforces PRIVATE visibility,
 * and returns { task, membership }.
 */
const resolveTask = async (taskId, companyId, employeeId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          members: { select: { employeeId: true, role: true } },
        },
      },
    },
  });

  if (!task) throw ApiError.notFound("Task not found");
  if (task.project.companyId !== companyId) {
    throw ApiError.forbidden("Access denied.");
  }

  const membership = task.project.members.find(
    (m) => m.employeeId === employeeId,
  );

  if (task.project.visibility === "PRIVATE" && !membership) {
    throw ApiError.forbidden("You do not have access to this private project.");
  }

  return { task, membership };
};

/**
 * Verifies the requester is an active project member.
 */
const verifyMemberAccess = async (taskId, companyId, userId) => {
  const employeeId = await getActiveEmployeeId(userId);
  const { task, membership } = await resolveTask(taskId, companyId, employeeId);

  if (!membership) {
    throw ApiError.forbidden(
      "You must be a project member to manage task attachments.",
    );
  }

  return { employeeId, task, membership };
};

// ── GET ─────────────────────────────────────────────────────────

export const getAttachments = async (taskId, companyId, userId) => {
  await verifyMemberAccess(taskId, companyId, userId);

  return prisma.taskAttachment.findMany({
    where: { taskId },
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

// ── UPLOAD ─────────────────────────────────────────────────────

export const uploadAttachment = async (taskId, file, companyId, userId) => {
  const { employeeId } = await verifyMemberAccess(taskId, companyId, userId);

  // file has already been uploaded by Multer to Cloudinary at this point
  const attachment = await prisma.taskAttachment.create({
    data: {
      taskId,
      employeeId,
      fileName: file.originalname,
      fileUrl: file.path, // Cloudinary secure URL
      publicId: file.filename, // Cloudinary public_id (multer-storage-cloudinary stores it here)
      mimeType: file.mimetype,
      sizeBytes: file.size,
    },
    include: {
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  logger.info(
    { attachmentId: attachment.id, taskId, employeeId },
    "Attachment uploaded",
  );
  return attachment;
};

// ── DELETE ─────────────────────────────────────────────────────

export const deleteAttachment = async (
  taskId,
  attachmentId,
  companyId,
  userId,
) => {
  const { employeeId, membership } = await verifyMemberAccess(
    taskId,
    companyId,
    userId,
  );

  const attachment = await prisma.taskAttachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment || attachment.taskId !== taskId) {
    throw ApiError.notFound("Attachment not found");
  }

  const isUploader = attachment.employeeId === employeeId;
  const isManager = membership.role === "MANAGER";

  // Only the uploader or a MANAGER can delete an attachment
  if (!isUploader && !isManager) {
    throw ApiError.forbidden(
      "You can only delete your own attachments. Project MANAGERs can delete any attachment.",
    );
  }

  // Delete from Cloudinary first, then remove DB record
  try {
    await cloudinary.uploader.destroy(attachment.publicId, {
      resource_type: "auto",
    });
  } catch (err) {
    // Log the error but don't block the DB cleanup
    logger.warn(
      { publicId: attachment.publicId, err },
      "Cloudinary deletion failed — removing DB record anyway",
    );
  }

  await prisma.taskAttachment.delete({ where: { id: attachmentId } });
  logger.info(
    { attachmentId, taskId, deletedBy: employeeId },
    "Attachment deleted",
  );
};
