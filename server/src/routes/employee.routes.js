import { Router } from "express";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requirePermission from "../middlewares/requirePermission.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createEmployeeSchema,
  employeeIdParamSchema,
  employeesByDepartmentSchema,
  updateEmployeeSchema,
  employeeByUserSchema,
} from "../validators/employee.validator.js";
import {
  getEmployeesByDepartment,
  createEmployee,
  getEmployeeById,
  getEmployeeByUserId,
  terminateEmployee,
  updateEmployee,
} from "../controllers/employee.controller.js";

const router = Router();

router.use(protect);

router.get(
  "/department/:departmentId",
  validate(employeesByDepartmentSchema),
  requirePermission("READ", "EMPLOYEES"),
  asyncHandler(getEmployeesByDepartment),
);

router.get(
  "/user/:userId",
  validate(employeeByUserSchema),
  requirePermission("READ", "EMPLOYEES"),
  asyncHandler(getEmployeeByUserId),
);

router.get(
  "/:id",
  validate(employeeIdParamSchema),
  requirePermission("READ", "EMPLOYEES"),
  asyncHandler(getEmployeeById),
);

router.post(
  "/",
  validate(createEmployeeSchema),
  requirePermission("CREATE", "EMPLOYEES"),
  asyncHandler(createEmployee),
);

router.put(
  "/:id",
  validate(updateEmployeeSchema),
  requirePermission("UPDATE", "EMPLOYEES"),
  asyncHandler(updateEmployee),
);

router.post(
  "/:id/terminate",
  validate(employeeIdParamSchema),
  requirePermission("UPDATE", "EMPLOYEES"),
  asyncHandler(terminateEmployee),
);

export default router;
