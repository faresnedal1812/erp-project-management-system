import * as projectMemberService from "../services/projectMember.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getProjectMembers = async (req, res) => {
  const members = await projectMemberService.getProjectMembers(
    req.validated.params.id,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Project members retrieved successfully", members);
};

export const addProjectMember = async (req, res) => {
  const member = await projectMemberService.addProjectMember(
    req.validated.params.id,
    req.validated.body,
    req.companyId,
    req.user.id,
  );
  ApiResponse.created(res, "Project member added successfully", member);
};

export const updateProjectMemberRole = async (req, res) => {
  const member = await projectMemberService.updateProjectMemberRole(
    req.validated.params.id,
    req.validated.params.employeeId,
    req.validated.body.role,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Project member role updated successfully", member);
};

export const removeProjectMember = async (req, res) => {
  await projectMemberService.removeProjectMember(
    req.validated.params.id,
    req.validated.params.employeeId,
    req.companyId,
    req.user.id,
  );
  ApiResponse.noContent(res);
};
