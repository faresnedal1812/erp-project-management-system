import * as employeeService from "../services/employee.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getEmployeesByDepartment = async (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  const employees = await employeeService.getEmployeesByDepartment(
    req.params.departmentId,
    includeInactive,
  );
  ApiResponse.ok(res, "Employees retrieved successfully", employees);
};

export const getEmployeeById = async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.params.id);
  ApiResponse.ok(res, "Employee retrieved successfully", employee);
};

export const getEmployeeByUserId = async (req, res) => {
  const employee = await employeeService.getEmployeeByUserId(req.params.userId);
  ApiResponse.ok(res, "Employee profile retrieved successfully", employee);
};

export const createEmployee = async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);
  ApiResponse.created(res, "Employee profile created successfully", employee);
};

export const updateEmployee = async (req, res) => {
  const employee = await employeeService.updateEmployee(
    req.params.id,
    req.body,
  );
  ApiResponse.ok(res, "Employee profile updated successfully", employee);
};

export const terminateEmployee = async (req, res) => {
  await employeeService.terminateEmployee(req.params.id);
  ApiResponse.noContent(res);
};
