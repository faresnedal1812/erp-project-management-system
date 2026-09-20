import * as analyticsService from "../services/analytics.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getOverview = async (req, res) => {
  const { from, to, granularity } = req.validated.query;
  const { companyId } = req;

  const data = await analyticsService.getOverview(
    companyId,
    from,
    to,
    granularity,
  );
  ApiResponse.ok(res, "Overview analytics retrieved successfully", data);
};
export const getTasksAnalytics = async (req, res) => {
  const { from, to, granularity } = req.validated.query;
  const { companyId } = req;

  const data = await analyticsService.getTasksAnalytics(
    companyId,
    from,
    to,
    granularity,
  );
  ApiResponse.ok(res, "Tasks analytics retrieved successfully", data);
};
export const getVelocity = async (req, res) => {
  const { from, to, granularity } = req.validated.query;
  const { companyId } = req;

  const data = await analyticsService.getProjectVelocity(
    companyId,
    from,
    to,
    granularity,
    null,
  );
  ApiResponse.ok(
    res,
    "Company Porjects velocity analytics retrieved successfully",
    data,
  );
};
export const getProjectVelocity = async (req, res) => {
  const { from, to, granularity } = req.validated.query;
  const { projectId } = req.validated.params;
  const { companyId } = req;

  const data = await analyticsService.getProjectVelocity(
    companyId,
    from,
    to,
    granularity,
    projectId,
  );
  ApiResponse.ok(
    res,
    "Porject velocity analytics retrieved successfully",
    data,
  );
};
export const getEmployeesProductivity = async (req, res) => {
  const { from, to, granularity } = req.validated.query;
  const { companyId } = req;

  const data = await analyticsService.getEmployeeProductivity(
    companyId,
    from,
    to,
    granularity,
    null,
  );
  ApiResponse.ok(
    res,
    "Employees productivity analytics retrieved successfully",
    data,
  );
};
export const getEmployeeProductivity = async (req, res) => {
  const { from, to, granularity } = req.validated.query;
  const { employeeId } = req.validated.params;
  const { companyId } = req;

  const data = await analyticsService.getEmployeeProductivity(
    companyId,
    from,
    to,
    granularity,
    employeeId,
  );
  ApiResponse.ok(
    res,
    "Employee productivity analytics retrieved successfully",
    data,
  );
};

export const getMeetingsAnalytics = async (req, res) => {
  const { from, to, granularity } = req.validated.query;
  const { companyId } = req;

  const data = await analyticsService.getMeetingFrequency(
    companyId,
    from,
    to,
    granularity,
  );
  ApiResponse.ok(res, "Meetings analytics retrieved successfully", data);
};
