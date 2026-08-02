import * as permissionService from "../services/permission.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getAllPermissions = async (req, res) => {
  const permissions = await permissionService.getAllPermissions();
  ApiResponse.ok(res, "Permissions retrieved successfully", permissions);
};

export const getPermissionById = async (req, res) => {
  const permission = await permissionService.getPermissionById(req.params.id);
  ApiResponse.ok(res, "Permission retrieved successfully", permission);
};

export const createPermission = async (req, res) => {
  const permission = await permissionService.createPermission(req.body);
  ApiResponse.created(res, "Permission created successfully", permission);
};

export const deletePermission = async (req, res) => {
  await permissionService.deletePermission(req.params.id);
  ApiResponse.noContent(res);
};
