import * as employeeService from "../services/employee.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getEmployeesByDepartment = async (req, res) => {
  const includeInactive = req.query?.includeInactive === "true";
  const employees = await employeeService.getEmployeesByDepartment(
    req.validated.params.departmentId,
    includeInactive,
    req.companyId,
  );
  ApiResponse.ok(res, "Employees retrieved successfully", employees);
};

export const getEmployeeById = async (req, res) => {
  const employee = await employeeService.getEmployeeById(
    req.validated.params.id,
    req.companyId,
  );
  ApiResponse.ok(res, "Employee retrieved successfully", employee);
};

export const getEmployeeByUserId = async (req, res) => {
  const employee = await employeeService.getEmployeeByUserId(
    req.validated.params.userId,
    req.companyId,
  );
  ApiResponse.ok(res, "Employee profile retrieved successfully", employee);
};

export const createEmployee = async (req, res) => {
  const employee = await employeeService.createEmployee(
    req.validated.body,
    req.companyId,
  );
  ApiResponse.created(res, "Employee profile created successfully", employee);
};

export const updateEmployee = async (req, res) => {
  const employee = await employeeService.updateEmployee(
    req.validated.params.id,
    req.validated.body,
    req.companyId,
  );
  ApiResponse.ok(res, "Employee profile updated successfully", employee);
};

export const terminateEmployee = async (req, res) => {
  await employeeService.terminateEmployee(
    req.validated.params.id,
    req.companyId,
  );
  ApiResponse.noContent(res);
};
