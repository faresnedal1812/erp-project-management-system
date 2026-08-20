import * as teamService from "../services/team.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getTeams = async (req, res) => {
  const includeInactive = req.query?.includeInactive === "true";
  const teams = await teamService.getTeams(req.companyId, includeInactive);
  ApiResponse.ok(res, "Teams retrieved successfully", teams);
};

export const getTeamById = async (req, res) => {
  const team = await teamService.getTeamById(
    req.validated.params.id,
    req.companyId,
  );
  ApiResponse.ok(res, "Team retrieved successfully", team);
};

export const createTeam = async (req, res) => {
  const team = await teamService.createTeam(req.validated.body, req.companyId);
  ApiResponse.created(res, "Team created successfully", team);
};

export const updateTeam = async (req, res) => {
  const team = await teamService.updateTeam(
    req.validated.params.id,
    req.validated.body,
    req.companyId,
  );
  ApiResponse.ok(res, "Team updated successfully", team);
};

export const deleteTeam = async (req, res) => {
  await teamService.deleteTeam(req.validated.params.id, req.companyId);
  ApiResponse.noContent(res);
};

export const addMember = async (req, res) => {
  const member = await teamService.addMember(
    req.validated.params.id,
    req.validated.body.employeeId,
    req.validated.body.role,
    req.companyId,
  );
  ApiResponse.created(res, "Member added to team successfully", member);
};

export const updateMemberRole = async (req, res) => {
  const member = await teamService.updateMemberRole(
    req.validated.params.id,
    req.validated.params.employeeId,
    req.validated.body.role,
    req.companyId,
  );
  ApiResponse.ok(res, "Member role updated successfully", member);
};

export const removeMember = async (req, res) => {
  await teamService.removeMember(
    req.validated.params.id,
    req.validated.params.employeeId,
    req.companyId,
  );
  ApiResponse.noContent(res);
};
