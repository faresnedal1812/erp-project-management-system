import * as activityLogService from "../services/activityLog.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getProjectActivity = async (req, res) => {
  const logs = await activityLogService.getProjectActivity(
    req.validated.params.id,
    req.companyId,
    req.user.id,
    req.validated.query,
  );
  ApiResponse.ok(res, "Project activity logs retrieved successfully", logs);
};

export const getTaskActivity = async (req, res) => {
  const logs = await activityLogService.getTaskActivity(
    req.validated.params.id,
    req.companyId,
    req.user.id,
    req.validated.query,
  );
  ApiResponse.ok(res, "Task activity logs retrieved successfully", logs);
};
