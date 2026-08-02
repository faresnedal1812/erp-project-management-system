import * as roleService from "../services/role.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getAllRoles = async (req, res) => {
  const roles = await roleService.getAllRoles();
  ApiResponse.ok(res, "Roles retrieved successfully", roles);
};

export const getRoleById = async (req, res) => {
  const role = await roleService.getRoleById(req.params.id);
  ApiResponse.ok(res, "Role retrieved successfully", role);
};

export const createRole = async (req, res) => {
  const role = await roleService.createRole(req.body);
  ApiResponse.created(res, "Role created successfully", role);
};

export const updateRole = async (req, res) => {
  const role = await roleService.updateRole(req.params.id, req.body);
  ApiResponse.ok(res, "Role updated successfully", role);
};

export const deleteRole = async (req, res) => {
  await roleService.deleteRole(req.params.id);
  ApiResponse.noContent(res);
};

export const assignPermissionsToRole = async (req, res) => {
  const role = await roleService.assignPermissionsToRole(
    req.params.id,
    req.body.permissionIds,
  );
  ApiResponse.ok(res, "Permissions assigned to role successfully", role);
};
