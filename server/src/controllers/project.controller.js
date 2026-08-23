import * as projectService from "../services/project.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getAllProjects = async (req, res) => {
  const includeInactive = req.validated.query.includeInactive === "true";
  const projects = await projectService.getAllProjects(
    req.companyId,
    req.user.id,
    includeInactive,
  );
  ApiResponse.ok(res, "Projects retrieved successfully", projects);
};
export const getProjectById = async (req, res) => {
  const project = await projectService.getProjectById(
    req.validated.params.id,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Project retrieved successfully", project);
};
export const createProject = async (req, res) => {
  const project = await projectService.createProject(
    req.validated.body,
    req.companyId,
    req.user.id,
  );
  ApiResponse.created(res, "Project created successfully", project);
};
export const updateProject = async (req, res) => {
  const project = await projectService.updateProject(
    req.validated.params.id,
    req.validated.body,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Project updated successfully", project);
};
export const deleteProject = async (req, res) => {
  await projectService.deleteProject(
    req.validated.params.id,
    req.companyId,
    req.user.id,
  );
  ApiResponse.noContent(res);
};
