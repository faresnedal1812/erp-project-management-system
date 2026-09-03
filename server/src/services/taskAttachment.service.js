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
  let employeeId;
  let attachment;

  try {
    const access = await verifyMemberAccess(taskId, companyId, userId);
    employeeId = access.employeeId;

    attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        employeeId,
        fileName: file.originalname,
        fileUrl: file.path, // Cloudinary secure URL
        publicId: file.filename, // Cloudinary public_id
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
  } catch (err) {
    // Compensate: destroy the Cloudinary asset to keep storage consistent
    try {
      await cloudinary.uploader.destroy(file.filename, {
        resource_type: "auto",
      });
      logger.info(
        { publicId: file.filename },
        "Orphaned Cloudinary asset destroyed after upload failure",
      );
    } catch (cleanupErr) {
      logger.warn(
        { publicId: file.filename, cleanupErr },
        "Failed to destroy orphaned Cloudinary asset — manual cleanup required",
      );
    }
    throw err; // rethrow original error (auth or DB) to the controller
  }

  // Log AFTER the try/catch boundary so a logging failure cannot trigger asset deletion
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

  // 1. Delete from database FIRST.
  // If this fails, the file remains in Cloudinary and the DB link is intact.
  await prisma.taskAttachment.delete({ where: { id: attachmentId } });

  logger.info(
    { attachmentId, taskId, deletedBy: employeeId },
    "Attachment deleted from database",
  );

  // 2. Delete from Cloudinary NEXT.
  // If this fails, we log it. The asset becomes orphaned in Cloudinary,
  // but importantly, the application UI does not show a broken image link.
  try {
    await cloudinary.uploader.destroy(attachment.publicId, {
      resource_type: "auto",
    });
    logger.info({ publicId: attachment.publicId }, "Cloudinary asset deleted");
  } catch (err) {
    logger.warn(
      { publicId: attachment.publicId, err },
      "Cloudinary deletion failed — asset orphaned in cloud storage but removed from DB",
    );
  }
};
