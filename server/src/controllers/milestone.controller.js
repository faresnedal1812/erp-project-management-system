import * as milestoneService from "../services/milestone.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getMilestones = async (req, res) => {
  const milestones = await milestoneService.getMilestones(
    req.validated.params.id,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Project Milestones retrieved successfully", milestones);
};

export const createMilestone = async (req, res) => {
  const milestone = await milestoneService.createMilestone(
    req.validated.params.id,
    req.validated.body,
    req.companyId,
    req.user.id,
  );
  ApiResponse.created(res, "Project Milestone created successfully", milestone);
};

export const updateMilestone = async (req, res) => {
  const milestone = await milestoneService.updateMilestone(
    req.validated.params.id,
    req.validated.params.milestoneId,
    req.validated.body,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Project Milestone updated successfully", milestone);
};

export const deleteMilestone = async (req, res) => {
  await milestoneService.deleteMilestone(
    req.validated.params.id,
    req.validated.params.milestoneId,
    req.companyId,
    req.user.id,
  );
  ApiResponse.noContent(res);
};
