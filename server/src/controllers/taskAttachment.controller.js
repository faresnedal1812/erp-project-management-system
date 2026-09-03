import * as taskAttachmentService from "../services/taskAttachment.service.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

export const getAttachments = async (req, res) => {
  const attachments = await taskAttachmentService.getAttachments(
    req.validated.params.id,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Task attachments retrieved successfully", attachments);
};

export const uploadAttachment = async (req, res) => {
  if (!req.file) throw ApiError.badRequest("No file uploaded");

  const attachment = await taskAttachmentService.uploadAttachment(
    req.validated.params.id,
    req.file,
    req.companyId,
    req.user.id,
  );
  ApiResponse.created(res, "Attachment uploaded successfully", attachment);
};

export const deleteAttachment = async (req, res) => {
  await taskAttachmentService.deleteAttachment(
    req.validated.params.id,
    req.validated.params.attachmentId,
    req.companyId,
    req.user.id,
  );
  ApiResponse.noContent(res);
};
