import * as departmentService from "../services/department.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getDepartmentsByBranch = async (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  const departments = await departmentService.getDepartmentsByBranch(
    req.params.branchId,
    includeInactive,
  );
  ApiResponse.ok(res, "Departments retrieved successfully", departments);
};

export const getDepartmentById = async (req, res) => {
  const department = await departmentService.getDepartmentById(req.params.id);
  ApiResponse.ok(res, "Department retrieved successfully", department);
};

export const createDepartment = async (req, res) => {
  const department = await departmentService.createDepartment(req.body);
  ApiResponse.created(res, "Department created successfully", department);
};

export const updateDepartment = async (req, res) => {
  const department = await departmentService.updateDepartment(
    req.params.id,
    req.body,
  );
  ApiResponse.ok(res, "Department updated successfully", department);
};

export const deleteDepartment = async (req, res) => {
  await departmentService.deleteDepartment(req.params.id);
  ApiResponse.noContent(res);
};
