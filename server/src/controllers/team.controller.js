import * as teamService from "../services/team.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getTeams = async (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  const teams = await teamService.getTeams(req.companyId, includeInactive);
  ApiResponse.ok(res, "Teams retrieved successfully", teams);
};

export const getTeamById = async (req, res) => {
  const team = await teamService.getTeamById(req.params.id, req.companyId);
  ApiResponse.ok(res, "Team retrieved successfully", team);
};

export const createTeam = async (req, res) => {
  const team = await teamService.createTeam(req.body, req.companyId);
  ApiResponse.created(res, "Team created successfully", team);
};

export const updateTeam = async (req, res) => {
  const team = await teamService.updateTeam(
    req.params.id,
    req.body,
    req.companyId,
  );
  ApiResponse.ok(res, "Team updated successfully", team);
};

export const deleteTeam = async (req, res) => {
  await teamService.deleteTeam(req.params.id, req.companyId);
  ApiResponse.noContent(res);
};

export const addMember = async (req, res) => {
  const member = await teamService.addMember(
    req.params.id,
    req.body.employeeId,
    req.body.role,
    req.companyId,
  );
  ApiResponse.created(res, "Member added to team successfully", member);
};

export const updateMemberRole = async (req, res) => {
  const member = await teamService.updateMemberRole(
    req.params.id,
    req.params.employeeId,
    req.body.role,
    req.companyId,
  );
  ApiResponse.ok(res, "Member role updated successfully", member);
};

export const removeMember = async (req, res) => {
  await teamService.removeMember(
    req.params.id,
    req.params.employeeId,
    req.companyId,
  );
  ApiResponse.noContent(res);
};
