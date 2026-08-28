import * as taskAssignmentService from "../services/taskAssignment.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const assignEmployee = async (req, res) => {
  const assignment = await taskAssignmentService.assignEmployee(
    req.validated.params.id,
    req.validated.body.employeeId,
    req.companyId,
    req.user.id,
  );
  ApiResponse.created(
    res,
    "Employee assigned to task successfully",
    assignment,
  );
};

export const unassignEmployee = async (req, res) => {
  await taskAssignmentService.unassignEmployee(
    req.validated.params.id,
    req.validated.params.employeeId,
    req.companyId,
    req.user.id,
  );
  ApiResponse.noContent(res);
};
