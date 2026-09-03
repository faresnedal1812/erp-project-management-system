import * as taskCommentService from "../services/taskComment.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getTaskComments = async (req, res) => {
  const comments = await taskCommentService.getTaskComments(
    req.validated.params.id,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Task comments retrieved successfully", comments);
};

export const createComment = async (req, res) => {
  const comment = await taskCommentService.createComment(
    req.validated.params.id,
    req.validated.body,
    req.companyId,
    req.user.id,
  );
  ApiResponse.created(res, "Comment created successfully", comment);
};

export const updateComment = async (req, res) => {
  const comment = await taskCommentService.updateComment(
    req.validated.params.id,
    req.validated.params.commentId,
    req.validated.body,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Comment updated successfully", comment);
};

export const deleteComment = async (req, res) => {
  await taskCommentService.deleteComment(
    req.validated.params.id,
    req.validated.params.commentId,
    req.companyId,
    req.user.id,
  );
  ApiResponse.noContent(res);
};
